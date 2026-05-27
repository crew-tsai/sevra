import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RiskBadge } from "@/components/RiskBadge";
import { CrisisLevelBadge } from "@/components/CrisisLevelBadge";
import { StatusBadge } from "@/components/StatusBadge";
import { TimeRangeFilter, ALL_TIME, isInRange, type TimeRange } from "@/components/TimeRangeFilter";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import {
  AlertTriangle,
  Activity,
  Shield,
  CheckCircle,
  Radio,
  ArrowRight,
  Smile,
  Meh,
  Frown,
  Twitter,
  Instagram,
  Facebook,
  MessageCircle,
  Newspaper,
  Globe,
  TrendingUp,
  TrendingDown,
  Minus,
  Eye,
  Heart,
  Share2,
  BadgeCheck,
  Flame,
  Users,
  ExternalLink,
  Zap,
} from "lucide-react";
import type { RiskLevel } from "@/lib/mock-data";

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
  reach: number | null;
  likes: number | null;
  shares: number | null;
  ai_risk: string | null;
  incident_id: string | null;
  posted_at: string | null;
  created_at: string;
};

const RISK_RANK: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1 };

const CHANNEL_META: Record<string, { icon: typeof Radio; color: string }> = {
  twitter: { icon: Twitter, color: "text-sky-500" },
  x: { icon: Twitter, color: "text-foreground" },
  instagram: { icon: Instagram, color: "text-pink-500" },
  facebook: { icon: Facebook, color: "text-blue-600" },
  tiktok: { icon: MessageCircle, color: "text-rose-500" },
  reddit: { icon: MessageCircle, color: "text-orange-500" },
  news: { icon: Newspaper, color: "text-amber-500" },
  web: { icon: Globe, color: "text-muted-foreground" },
};

const formatNum = (n: number) => {
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
          .limit(300),
        supabase
          .from("social_mentions")
          .select("id, content, channel, author_handle, author_name, is_influencer, reach, likes, shares, ai_risk, incident_id, posted_at, created_at")
          .order("created_at", { ascending: false })
          .limit(300),
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

  // 1. Top 3 critical (Hub-style)
  const topCritical = useMemo(
    () =>
      incidents
        .filter((i) => i.status === "active" || i.status === "monitoring")
        .sort((a, b) => {
          const c = (b.crisis_level ?? 0) - (a.crisis_level ?? 0);
          if (c) return c;
          const r = (RISK_RANK[b.risk] ?? 0) - (RISK_RANK[a.risk] ?? 0);
          if (r) return r;
          return (b.risk_score ?? 0) - (a.risk_score ?? 0);
        })
        .slice(0, 3),
    [incidents],
  );

  // 2. Issues status bar
  const statusCounts = useMemo(() => {
    const c = { active: 0, monitoring: 0, contained: 0, resolved: 0 };
    for (const i of incidents) {
      if (i.status in c) (c as any)[i.status] += 1;
    }
    return c;
  }, [incidents]);
  const statusTotal = Math.max(1, incidents.length);

  const statusBar = [
    { key: "active", label: "Active", count: statusCounts.active, icon: AlertTriangle, color: "bg-risk-critical", textColor: "text-risk-critical", bg: "bg-risk-critical-bg" },
    { key: "monitoring", label: "Monitoring", count: statusCounts.monitoring, icon: Activity, color: "bg-risk-high", textColor: "text-risk-high", bg: "bg-risk-high-bg" },
    { key: "contained", label: "Contained", count: statusCounts.contained, icon: Shield, color: "bg-risk-medium", textColor: "text-risk-medium", bg: "bg-risk-medium-bg" },
    { key: "resolved", label: "Resolved", count: statusCounts.resolved, icon: CheckCircle, color: "bg-risk-low", textColor: "text-risk-low", bg: "bg-risk-low-bg" },
  ];

  // 3. Social mentions status — by channel
  const channelStats = useMemo(() => {
    const map = new Map<string, { count: number; reach: number }>();
    for (const m of mentions) {
      const k = (m.channel ?? "web").toLowerCase();
      const cur = map.get(k) ?? { count: 0, reach: 0 };
      cur.count += 1;
      cur.reach += m.reach ?? 0;
      map.set(k, cur);
    }
    return Array.from(map.entries())
      .map(([channel, v]) => ({ channel, ...v }))
      .sort((a, b) => b.count - a.count);
  }, [mentions]);
  const mentionsTotal = mentions.length;
  const influencerCount = mentions.filter((m) => m.is_influencer).length;
  const totalReach = mentions.reduce((s, m) => s + (m.reach ?? 0), 0);

  // 4. All issues (sorted, filtered, paginated)
  const [riskFilter, setRiskFilter] = useState<"all" | RiskLevel>("all");
  const sortedIssues = useMemo(
    () =>
      incidents
        .slice()
        .sort((a, b) => {
          const r = (RISK_RANK[b.risk] ?? 0) - (RISK_RANK[a.risk] ?? 0);
          if (r) return r;
          return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
        }),
    [incidents],
  );
  const riskCounts = useMemo(() => {
    const c = { critical: 0, high: 0, medium: 0, low: 0 };
    for (const i of sortedIssues) if (i.risk in c) (c as any)[i.risk] += 1;
    return c;
  }, [sortedIssues]);
  const allIssues = useMemo(
    () => riskFilter === "all" ? sortedIssues : sortedIssues.filter((i) => i.risk === riskFilter),
    [sortedIssues, riskFilter],
  );
  const PAGE_SIZE = 10;
  const [issuesPage, setIssuesPage] = useState(0);
  useEffect(() => { setIssuesPage(0); }, [riskFilter]);
  const issuesPageCount = Math.max(1, Math.ceil(allIssues.length / PAGE_SIZE));
  useEffect(() => { setIssuesPage(0); }, [timeRange]);
  useEffect(() => {
    if (issuesPage >= issuesPageCount) setIssuesPage(0);
  }, [issuesPage, issuesPageCount]);
  const pagedIssues = allIssues.slice(issuesPage * PAGE_SIZE, issuesPage * PAGE_SIZE + PAGE_SIZE);

  // 5. Sentiment analysis (derived from ai_risk of mentions)
  const sentiment = useMemo(() => {
    let negative = 0, neutral = 0, positive = 0;
    for (const m of mentions) {
      const r = m.ai_risk;
      if (r === "critical" || r === "high") negative += 1;
      else if (r === "medium") neutral += 1;
      else if (r === "low") positive += 1;
      else neutral += 1;
    }
    const total = Math.max(1, negative + neutral + positive);
    return {
      negative,
      neutral,
      positive,
      total,
      negPct: Math.round((negative / total) * 100),
      neuPct: Math.round((neutral / total) * 100),
      posPct: Math.round((positive / total) * 100),
    };
  }, [mentions]);

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-6 space-y-6">
      {/* Header */}
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">Crisis dashboard</p>
          <h1 className="text-2xl font-semibold tracking-tight">Real-time risk posture</h1>
        </div>
        <TimeRangeFilter value={timeRange} onChange={setTimeRange} />
      </header>

      {/* 1. Top 3 critical */}
      <section className="space-y-2">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-3.5 w-3.5 text-risk-high" />
          <h2 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Critical · top 3
          </h2>
        </div>
        {loading ? (
          <Card className="p-3 text-xs text-muted-foreground">Loading…</Card>
        ) : topCritical.length === 0 ? (
          <Card className="p-3 text-xs text-muted-foreground">Nothing critical right now. You're all clear.</Card>
        ) : (
          <div className="grid gap-2">
            {topCritical.map((i) => (
              <Link key={i.id} to={`/incidents/${i.id}`} className="group">
                <Card className="px-3 py-2.5 flex items-center gap-3 hover:bg-accent/40 transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 min-w-0 flex-wrap">
                      <CrisisLevelBadge level={i.crisis_level} compact />
                      <RiskBadge level={(i.risk as RiskLevel) ?? "medium"} />
                      <Badge variant="outline" className="text-[10px] capitalize">
                        {i.status}
                      </Badge>
                      <p className="text-sm font-medium truncate">{i.title}</p>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Updated {formatDistanceToNow(new Date(i.updated_at), { addSuffix: true })}
                      {i.assignee ? ` · ${i.assignee}` : " · Unassigned"}
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors shrink-0" />
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* 2. Issues status bar */}
      <section className="space-y-2">
        <h2 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Issues status
        </h2>
        <Card className="p-4 space-y-3">
          {/* segmented bar */}
          <div className="flex h-2 w-full overflow-hidden rounded-full bg-muted">
            {statusBar.map((s) =>
              s.count > 0 ? (
                <div
                  key={s.key}
                  className={s.color}
                  style={{ width: `${(s.count / statusTotal) * 100}%` }}
                  title={`${s.label}: ${s.count}`}
                />
              ) : null,
            )}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {statusBar.map((s) => (
              <Link
                key={s.key}
                to={`/incidents?status=${s.key}`}
                className={`rounded-md ${s.bg} px-3 py-2 hover:opacity-90 transition-opacity`}
              >
                <div className="flex items-center gap-1.5">
                  <s.icon className={`h-3.5 w-3.5 ${s.textColor}`} />
                  <span className={`text-[11px] font-medium ${s.textColor}`}>{s.label}</span>
                </div>
                <p className={`text-xl font-semibold ${s.textColor} mt-0.5`}>{s.count}</p>
              </Link>
            ))}
          </div>
        </Card>
      </section>

      {/* 3 & 5 side by side */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* 3. Social mentions status */}
        <section className="space-y-2">
          <h2 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Social mentions
          </h2>
          <Card className="p-4 space-y-3">
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-md bg-primary/10 px-3 py-2">
                <p className="text-[10px] uppercase tracking-wider text-primary">Total</p>
                <p className="text-xl font-semibold text-primary">{mentionsTotal}</p>
              </div>
              <div className="rounded-md bg-risk-high-bg px-3 py-2">
                <p className="text-[10px] uppercase tracking-wider text-risk-high">Influencers</p>
                <p className="text-xl font-semibold text-risk-high">{influencerCount}</p>
              </div>
              <div className="rounded-md bg-muted px-3 py-2">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Reach</p>
                <p className="text-xl font-semibold text-foreground">{formatNum(totalReach)}</p>
              </div>
            </div>
            <div className="space-y-1.5">
              <p className="text-[11px] text-muted-foreground">By channel</p>
              {channelStats.length === 0 ? (
                <p className="text-xs text-muted-foreground">No mentions in range.</p>
              ) : (
                channelStats.map((c) => {
                  const meta = CHANNEL_META[c.channel] ?? { icon: Globe, color: "text-muted-foreground" };
                  const Icon = meta.icon;
                  const pct = (c.count / Math.max(1, mentionsTotal)) * 100;
                  return (
                    <div key={c.channel} className="flex items-center gap-2">
                      <Icon className={`h-3.5 w-3.5 ${meta.color}`} />
                      <span className="text-xs capitalize w-20 shrink-0">{c.channel}</span>
                      <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                        <div className={`h-full ${meta.color.replace("text-", "bg-")}`} style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-xs text-muted-foreground w-10 text-right">{c.count}</span>
                    </div>
                  );
                })
              )}
            </div>
            <Link to="/sevra" className="text-xs text-primary hover:underline inline-flex items-center gap-1">
              Open Social Intel <ArrowRight className="h-3 w-3" />
            </Link>
          </Card>
        </section>

        {/* 5. Sentiment analysis */}
        <section className="space-y-2">
          <h2 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Sentiment analysis
          </h2>
          <Card className="p-4 space-y-3">
            <div className="flex h-2 w-full overflow-hidden rounded-full bg-muted">
              <div className="bg-risk-critical" style={{ width: `${sentiment.negPct}%` }} title={`Negative ${sentiment.negPct}%`} />
              <div className="bg-risk-medium" style={{ width: `${sentiment.neuPct}%` }} title={`Neutral ${sentiment.neuPct}%`} />
              <div className="bg-risk-low" style={{ width: `${sentiment.posPct}%` }} title={`Positive ${sentiment.posPct}%`} />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-md bg-risk-critical-bg px-3 py-2">
                <div className="flex items-center gap-1.5">
                  <Frown className="h-3.5 w-3.5 text-risk-critical" />
                  <span className="text-[11px] font-medium text-risk-critical">Negative</span>
                </div>
                <p className="text-xl font-semibold text-risk-critical mt-0.5">{sentiment.negPct}%</p>
                <p className="text-[10px] text-muted-foreground">{sentiment.negative} mentions</p>
              </div>
              <div className="rounded-md bg-risk-medium-bg px-3 py-2">
                <div className="flex items-center gap-1.5">
                  <Meh className="h-3.5 w-3.5 text-risk-medium" />
                  <span className="text-[11px] font-medium text-risk-medium">Neutral</span>
                </div>
                <p className="text-xl font-semibold text-risk-medium mt-0.5">{sentiment.neuPct}%</p>
                <p className="text-[10px] text-muted-foreground">{sentiment.neutral} mentions</p>
              </div>
              <div className="rounded-md bg-risk-low-bg px-3 py-2">
                <div className="flex items-center gap-1.5">
                  <Smile className="h-3.5 w-3.5 text-risk-low" />
                  <span className="text-[11px] font-medium text-risk-low">Positive</span>
                </div>
                <p className="text-xl font-semibold text-risk-low mt-0.5">{sentiment.posPct}%</p>
                <p className="text-[10px] text-muted-foreground">{sentiment.positive} mentions</p>
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground">
              Derived from AI risk scoring across {sentiment.total} mentions in range.
            </p>
          </Card>
        </section>
      </div>

      {/* 4. All issues */}
      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            All issues {!loading && allIssues.length > 0 && (
              <span className="ml-1 text-muted-foreground/70 normal-case tracking-normal">({allIssues.length})</span>
            )}
          </h2>
          <Link to="/incidents" className="text-xs text-primary hover:underline inline-flex items-center gap-1">
            Open full list <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        <div className="flex items-center gap-1 flex-wrap">
          {([
            { key: "all", label: "All", count: sortedIssues.length, active: "bg-foreground text-background", idle: "bg-muted text-muted-foreground hover:bg-accent" },
            { key: "critical", label: "Critical", count: riskCounts.critical, active: "bg-risk-critical text-white", idle: "bg-risk-critical-bg text-risk-critical hover:opacity-80" },
            { key: "high", label: "High", count: riskCounts.high, active: "bg-risk-high text-white", idle: "bg-risk-high-bg text-risk-high hover:opacity-80" },
            { key: "medium", label: "Medium", count: riskCounts.medium, active: "bg-risk-medium text-white", idle: "bg-risk-medium-bg text-risk-medium hover:opacity-80" },
            { key: "low", label: "Low", count: riskCounts.low, active: "bg-risk-low text-white", idle: "bg-risk-low-bg text-risk-low hover:opacity-80" },
          ] as const).map((t) => {
            const isActive = riskFilter === t.key;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => setRiskFilter(t.key as any)}
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors ${isActive ? t.active : t.idle}`}
              >
                {t.label}
                <span className={`rounded-full px-1.5 text-[10px] ${isActive ? "bg-background/20" : "bg-background/60"}`}>{t.count}</span>
              </button>
            );
          })}
        </div>
        <Card className="divide-y divide-border">
          {loading ? (
            <div className="p-6 text-center text-sm text-muted-foreground">Loading…</div>
          ) : allIssues.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">No issues in range.</div>
          ) : (
            pagedIssues.map((i) => (
              <Link
                key={i.id}
                to={`/incidents/${i.id}`}
                className="flex items-center gap-3 px-3 py-2.5 hover:bg-accent/40 transition-colors"
              >
                <CrisisLevelBadge level={i.crisis_level} compact />
                <RiskBadge level={(i.risk as RiskLevel) ?? "medium"} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate">{i.title}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {i.assignee ?? "Unassigned"} ·{" "}
                    {formatDistanceToNow(new Date(i.updated_at), { addSuffix: true })}
                  </p>
                </div>
                <StatusBadge status={i.status as any} />
                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              </Link>
            ))
          )}
        </Card>
        {!loading && allIssues.length > PAGE_SIZE && (
          <div className="flex items-center justify-between pt-1">
            <p className="text-[11px] text-muted-foreground">
              Showing {issuesPage * PAGE_SIZE + 1}–{Math.min(allIssues.length, (issuesPage + 1) * PAGE_SIZE)} of {allIssues.length}
            </p>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setIssuesPage((p) => Math.max(0, p - 1))}
                disabled={issuesPage === 0}
                className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs text-foreground hover:bg-accent/40 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ArrowRight className="h-3 w-3 rotate-180" /> Prev
              </button>
              <span className="text-[11px] text-muted-foreground px-2">
                Page {issuesPage + 1} / {issuesPageCount}
              </span>
              <button
                type="button"
                onClick={() => setIssuesPage((p) => Math.min(issuesPageCount - 1, p + 1))}
                disabled={issuesPage >= issuesPageCount - 1}
                className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs text-foreground hover:bg-accent/40 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Next <ArrowRight className="h-3 w-3" />
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
