import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Twitter, Instagram, Music2, Facebook, RefreshCw, Sparkles, ExternalLink, AlertTriangle, CheckCircle2, Loader2, Radio, Power, PowerOff } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { RiskBadge } from "@/components/RiskBadge";
import { CrisisLevelBadge } from "@/components/CrisisLevelBadge";
import { TimeRangeFilter, ALL_TIME, isInRange, type TimeRange } from "@/components/TimeRangeFilter";

// Derive an L0–L4 crisis level for a social mention from AI risk / score.
const mentionCrisisLevel = (m: { ai_risk: string | null; ai_risk_score: number | null }): number => {
  const r = (m.ai_risk ?? "").toLowerCase();
  if (r === "critical") return 4;
  if (r === "high") return 3;
  if (r === "medium") return 2;
  if (r === "low") return 1;
  const s = m.ai_risk_score;
  if (typeof s === "number") {
    if (s >= 80) return 4;
    if (s >= 60) return 3;
    if (s >= 40) return 2;
    if (s >= 20) return 1;
  }
  return 0;
};

type Mention = {
  id: string;
  channel: string;
  author_name: string | null;
  author_handle: string | null;
  content: string;
  post_url: string | null;
  posted_at: string | null;
  likes: number | null;
  shares: number | null;
  reach: number | null;
  is_verified: boolean | null;
  is_influencer: boolean | null;
  status: string;
  ai_incident_type: string | null;
  ai_sub_type: string | null;
  ai_risk: string | null;
  ai_risk_score: number | null;
  ai_summary: string | null;
  incident_id: string | null;
  created_at: string;
  updated_at: string;
};

const formatDateTime = (iso: string | null | undefined) => {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  return d.toLocaleString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatRelative = (iso: string | null | undefined) => {
  if (!iso) return null;
  const d = new Date(iso).getTime();
  if (isNaN(d)) return null;
  const diffSec = Math.round((Date.now() - d) / 1000);
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.round(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffH = Math.round(diffMin / 60);
  if (diffH < 24) return `${diffH}h ago`;
  const diffD = Math.round(diffH / 24);
  return `${diffD}d ago`;
};

const CHANNEL_META: Record<string, { icon: typeof Twitter; label: string; color: string }> = {
  twitter: { icon: Twitter, label: "X / Twitter", color: "text-sky-500" },
  instagram: { icon: Instagram, label: "Instagram", color: "text-pink-500" },
  tiktok: { icon: Music2, label: "TikTok", color: "text-foreground" },
  facebook: { icon: Facebook, label: "Facebook", color: "text-blue-600" },
};

// All mock posts reference Aurora Skylines (AS) — Madrid-hubbed hybrid carrier.
const MOCK_FEED = [
  // 🇪🇸 Spanish
  {
    channel: "twitter",
    author_name: "Carla Méndez",
    author_handle: "carlamendez",
    content: "Llevamos 4 horas en pista en MAD vuelo AS118 a BCN sin información. Hay una señora mayor descompensada y nadie del crew responde 😡 @auroraskylines",
    likes: 1240, shares: 320, reach: 84000, is_verified: false, is_influencer: false,
  },
  {
    channel: "instagram",
    author_name: "Sara López",
    author_handle: "saralopez",
    content: "Discriminación clarísima en el embarque de hoy AS340 MAD-LIM con Aurora Skylines. A mi amiga le impidieron subir por su silla de ruedas diciendo 'no entra'. Inaceptable.",
    likes: 2300, shares: 880, reach: 67000, is_verified: false, is_influencer: true,
  },
  {
    channel: "tiktok",
    author_name: "Pedro G.",
    author_handle: "pedrogfly",
    content: "App de Aurora Skylines caída desde esta mañana, no se puede hacer check-in online ni ver tarjetas de embarque. Colas enormes en T4 Barajas.",
    likes: 980, shares: 210, reach: 45000, is_verified: false, is_influencer: false,
  },

  // 🇬🇧 English
  {
    channel: "tiktok",
    author_name: "TravelWithMike",
    author_handle: "travelwithmike",
    content: "VIRAL: extreme turbulence on Aurora Skylines AS412 Madrid–Bogotá, people screaming, oxygen masks dropped. This should never happen.",
    likes: 58000, shares: 12000, reach: 1200000, is_verified: true, is_influencer: true,
  },
  {
    channel: "twitter",
    author_name: "Aviation Watch",
    author_handle: "aviationwatch",
    content: "UNCONFIRMED rumor circulating about an Aurora Skylines emergency landing at LIS. NO official confirmation from ANAC or the airline. Be careful before resharing.",
    likes: 8900, shares: 4200, reach: 320000, is_verified: true, is_influencer: false,
  },
  {
    channel: "instagram",
    author_name: "Diego R.",
    author_handle: "diegor.fly",
    content: "Third day with no luggage after flying Aurora Skylines AS705 LIS-JFK. Baggage system reportedly down per the desk staff. This is chaos.",
    likes: 410, shares: 45, reach: 9800, is_verified: false, is_influencer: false,
  },

  // 🇫🇷 French
  {
    channel: "twitter",
    author_name: "Julien Bernard",
    author_handle: "julienbrnd",
    content: "Vol Aurora Skylines AS220 CDG-MAD annulé sans explication, 180 passagers bloqués au terminal 2E depuis 6h. Aucun agent au comptoir. C'est honteux !",
    likes: 3200, shares: 1100, reach: 145000, is_verified: false, is_influencer: false,
  },
  {
    channel: "instagram",
    author_name: "Camille Dubois",
    author_handle: "camille.voyage",
    content: "Atterrissage d'urgence à Lisbonne ce matin sur Aurora Skylines AS512, fumée en cabine. Tout le monde évacué par les toboggans. Merci à l'équipage incroyable 🙏",
    likes: 15600, shares: 4800, reach: 420000, is_verified: true, is_influencer: true,
  },
  {
    channel: "tiktok",
    author_name: "Lucas M.",
    author_handle: "lucasmfly",
    content: "Le personnel de bord d'Aurora Skylines a refusé d'embarquer ma mère car elle parlait arabe au téléphone. Inacceptable, je porte plainte.",
    likes: 22000, shares: 6500, reach: 580000, is_verified: false, is_influencer: false,
  },
  {
    channel: "facebook",
    author_name: "Marta Ruiz",
    author_handle: "marta.ruiz",
    content: "Aurora Skylines AS118 MAD-BCN cancelado de nuevo. Tercera vez este mes. ¿Alguien sabe cómo reclamar la compensación EU261? @auroraskylines",
    likes: 540, shares: 180, reach: 22000, is_verified: false, is_influencer: false,
  },
  {
    channel: "facebook",
    author_name: "James O'Connor",
    author_handle: "james.oconnor",
    content: "Huge thanks to the Aurora Skylines crew on AS705 LIS-JFK last night — handled a medical emergency onboard with total professionalism. Diverted to Boston, all good. 👏",
    likes: 8900, shares: 1200, reach: 156000, is_verified: false, is_influencer: false,
  },
];

export default function Sevra() {
  const navigate = useNavigate();
  const [mentions, setMentions] = useState<Mention[]>([]);
  const [loading, setLoading] = useState(true);
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);
  const [filter, setFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "noise" | "crisis_level">("all");
  const [levelFilter, setLevelFilter] = useState<number | "all">("all");
  const [approvedIds, setApprovedIds] = useState<Set<string>>(new Set());
  const [monitorRunning, setMonitorRunning] = useState(false);
  const [monitorActive, setMonitorActive] = useState<boolean | null>(null);
  const [monitorSchedule, setMonitorSchedule] = useState<string | null>(null);
  const [monitorLastRun, setMonitorLastRun] = useState<string | null>(null);
  const [monitorTogglePending, setMonitorTogglePending] = useState(false);
  const [timeRange, setTimeRange] = useState<TimeRange>(ALL_TIME);

  const refreshMonitorStatus = async () => {
    const { data, error } = await supabase.functions.invoke("social-monitor-control", { body: {} });
    if (error || !data?.success) return;
    setMonitorActive(!!data.active);
    setMonitorSchedule(data.schedule ?? null);
    setMonitorLastRun(data.last_run_at ?? null);
  };

  const toggleMonitor = async (next: boolean) => {
    setMonitorTogglePending(true);
    try {
      const { data, error } = await supabase.functions.invoke("social-monitor-control", {
        body: { action: next ? "enable" : "disable" },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Toggle failed");
      setMonitorActive(!!data.active);
      toast.success(next ? "Continuous monitoring enabled" : "Continuous monitoring paused");
    } catch (e: any) {
      toast.error(e.message || "Failed to update monitor");
    } finally {
      setMonitorTogglePending(false);
    }
  };

  const runMonitorNow = async () => {
    setMonitorRunning(true);
    try {
      const { data, error } = await supabase.functions.invoke("social-monitor-cron", { body: {} });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Monitor failed");
      toast.success(`Monitor ran — ${data.generated ?? 0} new mentions, ${data.analyzed ?? 0} analyzed`);
      refreshMonitorStatus();
    } catch (e: any) {
      toast.error(e.message || "Failed to run monitor");
    } finally {
      setMonitorRunning(false);
    }
  };

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("social_mentions")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) toast.error(error.message);
    setMentions((data ?? []) as Mention[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
    refreshMonitorStatus();
    const channel = supabase
      .channel("social_mentions_realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "social_mentions" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const seedMocks = async () => {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) {
      toast.error("Sign in required");
      navigate("/login");
      return;
    }
    const rows = MOCK_FEED.map((m) => ({
      ...m,
      created_by: userId,
      posted_at: new Date(Date.now() - Math.random() * 1000 * 60 * 60 * 6).toISOString(),
      status: "pending",
    }));
    const { error } = await supabase.from("social_mentions").insert(rows);
    if (error) return toast.error(error.message);
    toast.success("New mentions ingested from social channels");
  };

  const analyzeOne = async (m: Mention) => {
    setAnalyzingId(m.id);
    try {
      const { data, error } = await supabase.functions.invoke("sevra-analyze", { body: { mention_id: m.id } });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Analysis failed");
      if (data.deduped) toast.success("Linked to existing incident (duplicate detected)");
      else if (data.incident_id) {
        toast.success("Incident auto-created — review & approve", {
          action: {
            label: "View & approve",
            onClick: () => navigate(`/incidents/${data.incident_id}`),
          },
        });
      } else toast.message("Mention dismissed as noise");
    } catch (e: any) {
      toast.error(e.message || "Failed to analyze");
    } finally {
      setAnalyzingId(null);
    }
  };

  const approveIncident = async (incidentId: string) => {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    const { error } = await supabase
      .from("incidents")
      .update({
        approval_status: "approved",
        approved_at: new Date().toISOString(),
        approved_by: userId ?? null,
      })
      .eq("id", incidentId);
    if (error) return toast.error(error.message);
    toast.success("Incident approved");
    setApprovedIds((prev) => new Set(prev).add(incidentId));
  };

  const analyzeAllPending = async () => {
    const pending = mentions.filter((m) => m.status === "pending");
    if (!pending.length) return toast.message("Nothing pending");
    toast.success(`SEVRA analyzing ${pending.length} mentions...`);
    for (const m of pending) {
      await analyzeOne(m);
    }
  };

  const timeScoped = mentions.filter((m) => isInRange(m.posted_at ?? m.created_at, timeRange));
  const filtered = timeScoped.filter(
    (m) =>
      (filter === "all" || m.channel === filter) &&
      (statusFilter === "all" ||
        (statusFilter === "noise" && m.status === "dismissed") ||
        (statusFilter === "crisis_level" && m.status !== "dismissed")) &&
      (statusFilter !== "crisis_level" || levelFilter === "all" || mentionCrisisLevel(m) === levelFilter),
  );

  const incidentMentionCounts = mentions.reduce<Record<string, number>>((acc, m) => {
    if (m.incident_id) acc[m.incident_id] = (acc[m.incident_id] ?? 0) + 1;
    return acc;
  }, {});

  const crisisMentions = timeScoped.filter((m) => m.status !== "dismissed");
  const levelCounts: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0 };
  crisisMentions.forEach((m) => {
    levelCounts[mentionCrisisLevel(m)]++;
  });

  const stats = {
    noise: timeScoped.filter((m) => m.status === "dismissed").length,
    crisis_level: crisisMentions.length,
  };




  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-6xl mx-auto">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Radio className="h-5 w-5 text-primary" />
            <h1 className="text-xl sm:text-2xl font-bold text-foreground">SEVRA · Social Intel</h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Live ingest from airline social channels. AI classifies, scores, and auto-creates incidents.
          </p>
        </div>
        <div className="flex gap-2 flex-wrap w-full sm:w-auto">
          <Button variant="outline" size="sm" onClick={runMonitorNow} disabled={monitorRunning} className="flex-1 sm:flex-none">
            {monitorRunning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Radio className="h-4 w-4" />}
            <span className="hidden xs:inline">Run monitor now</span><span className="xs:hidden">Monitor</span>
          </Button>
          <Button variant="outline" size="sm" onClick={seedMocks} className="flex-1 sm:flex-none">
            <RefreshCw className="h-4 w-4" /> <span className="hidden xs:inline">Pull demo mentions</span><span className="xs:hidden">Pull</span>
          </Button>
          <Button size="sm" onClick={analyzeAllPending} disabled={!stats.crisis_level} className="flex-1 sm:flex-none">
            <Sparkles className="h-4 w-4" /> Analyze all ({stats.crisis_level})
          </Button>
        </div>
      </div>

      <TimeRangeFilter value={timeRange} onChange={setTimeRange} />

      <Card
        className={`p-4 flex items-center gap-4 flex-wrap border-2 ${
          monitorActive
            ? "bg-emerald-500/5 border-emerald-500/40"
            : monitorActive === false
              ? "bg-muted/40 border-border"
              : "bg-muted/20 border-border"
        }`}
      >
        <div className="flex items-center gap-3 flex-1 min-w-[240px]">
          {monitorActive ? (
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
            </span>
          ) : (
            <span className="inline-flex rounded-full h-3 w-3 bg-muted-foreground/40" />
          )}
          <div className="text-sm">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-foreground">Continuous monitoring</span>
              {monitorActive === null ? (
                <Badge variant="outline" className="text-[10px]">checking…</Badge>
              ) : monitorActive ? (
                <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/20 text-[10px] uppercase tracking-wider">
                  <Power className="h-3 w-3 mr-1" /> ON
                </Badge>
              ) : (
                <Badge variant="outline" className="text-muted-foreground text-[10px] uppercase tracking-wider">
                  <PowerOff className="h-3 w-3 mr-1" /> OFF
                </Badge>
              )}
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">
              {monitorActive
                ? `SEVRA scans every 15 min and auto-creates incidents on high risk.`
                : `Paused. Mentions will only be ingested when you click "Run monitor now".`}
              {monitorLastRun && (
                <> · Last run {formatRelative(monitorLastRun)}</>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">{monitorActive ? "On" : "Off"}</span>
          <Switch
            checked={!!monitorActive}
            onCheckedChange={toggleMonitor}
            disabled={monitorActive === null || monitorTogglePending}
            aria-label="Toggle continuous monitoring"
          />
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-3">
        {([
          { key: "crisis_level" as const, label: "Crisis level", value: stats.crisis_level, color: "text-primary" },
          { key: "noise" as const, label: "Noise", value: stats.noise, color: "text-muted-foreground" },
        ]).map((s) => {
          const active = statusFilter === s.key;
          return (
            <Card
              key={s.key}
              onClick={() => setStatusFilter(active ? "all" : s.key)}
              className={`p-4 cursor-pointer transition-colors hover:bg-accent/50 ${active ? "ring-2 ring-primary bg-accent/40" : ""}`}
            >
              <div className="text-xs text-muted-foreground uppercase tracking-wider">{s.label}</div>
              <div className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</div>
              {active && <div className="text-[10px] text-muted-foreground mt-1">click again to clear</div>}
            </Card>
          );
        })}
      </div>

      <Tabs value={filter} onValueChange={setFilter} className="w-full">
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="all">All channels</TabsTrigger>
          <TabsTrigger value="twitter">X</TabsTrigger>
          <TabsTrigger value="instagram">Instagram</TabsTrigger>
          <TabsTrigger value="tiktok">TikTok</TabsTrigger>
          <TabsTrigger value="facebook">Facebook</TabsTrigger>
        </TabsList>
      </Tabs>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Loading mentions…</div>
      ) : !filtered.length ? (
        <Card className="p-10 text-center">
          <p className="text-muted-foreground mb-4">No mentions yet. Pull from social channels to start.</p>
          <Button onClick={seedMocks}><RefreshCw className="h-4 w-4" /> Pull mentions</Button>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((m) => {
            const meta = CHANNEL_META[m.channel] ?? CHANNEL_META.twitter;
            const Icon = meta.icon;
            const isAnalyzing = analyzingId === m.id || m.status === "analyzing";
            return (
              <Card key={m.id} className="p-3 sm:p-4 overflow-hidden">
                <div className="flex items-start gap-3 flex-col sm:flex-row">
                  <div className="flex items-start gap-3 w-full sm:contents">
                    <div className={`h-10 w-10 rounded-full bg-muted flex items-center justify-center shrink-0 ${meta.color}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                  <div className="flex-1 min-w-0 w-full">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-foreground break-all">{m.author_name}</span>
                      <span className="text-sm text-muted-foreground break-all">@{m.author_handle}</span>
                      {m.is_verified && <Badge variant="secondary" className="text-[10px]">verified</Badge>}
                      {m.is_influencer && <Badge variant="secondary" className="text-[10px]">influencer</Badge>}
                      <span className="text-xs text-muted-foreground">· {meta.label}</span>
                      {(m.posted_at || m.created_at) && (
                        <span
                          className="text-xs text-muted-foreground"
                          title={formatDateTime(m.posted_at ?? m.created_at) ?? undefined}
                        >
                          · posted {formatRelative(m.posted_at ?? m.created_at)}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-foreground mt-2 whitespace-pre-wrap break-words">{m.content}</p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground flex-wrap">
                      <span>♥ {m.likes?.toLocaleString()}</span>
                      <span>↻ {m.shares?.toLocaleString()}</span>
                      <span>👁 {m.reach?.toLocaleString()} reach</span>
                    </div>

                    {m.ai_summary && (
                      <div className="mt-3 p-3 rounded-md border border-border bg-muted/40 space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Sparkles className="h-3.5 w-3.5 text-primary" />
                          <span className="text-xs font-semibold text-foreground">SEVRA analysis</span>
                          {m.ai_risk && <RiskBadge level={m.ai_risk as any} />}
                          {m.ai_incident_type && <Badge variant="outline" className="text-[10px]">{m.ai_incident_type}</Badge>}
                          {m.ai_sub_type && <Badge variant="outline" className="text-[10px]">{m.ai_sub_type}</Badge>}
                          {m.ai_risk_score != null && <span className="text-xs text-muted-foreground">score {m.ai_risk_score}</span>}
                          {m.updated_at && (
                            <span
                              className="text-xs text-muted-foreground sm:ml-auto"
                              title={formatDateTime(m.updated_at) ?? undefined}
                            >
                              analyzed {formatRelative(m.updated_at)}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground break-words">{m.ai_summary}</p>
                      </div>
                    )}
                  </div>
                  </div>
                  <div className="flex flex-row sm:flex-col items-start sm:items-end gap-2 shrink-0 flex-wrap w-full sm:w-auto">
                    {m.status === "pending" && (
                      <Button size="sm" onClick={() => analyzeOne(m)} disabled={isAnalyzing}>
                        {isAnalyzing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                        Analyze
                      </Button>
                    )}
                    {m.status === "analyzing" && (
                      <Badge variant="secondary"><Loader2 className="h-3 w-3 animate-spin" /> analyzing</Badge>
                    )}
                    {(m.status === "incident_created" || m.status === "linked_to_incident") && m.incident_id && (
                      <>
                        <Button size="sm" variant="outline" onClick={() => navigate(`/incidents/${m.incident_id}`)}>
                          <AlertTriangle className="h-3.5 w-3.5" /> View incident
                        </Button>
                        {m.status === "incident_created" && (
                          approvedIds.has(m.incident_id) ? (
                            <Badge className="gap-1 bg-risk-low-bg text-risk-low border-0">
                              <CheckCircle2 className="h-3 w-3" /> approved
                            </Badge>
                          ) : (
                            <Button size="sm" onClick={() => approveIncident(m.incident_id!)}>
                              <CheckCircle2 className="h-3.5 w-3.5" /> Approve
                            </Button>
                          )
                        )}
                        {incidentMentionCounts[m.incident_id] > 1 && (
                          <Badge variant="secondary" className="text-[10px]">
                            {incidentMentionCounts[m.incident_id]} mentions on this incident
                          </Badge>
                        )}
                        {m.status === "linked_to_incident" && (
                          <Badge variant="outline" className="text-[10px]">deduped</Badge>
                        )}
                      </>
                    )}
                    {m.status === "dismissed" && (
                      <Badge variant="outline" className="gap-1"><CheckCircle2 className="h-3 w-3" /> noise</Badge>
                    )}
                    {m.post_url && (
                      <a href={m.post_url} target="_blank" rel="noreferrer" className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
                        source <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
