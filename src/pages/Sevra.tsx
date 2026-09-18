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
import { TimeRangeFilter, DEFAULT_TIME_RANGE, isInRange, type TimeRange } from "@/components/TimeRangeFilter";
import { useIntlLocale, useLang, useMessages } from "@/i18n";
import { useTranslations } from "@/i18n/useTranslations";
import { sevraMessages } from "@/i18n/messages/sevra";
import { humanizeSubType, INCIDENT_TYPES, typeLabel, type IncidentType } from "@/lib/industries";

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
  translations: unknown;
};

const formatDateTime = (iso: string | null | undefined, locale?: string) => {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  return d.toLocaleString(locale, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

type Ago = typeof sevraMessages.en.ago;
const formatRelative = (iso: string | null | undefined, ago: Ago) => {
  if (!iso) return null;
  const d = new Date(iso).getTime();
  if (isNaN(d)) return null;
  const diffSec = Math.round((Date.now() - d) / 1000);
  if (diffSec < 60) return ago.s(diffSec);
  const diffMin = Math.round(diffSec / 60);
  if (diffMin < 60) return ago.m(diffMin);
  const diffH = Math.round(diffMin / 60);
  if (diffH < 24) return ago.h(diffH);
  return ago.d(Math.round(diffH / 24));
};

const CHANNEL_META: Record<string, { icon: typeof Twitter; label: string; color: string }> = {
  twitter: { icon: Twitter, label: "X / Twitter", color: "text-sky-500" },
  instagram: { icon: Instagram, label: "Instagram", color: "text-pink-500" },
  tiktok: { icon: Music2, label: "TikTok", color: "text-foreground" },
  facebook: { icon: Facebook, label: "Facebook", color: "text-blue-600" },
};

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
  const [timeRange, setTimeRange] = useState<TimeRange>(DEFAULT_TIME_RANGE);
  const t = useMessages(sevraMessages);
  const { lang } = useLang();
  const intl = useIntlLocale();
  const rel = (iso: string | null | undefined) => formatRelative(iso, t.ago);
  const abs = (iso: string | null | undefined) => formatDateTime(iso, intl);
  const [industry, setIndustry] = useState<string | null>(null);
  useEffect(() => {
    supabase.from("company_settings").select("industry").maybeSingle().then(({ data }) => setIndustry(data?.industry ?? null));
  }, []);
  const incidentTypeLabel = (v: string) =>
    (INCIDENT_TYPES as readonly string[]).includes(v) ? typeLabel(industry, v as IncidentType, lang) : v;

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
      if (!data?.success) throw new Error(data?.error || t.toggleFailed);
      setMonitorActive(!!data.active);
      toast.success(next ? t.monitoringEnabled : t.monitoringPaused);
    } catch (e: any) {
      toast.error(e.message || t.monitorUpdateFailed);
    } finally {
      setMonitorTogglePending(false);
    }
  };

  const runMonitorNow = async () => {
    setMonitorRunning(true);
    try {
      const { data, error } = await supabase.functions.invoke("social-monitor-cron", { body: {} });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || t.monitorFailed);
      const errors = data.network_errors as Record<string, string> | undefined;
      const errorSuffix = errors
        ? " · " + Object.entries(errors).map(([network, msg]) => `${network}: ${msg}`).join(" · ")
        : "";
      toast.success(`${t.monitorRan(data.generated ?? 0, data.analyzed ?? 0)}${errorSuffix}`);
      refreshMonitorStatus();
    } catch (e: any) {
      toast.error(e.message || t.monitorRunFailed);
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

  const analyzeOne = async (m: Mention) => {
    setAnalyzingId(m.id);
    try {
      const { data, error } = await supabase.functions.invoke("sevra-analyze", { body: { mention_id: m.id } });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || t.analysisFailed);
      if (data.deduped) toast.success(t.linkedExisting);
      else if (data.incident_id) {
        toast.success(t.autoCreated, {
          action: {
            label: t.viewAndApprove,
            onClick: () => navigate(`/incidents/${data.incident_id}`),
          },
        });
      } else toast.message(t.dismissedNoise);
    } catch (e: any) {
      toast.error(e.message || t.analyzeFailed);
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
    toast.success(t.incidentApproved);
    setApprovedIds((prev) => new Set(prev).add(incidentId));
  };

  const analyzeAllPending = async () => {
    const pending = mentions.filter((m) => m.status === "pending");
    if (!pending.length) return toast.message(t.nothingPending);
    toast.success(t.analyzingN(pending.length));
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

  const tr = useTranslations("social_mentions", filtered);

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
            <h1 className="text-xl sm:text-2xl font-bold text-foreground">{t.title}</h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {t.intro}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap w-full sm:w-auto">
          <Button variant="outline" size="sm" onClick={runMonitorNow} disabled={monitorRunning} className="flex-1 sm:flex-none">
            {monitorRunning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Radio className="h-4 w-4" />}
            <span className="hidden xs:inline">{t.runMonitorNow}</span><span className="xs:hidden">{t.monitorShort}</span>
          </Button>
          <Button size="sm" onClick={analyzeAllPending} disabled={!stats.crisis_level} className="flex-1 sm:flex-none">
            <Sparkles className="h-4 w-4" /> {t.analyzeAll(stats.crisis_level)}
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
              <span className="font-semibold text-foreground">{t.continuous}</span>
              {monitorActive === null ? (
                <Badge variant="outline" className="text-[10px]">{t.checking}</Badge>
              ) : monitorActive ? (
                <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/20 text-[10px] uppercase tracking-wider">
                  <Power className="h-3 w-3 mr-1" /> {t.onBadge}
                </Badge>
              ) : (
                <Badge variant="outline" className="text-muted-foreground text-[10px] uppercase tracking-wider">
                  <PowerOff className="h-3 w-3 mr-1" /> {t.offBadge}
                </Badge>
              )}
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">
              {monitorActive
                ? t.scansEvery
                : t.paused}
              {monitorLastRun && (
                <>{t.lastRun(rel(monitorLastRun) ?? "")}</>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">{monitorActive ? t.on : t.off}</span>
          <Switch
            checked={!!monitorActive}
            onCheckedChange={toggleMonitor}
            disabled={monitorActive === null || monitorTogglePending}
            aria-label={t.toggleMonitoring}
          />
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-3">
        {([
          { key: "crisis_level" as const, label: t.crisisLevel, value: stats.crisis_level, color: "text-primary" },
          { key: "noise" as const, label: t.noise, value: stats.noise, color: "text-muted-foreground" },
        ]).map((s) => {
          const active = statusFilter === s.key;
          return (
            <Card
              key={s.key}
              onClick={() => {
                setStatusFilter(active ? "all" : s.key);
                setLevelFilter("all");
              }}
              className={`p-4 cursor-pointer transition-colors hover:bg-accent/50 ${active ? "ring-2 ring-primary bg-accent/40" : ""}`}
            >
              <div className="text-xs text-muted-foreground uppercase tracking-wider">{s.label}</div>
              <div className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</div>
              {active && <div className="text-[10px] text-muted-foreground mt-1">{t.clickToClear}</div>}
            </Card>
          );
        })}
      </div>

      {statusFilter === "crisis_level" && (
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-xs uppercase tracking-wider text-muted-foreground mr-1">{t.level}</span>
          <button
            type="button"
            onClick={() => setLevelFilter("all")}
            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium border transition-colors ${
              levelFilter === "all" ? "bg-primary text-primary-foreground border-primary" : "bg-background text-muted-foreground border-border hover:bg-accent/40"
            }`}
          >
            {t.allCount(stats.crisis_level)}
          </button>
          {[0, 1, 2, 3, 4].map((lvl) => {
            const active = levelFilter === lvl;
            return (
              <button
                key={lvl}
                type="button"
                onClick={() => setLevelFilter(active ? "all" : lvl)}
                className={`inline-flex items-center gap-1.5 rounded-full transition-opacity ${active ? "ring-2 ring-primary" : "opacity-80 hover:opacity-100"}`}
              >
                <CrisisLevelBadge level={lvl} />
                <span className="text-xs text-muted-foreground pr-1">({levelCounts[lvl]})</span>
              </button>
            );
          })}
        </div>
      )}

      <Tabs value={filter} onValueChange={setFilter} className="w-full">
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="all">{t.allChannels}</TabsTrigger>
          <TabsTrigger value="twitter">X</TabsTrigger>
          <TabsTrigger value="instagram">Instagram</TabsTrigger>
          <TabsTrigger value="tiktok">TikTok</TabsTrigger>
          <TabsTrigger value="facebook">Facebook</TabsTrigger>
        </TabsList>
      </Tabs>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">{t.loadingMentions}</div>
      ) : !filtered.length ? (
        <Card className="p-10 text-center">
          <p className="text-muted-foreground mb-4">{t.empty}</p>
          <Button onClick={runMonitorNow} disabled={monitorRunning}>
            {monitorRunning ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} {t.runMonitorNow}
          </Button>
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
                      {m.is_verified && <Badge variant="secondary" className="text-[10px]">{t.verified}</Badge>}
                      {m.is_influencer && <Badge variant="secondary" className="text-[10px]">{t.influencer}</Badge>}
                      <span className="text-xs text-muted-foreground">· {meta.label}</span>
                      {(m.posted_at || m.created_at) && (
                        <span
                          className="text-xs text-muted-foreground"
                          title={abs(m.posted_at ?? m.created_at) ?? undefined}
                        >
                          {t.posted(rel(m.posted_at ?? m.created_at) ?? "")}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-foreground mt-2 whitespace-pre-wrap break-words">{m.content}</p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground flex-wrap">
                      <span>♥ {m.likes?.toLocaleString(intl)}</span>
                      <span>↻ {m.shares?.toLocaleString(intl)}</span>
                      <span>👁 {t.reach((m.reach ?? 0).toLocaleString(intl))}</span>
                    </div>

                    {m.ai_summary && (
                      <div className="mt-3 p-3 rounded-md border border-border bg-muted/40 space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Sparkles className="h-3.5 w-3.5 text-primary" />
                          <span className="text-xs font-semibold text-foreground">{t.analysis}</span>
                          {m.ai_risk && <RiskBadge level={m.ai_risk as any} />}
                          {m.status !== "dismissed" && (m.ai_risk || m.ai_risk_score != null) && (
                            <CrisisLevelBadge level={mentionCrisisLevel(m)} compact />
                          )}
                          {m.ai_incident_type && <Badge variant="outline" className="text-[10px]">{incidentTypeLabel(m.ai_incident_type)}</Badge>}
                          {m.ai_sub_type && <Badge variant="outline" className="text-[10px]">{humanizeSubType(m.ai_sub_type, lang)}</Badge>}
                          {m.ai_risk_score != null && <span className="text-xs text-muted-foreground">{t.score(m.ai_risk_score)}</span>}
                          {m.updated_at && (
                            <span
                              className="text-xs text-muted-foreground sm:ml-auto"
                              title={abs(m.updated_at) ?? undefined}
                            >
                              {t.analyzed(rel(m.updated_at) ?? "")}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground break-words">{tr.text(m, "ai_summary")}</p>
                      </div>
                    )}
                  </div>
                  </div>
                  <div className="flex flex-row sm:flex-col items-start sm:items-end gap-2 shrink-0 flex-wrap w-full sm:w-auto">
                    {m.status === "pending" && !m.incident_id && (
                      <Button size="sm" onClick={() => analyzeOne(m)} disabled={isAnalyzing}>
                        {isAnalyzing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                        {t.analyze}
                      </Button>
                    )}
                    {m.status === "analyzing" && (
                      <Badge variant="secondary"><Loader2 className="h-3 w-3 animate-spin" /> {t.analyzing}</Badge>
                    )}
                    {m.incident_id && (
                      <>
                        <Button size="sm" variant="outline" onClick={() => navigate(`/incidents/${m.incident_id}`)}>
                          <AlertTriangle className="h-3.5 w-3.5" /> {t.viewIncident}
                        </Button>
                        {m.status === "incident_created" && (
                          approvedIds.has(m.incident_id) ? (
                            <Badge className="gap-1 bg-risk-low-bg text-risk-low border-0">
                              <CheckCircle2 className="h-3 w-3" /> {t.approved}
                            </Badge>
                          ) : (
                            <Button size="sm" onClick={() => approveIncident(m.incident_id!)}>
                              <CheckCircle2 className="h-3.5 w-3.5" /> {t.approve}
                            </Button>
                          )
                        )}
                        {incidentMentionCounts[m.incident_id] > 1 && (
                          <Badge variant="secondary" className="text-[10px]">
                            {t.mentionsOnIncident(incidentMentionCounts[m.incident_id])}
                          </Badge>
                        )}
                        {m.status === "linked_to_incident" && (
                          <Badge variant="outline" className="text-[10px]">{t.deduped}</Badge>
                        )}
                      </>
                    )}
                    {m.status === "dismissed" && (
                      <Badge variant="outline" className="gap-1"><CheckCircle2 className="h-3 w-3" /> {t.noiseBadge}</Badge>
                    )}
                    {m.post_url && (
                      <a href={m.post_url} target="_blank" rel="noreferrer" className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
                        {t.source} <ExternalLink className="h-3 w-3" />
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
