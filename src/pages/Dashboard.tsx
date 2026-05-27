import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RiskBadge } from "@/components/RiskBadge";
import { CrisisLevelBadge } from "@/components/CrisisLevelBadge";
import { StatusBadge } from "@/components/StatusBadge";
import { TimeRangeFilter, ALL_TIME, isInRange, type TimeRange } from "@/components/TimeRangeFilter";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  author_avatar_url: string | null;
  is_influencer: boolean | null;
  is_verified: boolean | null;
  reach: number | null;
  likes: number | null;
  shares: number | null;
  ai_risk: string | null;
  ai_summary: string | null;
  incident_id: string | null;
  post_url: string | null;
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
          .select("id, content, channel, author_handle, author_name, author_avatar_url, is_influencer, is_verified, reach, likes, shares, ai_risk, ai_summary, incident_id, post_url, posted_at, created_at")
          .order("created_at", { ascending: false })
          .limit(500),
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

  // 3. Social mentions — rich decision view
  const RISK_WEIGHT: Record<string, number> = { critical: 100, high: 60, medium: 25, low: 5 };
  const channelStats = useMemo(() => {
    const map = new Map<
      string,
      { count: number; reach: number; negative: number; influencers: number }
    >();
    for (const m of mentions) {
      const k = (m.channel ?? "web").toLowerCase();
      const cur = map.get(k) ?? { count: 0, reach: 0, negative: 0, influencers: 0 };
      cur.count += 1;
      cur.reach += m.reach ?? 0;
      if (m.ai_risk === "critical" || m.ai_risk === "high") cur.negative += 1;
      if (m.is_influencer) cur.influencers += 1;
      map.set(k, cur);
    }
    return Array.from(map.entries())
      .map(([channel, v]) => ({ channel, ...v }))
      .sort((a, b) => b.count - a.count);
  }, [mentions]);
  const mentionsTotal = mentions.length;
  const influencerCount = mentions.filter((m) => m.is_influencer).length;
  const verifiedCount = mentions.filter((m) => m.is_verified).length;
  const totalReach = mentions.reduce((s, m) => s + (m.reach ?? 0), 0);
  const totalEngagement = mentions.reduce(
    (s, m) => s + (m.likes ?? 0) + (m.shares ?? 0),
    0,
  );
  const mentionRiskCounts = useMemo(() => {
    const c = { critical: 0, high: 0, medium: 0, low: 0, unscored: 0 };
    for (const m of mentions) {
      const r = m.ai_risk;
      if (r && r in c) (c as any)[r] += 1;
      else c.unscored += 1;
    }
    return c;
  }, [mentions]);
  const negativeShare = mentionsTotal
    ? Math.round(((mentionRiskCounts.critical + mentionRiskCounts.high) / mentionsTotal) * 100)
    : 0;

  // Velocity: last hour vs the hour before
  const velocity = useMemo(() => {
    const now = Date.now();
    const H = 60 * 60 * 1000;
    let last = 0, prev = 0;
    for (const m of mentions) {
      const t = new Date(m.posted_at ?? m.created_at).getTime();
      if (now - t <= H) last += 1;
      else if (now - t <= 2 * H) prev += 1;
    }
    const delta = last - prev;
    const pct = prev === 0 ? (last > 0 ? 100 : 0) : Math.round(((last - prev) / prev) * 100);
    return { last, prev, delta, pct };
  }, [mentions]);

  // Crisis pressure score (0–100) — blends volume, negativity, reach, influencer weight
  const pressure = useMemo(() => {
    if (mentionsTotal === 0) return 0;
    const weighted = mentions.reduce(
      (s, m) => s + (RISK_WEIGHT[m.ai_risk ?? ""] ?? 10) * (m.is_influencer ? 2 : 1),
      0,
    );
    const score = Math.min(100, Math.round(weighted / mentionsTotal));
    return score;
  }, [mentions, mentionsTotal]);
  const pressureTone =
    pressure >= 70
      ? { label: "High", color: "text-risk-critical", bg: "bg-risk-critical", bgSoft: "bg-risk-critical-bg" }
      : pressure >= 40
      ? { label: "Elevated", color: "text-risk-high", bg: "bg-risk-high", bgSoft: "bg-risk-high-bg" }
      : pressure >= 20
      ? { label: "Watch", color: "text-risk-medium", bg: "bg-risk-medium", bgSoft: "bg-risk-medium-bg" }
      : { label: "Calm", color: "text-risk-low", bg: "bg-risk-low", bgSoft: "bg-risk-low-bg" };

  // Top urgent mentions for decision-making
  const topUrgent = useMemo(
    () =>
      mentions
        .slice()
        .sort((a, b) => {
          const r =
            (RISK_WEIGHT[b.ai_risk ?? ""] ?? 0) - (RISK_WEIGHT[a.ai_risk ?? ""] ?? 0);
          if (r) return r;
          const inf = Number(!!b.is_influencer) - Number(!!a.is_influencer);
          if (inf) return inf;
          return (b.reach ?? 0) - (a.reach ?? 0);
        })
        .slice(0, 4),
    [mentions],
  );


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

  // 5. Sentiment analysis — language-based, crisis-calibrated
  // Classifies the TONE of the post text (not engagement, not risk-as-sentiment).
  // High-risk posts are forced negative — a crash post with likes is still negative.
  // Reach-weighted so virality dominates volume.
  const NEG_TERMS = [
    "angry", "furious", "awful", "terrible", "horrible", "worst", "hate", "disgusting",
    "disgrace", "shame", "shameful", "scandal", "fail", "failed", "failure", "broken",
    "crash", "crashed", "died", "death", "killed", "injured", "injury", "fatal",
    "lawsuit", "sue", "suing", "fraud", "scam", "lie", "lying", "liar", "cover-up",
    "refund", "boycott", "cancel", "cancelled", "never again", "avoid", "incompetent",
    "negligent", "negligence", "unsafe", "danger", "dangerous", "outrage", "outrageous",
    "appalling", "ridiculous", "unacceptable", "complaint", "complain", "ruined",
    "stranded", "delayed", "missed", "lost", "stolen", "rude", "disrespect",
  ];
  const POS_TERMS = [
    "love", "loved", "amazing", "excellent", "great", "fantastic", "wonderful",
    "thank you", "thanks", "thank", "kudos", "brilliant", "perfect", "outstanding",
    "impressed", "impressive", "recommend", "highly recommend", "best", "smooth",
    "helpful", "kind", "professional", "friendly", "appreciate", "appreciated",
    "well done", "bravo", "above and beyond", "exceptional",
  ];
  const classifySentiment = (m: Mention): "negative" | "neutral" | "positive" => {
    if (m.ai_risk === "critical" || m.ai_risk === "high") return "negative";
    const text = `${m.content ?? ""} ${m.ai_summary ?? ""}`.toLowerCase();
    if (!text.trim()) return "neutral";
    const hasNeg = NEG_TERMS.some((t) => text.includes(t));
    const hasPos = POS_TERMS.some((t) => text.includes(t));
    if (hasNeg) return "negative";
    if (hasPos) return "positive";
    return "neutral";
  };
  const sentiment = useMemo(() => {
    let negCount = 0, neuCount = 0, posCount = 0;
    let negReach = 0, neuReach = 0, posReach = 0;
    for (const m of mentions) {
      const reach = Math.max(1, m.reach ?? 0);
      const bucket = classifySentiment(m);
      if (bucket === "negative") { negCount += 1; negReach += reach; }
      else if (bucket === "positive") { posCount += 1; posReach += reach; }
      else { neuCount += 1; neuReach += reach; }
    }
    const totalReach = Math.max(1, negReach + neuReach + posReach);
    return {
      negative: negCount, neutral: neuCount, positive: posCount,
      total: negCount + neuCount + posCount,
      negPct: Math.round((negReach / totalReach) * 100),
      neuPct: Math.round((neuReach / totalReach) * 100),
      posPct: Math.round((posReach / totalReach) * 100),
      totalReach: negReach + neuReach + posReach,
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

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="issues-log">Issues log</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6 mt-0">
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
      {/* 3. Social mentions — decision view */}
      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Social mentions
          </h2>
          <Link to="/sevra" className="text-xs text-primary hover:underline inline-flex items-center gap-1">
            Open Social Intel <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        <Card className="p-4 space-y-4">
          {/* Top row: pressure + KPIs + velocity */}
          <div className="grid gap-3 lg:grid-cols-[1.1fr_2fr]">
            {/* Crisis pressure */}
            <div className={`rounded-lg ${pressureTone.bgSoft} p-3 flex items-center gap-3`}>
              <div className="relative h-14 w-14 shrink-0">
                <svg viewBox="0 0 36 36" className="h-14 w-14 -rotate-90">
                  <circle cx="18" cy="18" r="15.5" className="fill-none stroke-background/60" strokeWidth="3" />
                  <circle
                    cx="18" cy="18" r="15.5"
                    className={`fill-none ${pressureTone.color}`}
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeDasharray={`${(pressure / 100) * 97.4} 97.4`}
                  />
                </svg>
                <div className={`absolute inset-0 flex items-center justify-center text-sm font-semibold ${pressureTone.color}`}>
                  {pressure}
                </div>
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <Flame className={`h-3.5 w-3.5 ${pressureTone.color}`} />
                  <span className={`text-[10px] uppercase tracking-wider font-semibold ${pressureTone.color}`}>
                    Crisis pressure · {pressureTone.label}
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {negativeShare}% negative · {influencerCount} influencer{influencerCount === 1 ? "" : "s"} amplifying
                </p>
                <p className="text-[10px] text-muted-foreground/80 mt-1">
                  Weighted by risk, reach, and amplification.
                </p>
              </div>
            </div>
            {/* KPI tiles */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div className="rounded-md bg-primary/10 px-3 py-2">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] uppercase tracking-wider text-primary">Mentions</p>
                  {velocity.last > 0 || velocity.prev > 0 ? (
                    <span className={`inline-flex items-center gap-0.5 text-[10px] font-medium ${velocity.delta > 0 ? "text-risk-critical" : velocity.delta < 0 ? "text-risk-low" : "text-muted-foreground"}`}>
                      {velocity.delta > 0 ? <TrendingUp className="h-3 w-3" /> : velocity.delta < 0 ? <TrendingDown className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
                      {velocity.delta > 0 ? "+" : ""}{velocity.pct}%
                    </span>
                  ) : null}
                </div>
                <p className="text-xl font-semibold text-primary">{mentionsTotal}</p>
                <p className="text-[10px] text-muted-foreground">{velocity.last} in last hr</p>
              </div>
              <div className="rounded-md bg-muted px-3 py-2">
                <div className="flex items-center gap-1">
                  <Eye className="h-3 w-3 text-muted-foreground" />
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Reach</p>
                </div>
                <p className="text-xl font-semibold text-foreground">{formatNum(totalReach)}</p>
                <p className="text-[10px] text-muted-foreground">{formatNum(totalEngagement)} engagement</p>
              </div>
              <div className="rounded-md bg-risk-high-bg px-3 py-2">
                <div className="flex items-center gap-1">
                  <Users className="h-3 w-3 text-risk-high" />
                  <p className="text-[10px] uppercase tracking-wider text-risk-high">Influencers</p>
                </div>
                <p className="text-xl font-semibold text-risk-high">{influencerCount}</p>
                <p className="text-[10px] text-muted-foreground inline-flex items-center gap-0.5">
                  <BadgeCheck className="h-3 w-3" /> {verifiedCount} verified
                </p>
              </div>
              <div className="rounded-md bg-risk-critical-bg px-3 py-2">
                <div className="flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3 text-risk-critical" />
                  <p className="text-[10px] uppercase tracking-wider text-risk-critical">Negative</p>
                </div>
                <p className="text-xl font-semibold text-risk-critical">{negativeShare}%</p>
                <p className="text-[10px] text-muted-foreground">
                  {mentionRiskCounts.critical + mentionRiskCounts.high} of {mentionsTotal}
                </p>
              </div>
            </div>
          </div>

          {/* Risk distribution bar */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <p className="text-[11px] text-muted-foreground">Mention risk mix</p>
              <p className="text-[10px] text-muted-foreground">
                {mentionRiskCounts.critical} crit · {mentionRiskCounts.high} high · {mentionRiskCounts.medium} med · {mentionRiskCounts.low} low
              </p>
            </div>
            <div className="flex h-2 w-full overflow-hidden rounded-full bg-muted">
              {mentionsTotal > 0 && (
                <>
                  <div className="bg-risk-critical" style={{ width: `${(mentionRiskCounts.critical / mentionsTotal) * 100}%` }} title={`Critical ${mentionRiskCounts.critical}`} />
                  <div className="bg-risk-high" style={{ width: `${(mentionRiskCounts.high / mentionsTotal) * 100}%` }} title={`High ${mentionRiskCounts.high}`} />
                  <div className="bg-risk-medium" style={{ width: `${(mentionRiskCounts.medium / mentionsTotal) * 100}%` }} title={`Medium ${mentionRiskCounts.medium}`} />
                  <div className="bg-risk-low" style={{ width: `${(mentionRiskCounts.low / mentionsTotal) * 100}%` }} title={`Low ${mentionRiskCounts.low}`} />
                </>
              )}
            </div>
          </div>

          {/* Two-col: channels + urgent voices */}
          <div className="grid gap-4 lg:grid-cols-2">
            {/* Channel breakdown */}
            <div className="space-y-2">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">By channel</p>
              {channelStats.length === 0 ? (
                <p className="text-xs text-muted-foreground">No mentions in range.</p>
              ) : (
                <div className="space-y-2">
                  {channelStats.slice(0, 6).map((c) => {
                    const meta = CHANNEL_META[c.channel] ?? { icon: Globe, color: "text-muted-foreground" };
                    const Icon = meta.icon;
                    const pct = (c.count / Math.max(1, mentionsTotal)) * 100;
                    const negPct = c.count ? Math.round((c.negative / c.count) * 100) : 0;
                    return (
                      <div key={c.channel} className="rounded-md border border-border/60 px-2.5 py-2">
                        <div className="flex items-center gap-2">
                          <Icon className={`h-3.5 w-3.5 ${meta.color}`} />
                          <span className="text-xs font-medium capitalize">{c.channel}</span>
                          <span className="ml-auto text-[11px] text-muted-foreground">{c.count}</span>
                        </div>
                        <div className="mt-1.5 flex h-1.5 w-full overflow-hidden rounded-full bg-muted">
                          <div className={`h-full ${meta.color.replace("text-", "bg-")}`} style={{ width: `${pct}%` }} />
                        </div>
                        <div className="mt-1 flex items-center justify-between text-[10px] text-muted-foreground">
                          <span className="inline-flex items-center gap-1">
                            <Eye className="h-3 w-3" /> {formatNum(c.reach)} reach
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <Users className="h-3 w-3" /> {c.influencers} inf
                          </span>
                          <span className={`inline-flex items-center gap-1 ${negPct >= 50 ? "text-risk-critical" : negPct >= 25 ? "text-risk-high" : ""}`}>
                            <AlertTriangle className="h-3 w-3" /> {negPct}% neg
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Top urgent voices */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider inline-flex items-center gap-1">
                  <Zap className="h-3 w-3" /> Needs your attention
                </p>
              </div>
              {topUrgent.length === 0 ? (
                <p className="text-xs text-muted-foreground">No urgent mentions.</p>
              ) : (
                <div className="space-y-1.5">
                  {topUrgent.map((m) => {
                    const meta = CHANNEL_META[(m.channel ?? "web").toLowerCase()] ?? { icon: Globe, color: "text-muted-foreground" };
                    const Icon = meta.icon;
                    const risk = (m.ai_risk ?? "low") as RiskLevel;
                    return (
                      <div key={m.id} className="rounded-md border border-border/60 px-2.5 py-2 hover:bg-accent/40 transition-colors">
                        <div className="flex items-center gap-2 min-w-0">
                          <Icon className={`h-3.5 w-3.5 shrink-0 ${meta.color}`} />
                          <RiskBadge level={risk} />
                          <span className="text-xs font-medium truncate">
                            {m.author_name ?? m.author_handle ?? "Unknown"}
                          </span>
                          {m.is_verified && <BadgeCheck className="h-3 w-3 text-primary shrink-0" />}
                          {m.is_influencer && (
                            <Badge variant="outline" className="text-[9px] px-1 py-0 h-4">influencer</Badge>
                          )}
                          <span className="ml-auto text-[10px] text-muted-foreground shrink-0">
                            {formatDistanceToNow(new Date(m.posted_at ?? m.created_at), { addSuffix: true })}
                          </span>
                        </div>
                        <p className="text-[11px] text-foreground/90 mt-1 line-clamp-2">
                          {m.ai_summary ?? m.content}
                        </p>
                        <div className="mt-1.5 flex items-center gap-3 text-[10px] text-muted-foreground">
                          <span className="inline-flex items-center gap-0.5"><Eye className="h-3 w-3" />{formatNum(m.reach ?? 0)}</span>
                          <span className="inline-flex items-center gap-0.5"><Heart className="h-3 w-3" />{formatNum(m.likes ?? 0)}</span>
                          <span className="inline-flex items-center gap-0.5"><Share2 className="h-3 w-3" />{formatNum(m.shares ?? 0)}</span>
                          <div className="ml-auto flex items-center gap-2">
                            {m.incident_id ? (
                              <Link to={`/incidents/${m.incident_id}`} className="text-primary hover:underline inline-flex items-center gap-0.5">
                                Open issue <ArrowRight className="h-3 w-3" />
                              </Link>
                            ) : (
                              <Link to="/sevra" className="text-primary hover:underline inline-flex items-center gap-0.5">
                                Triage <ArrowRight className="h-3 w-3" />
                              </Link>
                            )}
                            {m.post_url && (
                              <a href={m.post_url} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-foreground inline-flex items-center gap-0.5">
                                Source <ExternalLink className="h-3 w-3" />
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
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
          <div className="space-y-1 pt-1 border-t border-border/60">
            <p className="text-[10px] text-muted-foreground">
              Reach-weighted across {sentiment.total} mentions ({formatNum(sentiment.totalReach)} impressions).
            </p>
            <p className="text-[10px] text-muted-foreground/80 leading-relaxed">
              <span className="text-risk-critical font-medium">Negative</span> = critical/high risk posts (attacks, complaints, threats) ·{" "}
              <span className="text-risk-medium font-medium">Neutral</span> = medium-risk or informational ·{" "}
              <span className="text-risk-low font-medium">Positive</span> = low-risk posts with supportive engagement (likes ≥ shares).
            </p>
          </div>
        </Card>
      </section>
        </TabsContent>

        <TabsContent value="issues-log" className="space-y-6 mt-0">
      {/* Issues log */}
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
        </TabsContent>
      </Tabs>
    </div>
  );
}
