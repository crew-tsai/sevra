import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { RiskBadge } from "@/components/RiskBadge";
import { CrisisLevelBadge } from "@/components/CrisisLevelBadge";
import { StatusBadge } from "@/components/StatusBadge";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  Activity,
  Shield,
  CheckCircle,
  Radio,
  Hand,
  Clock,
  UserX,
  TrendingUp,
  Flame,
  ArrowRight,
} from "lucide-react";
import { toast } from "sonner";
import { TimeRangeFilter, ALL_TIME, isInRange, type TimeRange } from "@/components/TimeRangeFilter";
import { formatDistanceToNow } from "date-fns";

type Incident = {
  id: string;
  title: string;
  risk: string;
  status: string;
  source: string;
  assignee: string | null;
  airline_name: string | null;
  flight_number: string | null;
  risk_score: number;
  crisis_level: number | null;
  created_at: string;
  updated_at: string;
};

type Mention = {
  id: string;
  content: string;
  channel: string;
  author_handle: string | null;
  author_name: string | null;
  is_influencer: boolean | null;
  is_verified: boolean | null;
  reach: number | null;
  likes: number | null;
  shares: number | null;
  ai_risk: string | null;
  ai_risk_score: number | null;
  incident_id: string | null;
  posted_at: string | null;
  created_at: string;
};

const SOURCE_META: Record<string, { label: string; icon: typeof Radio; className: string }> = {
  social_media: { label: "Social", icon: Radio, className: "border-primary/40 text-primary" },
  manual: { label: "Manual", icon: Hand, className: "border-border text-muted-foreground" },
  internal_ops: { label: "Internal", icon: Hand, className: "border-border text-muted-foreground" },
  news: { label: "News", icon: Hand, className: "border-border text-muted-foreground" },
  customer_complaint: { label: "Complaint", icon: Hand, className: "border-border text-muted-foreground" },
  regulator: { label: "Regulator", icon: Hand, className: "border-border text-muted-foreground" },
};

const RISK_ORDER: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1 };

const formatReach = (n: number) => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
};

export default function Dashboard() {
  const [allIncidents, setAllIncidents] = useState<Incident[]>([]);
  const [allMentions, setAllMentions] = useState<Mention[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<TimeRange>(ALL_TIME);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const [incRes, menRes] = await Promise.all([
        supabase
          .from("incidents")
          .select("id, title, risk, status, source, assignee, airline_name, flight_number, risk_score, crisis_level, created_at, updated_at")
          .order("created_at", { ascending: false })
          .limit(200),
        supabase
          .from("social_mentions")
          .select("id, content, channel, author_handle, author_name, is_influencer, is_verified, reach, likes, shares, ai_risk, ai_risk_score, incident_id, posted_at, created_at")
          .order("created_at", { ascending: false })
          .limit(200),
      ]);
      if (incRes.error) toast.error(incRes.error.message);
      if (menRes.error) toast.error(menRes.error.message);
      setAllIncidents((incRes.data ?? []) as Incident[]);
      setAllMentions((menRes.data ?? []) as Mention[]);
      setLoading(false);
    };
    load();
    const channel = supabase
      .channel("dashboard_realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "incidents" }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "social_mentions" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const incidents = useMemo(
    () => allIncidents.filter((i) => isInRange(i.created_at, timeRange)),
    [allIncidents, timeRange],
  );
  const mentions = useMemo(
    () => allMentions.filter((m) => isInRange(m.posted_at ?? m.created_at, timeRange)),
    [allMentions, timeRange],
  );

  // Critical alerts: active + critical/high risk
  const criticalAlerts = useMemo(
    () =>
      incidents
        .filter((i) => (i.status === "active" || i.status === "monitoring") && (i.risk === "critical" || i.risk === "high"))
        .sort((a, b) => {
          const r = (RISK_ORDER[b.risk] ?? 0) - (RISK_ORDER[a.risk] ?? 0);
          if (r) return r;
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        })
        .slice(0, 5),
    [incidents],
  );

  // Stats
  const openIncidents = incidents.filter((i) => i.status !== "resolved");
  const unassigned = openIncidents.filter((i) => !i.assignee).length;
  const stale = openIncidents.filter(
    (i) => Date.now() - new Date(i.updated_at).getTime() > 4 * 60 * 60 * 1000,
  ).length;

  const stats = [
    { key: "active", label: "Active", value: incidents.filter((i) => i.status === "active").length, icon: AlertTriangle, color: "text-risk-critical", to: "/incidents?status=active" },
    { key: "monitoring", label: "Monitoring", value: incidents.filter((i) => i.status === "monitoring").length, icon: Activity, color: "text-risk-high", to: "/incidents?status=monitoring" },
    { key: "unassigned", label: "Unassigned", value: unassigned, icon: UserX, color: "text-risk-medium", to: "/incidents" },
    { key: "stale", label: "Stale > 4h", value: stale, icon: Clock, color: "text-risk-medium", to: "/incidents" },
  ] as const;

  // Trend last 24h (hourly buckets)
  const trend = useMemo(() => {
    const buckets = Array.from({ length: 24 }, (_, i) => ({ h: 23 - i, count: 0 }));
    const now = Date.now();
    for (const i of allIncidents) {
      const diffH = Math.floor((now - new Date(i.created_at).getTime()) / (60 * 60 * 1000));
      if (diffH >= 0 && diffH < 24) buckets[diffH].count += 1;
    }
    return buckets.reverse();
  }, [allIncidents]);
  const trendMax = Math.max(1, ...trend.map((b) => b.count));
  const trendTotal = trend.reduce((s, b) => s + b.count, 0);

  // Top viral mentions (high reach + risk)
  const viralMentions = useMemo(
    () =>
      [...mentions]
        .sort((a, b) => {
          const ra = (a.reach ?? 0) + (a.likes ?? 0) * 2 + (a.shares ?? 0) * 5;
          const rb = (b.reach ?? 0) + (b.likes ?? 0) * 2 + (b.shares ?? 0) * 5;
          return rb - ra;
        })
        .slice(0, 5),
    [mentions],
  );

  // Priority queue: open incidents sorted by risk score then recency
  const priorityQueue = useMemo(
    () =>
      openIncidents
        .slice()
        .sort((a, b) => {
          const r = (RISK_ORDER[b.risk] ?? 0) - (RISK_ORDER[a.risk] ?? 0);
          if (r) return r;
          if (b.risk_score !== a.risk_score) return b.risk_score - a.risk_score;
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        })
        .slice(0, 8),
    [openIncidents],
  );

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Crisis Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Detect, prioritize, and respond. Real-time view of risk posture.
          </p>
        </div>
        <TimeRangeFilter value={timeRange} onChange={setTimeRange} />
      </div>

      {/* Critical alert banner */}
      {!loading && criticalAlerts.length > 0 && (
        <div className="rounded-lg border border-risk-critical/40 bg-risk-critical-bg/40 p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="h-4 w-4 text-risk-critical" />
            <h2 className="text-sm font-semibold text-foreground">
              {criticalAlerts.length} critical {criticalAlerts.length === 1 ? "incident needs" : "incidents need"} attention
            </h2>
          </div>
          <div className="space-y-2">
            {criticalAlerts.map((inc) => (
              <Link
                key={inc.id}
                to={`/incidents/${inc.id}`}
                className="flex items-center gap-3 rounded-md bg-card/60 hover:bg-card px-3 py-2 transition-colors group"
              >
                <RiskBadge level={inc.risk as any} />
                <CrisisLevelBadge level={inc.crisis_level} compact />
                <span className="text-sm text-foreground flex-1 min-w-0 truncate">{inc.title}</span>
                <span className="text-xs text-muted-foreground hidden sm:inline">
                  {formatDistanceToNow(new Date(inc.created_at), { addSuffix: true })}
                </span>
                <span className="text-xs text-muted-foreground w-20 text-right truncate hidden md:inline">
                  {inc.assignee ?? "Unassigned"}
                </span>
                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground transition-colors" />
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Link
            key={stat.key}
            to={stat.to}
            className="rounded-lg border border-border bg-card p-4 transition-colors hover:bg-accent/50"
          >
            <div className="flex items-center gap-2 mb-2">
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
              <span className="text-xs font-medium text-muted-foreground">{stat.label}</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{stat.value}</p>
          </Link>
        ))}
      </div>

      {/* Two-column main */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Priority queue */}
        <div className="lg:col-span-2 rounded-lg border border-border bg-card">
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-foreground">Priority queue</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Open incidents ranked by risk</p>
            </div>
            <Link to="/incidents" className="text-xs text-primary hover:underline">View all</Link>
          </div>
          {loading ? (
            <div className="p-8 text-center text-sm text-muted-foreground">Loading…</div>
          ) : !priorityQueue.length ? (
            <div className="p-8 text-center text-sm text-muted-foreground">No open incidents. All clear.</div>
          ) : (
            <div className="divide-y divide-border">
              {priorityQueue.map((incident) => {
                const meta = SOURCE_META[incident.source] ?? SOURCE_META.manual;
                const SourceIcon = meta.icon;
                const ageH = (Date.now() - new Date(incident.updated_at).getTime()) / (60 * 60 * 1000);
                const isStale = ageH > 4 && incident.status !== "resolved";
                return (
                  <Link
                    key={incident.id}
                    to={`/incidents/${incident.id}`}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-accent/50 transition-colors"
                  >
                    <RiskBadge level={incident.risk as any} />
                    <CrisisLevelBadge level={incident.crisis_level} compact />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground truncate">{incident.title}</p>
                      <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                        <Badge variant="outline" className={`gap-1 text-[10px] py-0 ${meta.className}`}>
                          <SourceIcon className="h-2.5 w-2.5" />
                          {meta.label}
                        </Badge>
                        <span>·</span>
                        <span className="truncate">{incident.assignee ?? "Unassigned"}</span>
                        {isStale && (
                          <>
                            <span>·</span>
                            <span className="inline-flex items-center gap-1 text-risk-medium">
                              <Clock className="h-2.5 w-2.5" />
                              stale
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    <StatusBadge status={incident.status as any} />
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Right column: trend + viral */}
        <div className="space-y-6">
          {/* Trend */}
          <div className="rounded-lg border border-border bg-card p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                  <TrendingUp className="h-3.5 w-3.5 text-primary" />
                  24h trend
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">{trendTotal} new incidents</p>
              </div>
            </div>
            <div className="flex items-end gap-0.5 h-16">
              {trend.map((b, idx) => (
                <div
                  key={idx}
                  className="flex-1 bg-primary/70 hover:bg-primary rounded-sm transition-colors min-h-[2px]"
                  style={{ height: `${(b.count / trendMax) * 100}%` }}
                  title={`${b.count} incidents ${b.h}h ago`}
                />
              ))}
            </div>
            <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
              <span>24h ago</span>
              <span>now</span>
            </div>
          </div>

          {/* Viral mentions */}
          <div className="rounded-lg border border-border bg-card">
            <div className="px-4 py-3 border-b border-border flex items-center justify-between">
              <h2 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                <Flame className="h-3.5 w-3.5 text-risk-high" />
                Top signals
              </h2>
              <Link to="/sevra" className="text-xs text-primary hover:underline">Social Intel</Link>
            </div>
            {loading ? (
              <div className="p-6 text-center text-sm text-muted-foreground">Loading…</div>
            ) : !viralMentions.length ? (
              <div className="p-6 text-center text-sm text-muted-foreground">No mentions yet.</div>
            ) : (
              <div className="divide-y divide-border">
                {viralMentions.map((m) => (
                  <Link
                    key={m.id}
                    to={m.incident_id ? `/incidents/${m.incident_id}` : "/sevra"}
                    className="block px-4 py-3 hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className="text-[10px] py-0 capitalize">
                        {m.channel}
                      </Badge>
                      {m.is_influencer && (
                        <Badge variant="outline" className="text-[10px] py-0 border-risk-high/40 text-risk-high">
                          Influencer
                        </Badge>
                      )}
                      {m.ai_risk && <RiskBadge level={m.ai_risk as any} className="text-[10px] py-0" />}
                    </div>
                    <p className="text-xs text-foreground line-clamp-2">{m.content}</p>
                    <div className="flex items-center gap-3 mt-1.5 text-[10px] text-muted-foreground">
                      <span>{m.author_handle ?? m.author_name ?? "anon"}</span>
                      <span>· reach {formatReach(m.reach ?? 0)}</span>
                      {(m.shares ?? 0) > 0 && <span>· {formatReach(m.shares ?? 0)} shares</span>}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Resolution summary */}
      {!loading && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Contained", value: incidents.filter((i) => i.status === "contained").length, icon: Shield, color: "text-risk-medium" },
            { label: "Resolved", value: incidents.filter((i) => i.status === "resolved").length, icon: CheckCircle, color: "text-risk-low" },
            { label: "Total in range", value: incidents.length, icon: Activity, color: "text-muted-foreground" },
            { label: "Social mentions", value: mentions.length, icon: Radio, color: "text-primary" },
          ].map((s) => (
            <div key={s.label} className="rounded-lg border border-border bg-card/50 p-3">
              <div className="flex items-center gap-2 mb-1">
                <s.icon className={`h-3.5 w-3.5 ${s.color}`} />
                <span className="text-xs text-muted-foreground">{s.label}</span>
              </div>
              <p className="text-lg font-semibold text-foreground">{s.value}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
