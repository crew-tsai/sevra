import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from "@/components/ui/chart";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Line, LineChart, Pie, PieChart, Cell, ResponsiveContainer } from "recharts";
import { AlertTriangle, FileText, Radio, Activity } from "lucide-react";
import { toast } from "sonner";
import { TimeRangeFilter, DEFAULT_TIME_RANGE, isInRange, type TimeRange } from "@/components/TimeRangeFilter";
import { useIntlLocale, useLang, useMessages } from "@/i18n";
import { commonMessages } from "@/i18n/messages/common";
import { reportsMessages } from "@/i18n/messages/reports";
import { INCIDENT_TYPES, typeLabel, type IncidentType } from "@/lib/industries";

type Incident = { id: string; created_at: string; risk: string; status: string; source: string; incident_type: string };
type Asset = { id: string; created_at: string; asset_type: string; approval_status: string };
type Mention = { id: string; created_at: string; ai_risk: string | null };

const monthKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
const monthLabel = (key: string, locale: string) => {
  const [y, m] = key.split("-");
  const name = new Date(Number(y), Number(m) - 1, 1).toLocaleString(locale, { month: "short" }).replace(".", "");
  return `${name.charAt(0).toUpperCase()}${name.slice(1)} ${y.slice(2)}`;
};

const lastNMonths = (n: number) => {
  const out: string[] = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    out.push(monthKey(d));
  }
  return out;
};

const RISK_COLORS: Record<string, string> = {
  critical: "hsl(var(--risk-critical))",
  high: "hsl(var(--risk-high))",
  medium: "hsl(var(--risk-medium))",
  low: "hsl(var(--risk-low))",
};

/** Minutes as a crisis team says them out loud. */
function humanMinutes(minutes: number, t: { minutesShort: (n: number) => string; hoursShort: (n: number) => string }) {
  if (minutes < 90) return t.minutesShort(Math.round(minutes));
  return t.hoursShort(Math.round((minutes / 60) * 10) / 10);
}

export default function Reports() {
  const [allIncidents, setAllIncidents] = useState<Incident[]>([]);
  const [allAssets, setAllAssets] = useState<Asset[]>([]);
  const [allMentions, setAllMentions] = useState<Mention[]>([]);
  const [firstSend, setFirstSend] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<TimeRange>(DEFAULT_TIME_RANGE);
  const t = useMessages(reportsMessages);
  const common = useMessages(commonMessages);
  const { lang } = useLang();
  const intl = useIntlLocale();
  const [industry, setIndustry] = useState<string | null>(null);
  useEffect(() => {
    supabase.from("company_settings").select("industry").maybeSingle().then(({ data }) => setIndustry(data?.industry ?? null));
  }, []);
  const typeName = (v: string) =>
    (INCIDENT_TYPES as readonly string[]).includes(v) ? typeLabel(industry, v as IncidentType, lang) : v.replace(/_/g, " ");

  const incidents = useMemo(() => allIncidents.filter((i) => isInRange(i.created_at, timeRange)), [allIncidents, timeRange]);
  const assets = useMemo(() => allAssets.filter((a) => isInRange(a.created_at, timeRange)), [allAssets, timeRange]);
  const mentions = useMemo(() => allMentions.filter((m) => isInRange(m.created_at, timeRange)), [allMentions, timeRange]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [inc, ast, men, snd] = await Promise.all([
        supabase.from("incidents").select("id, created_at, risk, status, source, incident_type").order("created_at", { ascending: false }).limit(1000),
        supabase.from("incident_assets").select("id, created_at, asset_type, approval_status").order("created_at", { ascending: false }).limit(1000),
        supabase.from("social_mentions").select("id, created_at, ai_risk").order("created_at", { ascending: false }).limit(1000),
        supabase
          .from("communication_sends")
          .select("incident_id, sent_at")
          .eq("status", "sent")
          .order("sent_at", { ascending: true })
          .limit(1000),
      ]);
      if (inc.error) toast.error(inc.error.message);
      if (ast.error) toast.error(ast.error.message);
      if (men.error) toast.error(men.error.message);
      setAllIncidents((inc.data ?? []) as Incident[]);
      setAllAssets((ast.data ?? []) as Asset[]);
      setAllMentions((men.data ?? []) as Mention[]);
      // First successful send per incident. Ascending order above means the
      // first row seen for an incident is the earliest one.
      const first: Record<string, string> = {};
      for (const row of (snd.data ?? []) as Array<{ incident_id: string; sent_at: string }>) {
        if (!first[row.incident_id]) first[row.incident_id] = row.sent_at;
      }
      setFirstSend(first);
      setLoading(false);
    })();
  }, []);

  /**
   * How long from opening an incident to saying something in public.
   *
   * The number crisis communications is actually judged on, and until there
   * was a record of sends it could not be computed at all. Incidents that have
   * published nothing are excluded rather than counted as slow: "we have not
   * spoken yet" is a different fact from "we were slow", and averaging the two
   * together would flatter a workspace that has never published anything.
   */
  const speed = useMemo(() => {
    const durations = incidents
      .map((i) => {
        const sent = firstSend[i.id];
        if (!sent) return null;
        return (new Date(sent).getTime() - new Date(i.created_at).getTime()) / 60_000;
      })
      .filter((v): v is number => v !== null && v >= 0)
      .sort((a, b) => a - b);

    if (!durations.length) return { median: null, fastest: null, spoken: 0, silent: incidents.length };
    const median = durations[Math.floor(durations.length / 2)];
    return {
      median,
      fastest: durations[0],
      spoken: durations.length,
      silent: incidents.length - durations.length,
    };
  }, [incidents, firstSend]);

  const months = useMemo(() => lastNMonths(6), []);

  const incidentsByMonth = useMemo(() => {
    const counts: Record<string, { critical: number; high: number; medium: number; low: number; total: number }> = {};
    months.forEach((m) => (counts[m] = { critical: 0, high: 0, medium: 0, low: 0, total: 0 }));
    incidents.forEach((i) => {
      const k = monthKey(new Date(i.created_at));
      if (counts[k]) {
        counts[k][(i.risk as keyof typeof counts[string]) ?? "medium"] = (counts[k][i.risk as "critical"] ?? 0) + 1;
        counts[k].total += 1;
      }
    });
    return months.map((m) => ({ month: monthLabel(m, intl), ...counts[m] }));
  }, [incidents, months, intl]);

  const assetsByMonth = useMemo(() => {
    const counts: Record<string, { approved: number; pending: number; rejected: number; total: number }> = {};
    months.forEach((m) => (counts[m] = { approved: 0, pending: 0, rejected: 0, total: 0 }));
    assets.forEach((a) => {
      const k = monthKey(new Date(a.created_at));
      if (counts[k]) {
        const status = a.approval_status === "approved" ? "approved" : a.approval_status === "rejected" ? "rejected" : "pending";
        counts[k][status] += 1;
        counts[k].total += 1;
      }
    });
    return months.map((m) => ({ month: monthLabel(m, intl), ...counts[m] }));
  }, [assets, months, intl]);

  const mentionsByMonth = useMemo(() => {
    const counts: Record<string, number> = {};
    months.forEach((m) => (counts[m] = 0));
    mentions.forEach((m) => {
      const k = monthKey(new Date(m.created_at));
      if (k in counts) counts[k] += 1;
    });
    return months.map((m) => ({ month: monthLabel(m, intl), mentions: counts[m] }));
  }, [mentions, months, intl]);

  const sourceBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    incidents.forEach((i) => { map[i.source] = (map[i.source] ?? 0) + 1; });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [incidents]);

  const typeBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    incidents.forEach((i) => { map[i.incident_type] = (map[i.incident_type] ?? 0) + 1; });
    return Object.entries(map).map(([type, count]) => ({ type, count })).sort((a, b) => b.count - a.count);
  }, [incidents]);

  const totals = {
    incidents: incidents.length,
    assets: assets.length,
    mentions: mentions.length,
    activeIncidents: incidents.filter((i) => i.status === "active").length,
  };

  const CATEGORY_COLORS = [
    "hsl(217 91% 60%)",   // blue
    "hsl(160 84% 39%)",   // emerald
    "hsl(38 92% 50%)",    // amber
    "hsl(280 87% 65%)",   // purple
    "hsl(346 87% 60%)",   // rose
    "hsl(190 90% 45%)",   // cyan
    "hsl(25 95% 53%)",    // orange
    "hsl(142 71% 45%)",   // green
    "hsl(258 90% 66%)",   // violet
    "hsl(15 80% 55%)",    // red-orange
  ];

  const incidentChartConfig = {
    critical: { label: common.risk.critical, color: "hsl(var(--risk-critical))" },
    high: { label: common.risk.high, color: "hsl(var(--risk-high))" },
    medium: { label: common.risk.medium, color: "hsl(var(--risk-medium))" },
    low: { label: common.risk.low, color: "hsl(var(--risk-low))" },
  };

  const assetChartConfig = {
    approved: { label: t.approved, color: "hsl(var(--risk-low))" },
    pending: { label: t.pending, color: "hsl(var(--risk-medium))" },
    rejected: { label: t.rejected, color: "hsl(var(--risk-critical))" },
  };

  const mentionChartConfig = {
    mentions: { label: t.mentions, color: "hsl(var(--primary))" },
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold text-foreground">{t.title}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t.intro}</p>
        </div>
        <TimeRangeFilter value={timeRange} onChange={setTimeRange} />
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: t.totalIncidents, value: totals.incidents, icon: AlertTriangle, color: "text-risk-high" },
          { label: t.activeNow, value: totals.activeIncidents, icon: Activity, color: "text-risk-critical" },
          { label: t.assetsGenerated, value: totals.assets, icon: FileText, color: "text-primary" },
          { label: t.socialMentions, value: totals.mentions, icon: Radio, color: "text-primary" },
        ].map((s) => (
          <div key={s.label} className="rounded-lg border border-border bg-card p-4">
            <div className="flex items-center gap-2 mb-2">
              <s.icon className={`h-4 w-4 ${s.color}`} />
              <span className="text-xs font-medium text-muted-foreground">{s.label}</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{loading ? "—" : s.value}</p>
          </div>
        ))}
      </div>

      {/* How fast this workspace actually speaks. Placed above the counts of
          things, because it is the only number here a crisis lead is judged
          on. */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t.speedTitle}</CardTitle>
          <CardDescription>{t.speedIntro}</CardDescription>
        </CardHeader>
        <CardContent>
          {speed.median === null ? (
            <p className="text-sm text-muted-foreground">{t.speedNothing}</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <p className="text-2xl font-bold text-foreground">{humanMinutes(speed.median, t)}</p>
                <p className="text-xs text-muted-foreground mt-1">{t.speedMedian}</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{humanMinutes(speed.fastest ?? 0, t)}</p>
                <p className="text-xs text-muted-foreground mt-1">{t.speedFastest}</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{speed.spoken}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {t.speedSpoken(speed.spoken + speed.silent)}
                  {speed.silent > 0 && <span className="block">{t.speedSilent(speed.silent)}</span>}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Incidents by month */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t.incidentsPerMonth}</CardTitle>
          <CardDescription>{t.byRisk}</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={incidentChartConfig} className="h-64 w-full">
            <BarChart data={incidentsByMonth}>
              <CartesianGrid vertical={false} stroke="hsl(var(--border))" />
              <XAxis dataKey="month" tickLine={false} axisLine={false} className="text-xs" />
              <YAxis tickLine={false} axisLine={false} className="text-xs" allowDecimals={false} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <ChartLegend content={<ChartLegendContent />} />
              <Bar dataKey="critical" stackId="r" fill="var(--color-critical)" radius={[0, 0, 0, 0]} />
              <Bar dataKey="high" stackId="r" fill="var(--color-high)" />
              <Bar dataKey="medium" stackId="r" fill="var(--color-medium)" />
              <Bar dataKey="low" stackId="r" fill="var(--color-low)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Assets by month */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t.assetsPerMonth}</CardTitle>
          <CardDescription>{t.byApproval}</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={assetChartConfig} className="h-64 w-full">
            <BarChart data={assetsByMonth}>
              <CartesianGrid vertical={false} stroke="hsl(var(--border))" />
              <XAxis dataKey="month" tickLine={false} axisLine={false} className="text-xs" />
              <YAxis tickLine={false} axisLine={false} className="text-xs" allowDecimals={false} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <ChartLegend content={<ChartLegendContent />} />
              <Bar dataKey="approved" stackId="a" fill="var(--color-approved)" />
              <Bar dataKey="pending" stackId="a" fill="var(--color-pending)" />
              <Bar dataKey="rejected" stackId="a" fill="var(--color-rejected)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Mentions trend + Source pie */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t.mentionsPerMonth}</CardTitle>
            <CardDescription>{t.monitoringVolume}</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={mentionChartConfig} className="h-56 w-full">
              <LineChart data={mentionsByMonth}>
                <CartesianGrid vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="month" tickLine={false} axisLine={false} className="text-xs" />
                <YAxis tickLine={false} axisLine={false} className="text-xs" allowDecimals={false} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line type="monotone" dataKey="mentions" stroke="var(--color-mentions)" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t.bySource}</CardTitle>
            <CardDescription>{t.allTime}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={sourceBreakdown} dataKey="value" nameKey="name" innerRadius={45} outerRadius={75} paddingAngle={2}>
                    {sourceBreakdown.map((_, i) => (
                      <Cell key={i} fill={CATEGORY_COLORS[i % CATEGORY_COLORS.length]} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-1 text-xs">
              {sourceBreakdown.map((s, i) => (
                <div key={s.name} className="flex items-center gap-2 text-muted-foreground">
                  <span className="h-2 w-2 rounded-full" style={{ background: CATEGORY_COLORS[i % CATEGORY_COLORS.length] }} />
                  <span className="truncate">{common.source[s.name] ?? s.name.replace(/_/g, " ")}</span>
                  <span className="ml-auto text-foreground font-medium">{s.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top incident types */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t.topTypes}</CardTitle>
          <CardDescription>{t.byCategory}</CardDescription>
        </CardHeader>
        <CardContent>
          {!typeBreakdown.length ? (
            <p className="text-sm text-muted-foreground">{t.noData}</p>
          ) : (
            <div className="space-y-2">
              {typeBreakdown.slice(0, 8).map((row, i) => {
                const max = typeBreakdown[0].count;
                const pct = (row.count / max) * 100;
                const color = CATEGORY_COLORS[i % CATEGORY_COLORS.length];
                return (
                  <div key={row.type} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full" style={{ background: color }} />
                        <span className="text-foreground">{typeName(row.type)}</span>
                      </div>
                      <span className="text-muted-foreground">{row.count}</span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
