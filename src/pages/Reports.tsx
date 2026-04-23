import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from "@/components/ui/chart";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Line, LineChart, Pie, PieChart, Cell, ResponsiveContainer } from "recharts";
import { AlertTriangle, FileText, Radio, Activity } from "lucide-react";
import { toast } from "sonner";

type Incident = { id: string; created_at: string; risk: string; status: string; source: string; incident_type: string };
type Asset = { id: string; created_at: string; asset_type: string; approval_status: string };
type Mention = { id: string; created_at: string; ai_risk: string | null };

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const monthKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
const monthLabel = (key: string) => {
  const [y, m] = key.split("-");
  return `${MONTHS[Number(m) - 1]} ${y.slice(2)}`;
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

export default function Reports() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [mentions, setMentions] = useState<Mention[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [inc, ast, men] = await Promise.all([
        supabase.from("incidents").select("id, created_at, risk, status, source, incident_type").order("created_at", { ascending: false }).limit(1000),
        supabase.from("incident_assets").select("id, created_at, asset_type, approval_status").order("created_at", { ascending: false }).limit(1000),
        supabase.from("social_mentions").select("id, created_at, ai_risk").order("created_at", { ascending: false }).limit(1000),
      ]);
      if (inc.error) toast.error(inc.error.message);
      if (ast.error) toast.error(ast.error.message);
      if (men.error) toast.error(men.error.message);
      setIncidents((inc.data ?? []) as Incident[]);
      setAssets((ast.data ?? []) as Asset[]);
      setMentions((men.data ?? []) as Mention[]);
      setLoading(false);
    })();
  }, []);

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
    return months.map((m) => ({ month: monthLabel(m), ...counts[m] }));
  }, [incidents, months]);

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
    return months.map((m) => ({ month: monthLabel(m), ...counts[m] }));
  }, [assets, months]);

  const mentionsByMonth = useMemo(() => {
    const counts: Record<string, number> = {};
    months.forEach((m) => (counts[m] = 0));
    mentions.forEach((m) => {
      const k = monthKey(new Date(m.created_at));
      if (k in counts) counts[k] += 1;
    });
    return months.map((m) => ({ month: monthLabel(m), mentions: counts[m] }));
  }, [mentions, months]);

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

  const PIE_COLORS = ["hsl(var(--primary))", "hsl(var(--risk-high))", "hsl(var(--risk-medium))", "hsl(var(--risk-low))", "hsl(var(--muted-foreground))", "hsl(var(--accent-foreground))"];

  const incidentChartConfig = {
    critical: { label: "Critical", color: "hsl(var(--risk-critical))" },
    high: { label: "High", color: "hsl(var(--risk-high))" },
    medium: { label: "Medium", color: "hsl(var(--risk-medium))" },
    low: { label: "Low", color: "hsl(var(--risk-low))" },
  };

  const assetChartConfig = {
    approved: { label: "Approved", color: "hsl(var(--risk-low))" },
    pending: { label: "Pending", color: "hsl(var(--risk-medium))" },
    rejected: { label: "Rejected", color: "hsl(var(--risk-critical))" },
  };

  const mentionChartConfig = {
    mentions: { label: "Mentions", color: "hsl(var(--primary))" },
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Reports</h1>
        <p className="text-sm text-muted-foreground mt-1">Trends across incidents, assets and social intelligence (last 6 months)</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total incidents", value: totals.incidents, icon: AlertTriangle, color: "text-risk-high" },
          { label: "Active now", value: totals.activeIncidents, icon: Activity, color: "text-risk-critical" },
          { label: "Assets generated", value: totals.assets, icon: FileText, color: "text-primary" },
          { label: "Social mentions", value: totals.mentions, icon: Radio, color: "text-primary" },
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

      {/* Incidents by month */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Incidents created per month</CardTitle>
          <CardDescription>Stacked by risk level</CardDescription>
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
          <CardTitle className="text-base">Assets generated per month</CardTitle>
          <CardDescription>Stacked by approval status</CardDescription>
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
            <CardTitle className="text-base">Social mentions per month</CardTitle>
            <CardDescription>Volume from continuous monitoring</CardDescription>
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
            <CardTitle className="text-base">Incidents by source</CardTitle>
            <CardDescription>All-time distribution</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={sourceBreakdown} dataKey="value" nameKey="name" innerRadius={45} outerRadius={75} paddingAngle={2}>
                    {sourceBreakdown.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-1 text-xs">
              {sourceBreakdown.map((s, i) => (
                <div key={s.name} className="flex items-center gap-2 text-muted-foreground">
                  <span className="h-2 w-2 rounded-full" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                  <span className="truncate">{s.name.replace(/_/g, " ")}</span>
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
          <CardTitle className="text-base">Top incident types</CardTitle>
          <CardDescription>Distribution by category</CardDescription>
        </CardHeader>
        <CardContent>
          {!typeBreakdown.length ? (
            <p className="text-sm text-muted-foreground">No data yet.</p>
          ) : (
            <div className="space-y-2">
              {typeBreakdown.slice(0, 8).map((t) => {
                const max = typeBreakdown[0].count;
                const pct = (t.count / max) * 100;
                return (
                  <div key={t.type} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="capitalize text-foreground">{t.type}</span>
                      <span className="text-muted-foreground">{t.count}</span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
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
