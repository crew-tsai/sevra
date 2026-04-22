import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Twitter, Instagram, Music2, RefreshCw, Sparkles, ExternalLink, AlertTriangle, CheckCircle2, Loader2, Radio } from "lucide-react";
import { toast } from "sonner";
import { RiskBadge } from "@/components/RiskBadge";

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
};

const MOCK_FEED = [
  // 🇪🇸 Spanish
  {
    channel: "twitter",
    author_name: "Carla Méndez",
    author_handle: "carlamendez",
    content: "Llevamos 4 horas en pista en MAD vuelo IB3412 a BCN sin información. Hay una señora mayor descompensada y nadie del crew responde 😡 @iberia",
    likes: 1240, shares: 320, reach: 84000, is_verified: false, is_influencer: false,
  },
  {
    channel: "instagram",
    author_name: "Sara López",
    author_handle: "saralopez",
    content: "Discriminación clarísima en el embarque de hoy MAD-LIM. A mi amiga le impidieron subir por su silla de ruedas diciendo 'no entra'. Inaceptable.",
    likes: 2300, shares: 880, reach: 67000, is_verified: false, is_influencer: true,
  },
  {
    channel: "tiktok",
    author_name: "Pedro G.",
    author_handle: "pedrogfly",
    content: "App de la aerolínea caída desde esta mañana, no se puede hacer check-in online ni ver tarjetas de embarque. Colas enormes en T4.",
    likes: 980, shares: 210, reach: 45000, is_verified: false, is_influencer: false,
  },

  // 🇬🇧 English
  {
    channel: "tiktok",
    author_name: "TravelWithMike",
    author_handle: "travelwithmike",
    content: "VIRAL: extreme turbulence on Madrid–Bogotá flight, people screaming, oxygen masks dropped. This should never happen.",
    likes: 58000, shares: 12000, reach: 1200000, is_verified: true, is_influencer: true,
  },
  {
    channel: "twitter",
    author_name: "Aviation Watch",
    author_handle: "aviationwatch",
    content: "UNCONFIRMED rumor circulating about an emergency landing at BCN. NO official confirmation from AENA or the airline. Be careful before resharing.",
    likes: 8900, shares: 4200, reach: 320000, is_verified: true, is_influencer: false,
  },
  {
    channel: "instagram",
    author_name: "Diego R.",
    author_handle: "diegor.fly",
    content: "Third day with no luggage after flying BCN-LHR. Baggage system reportedly down per the desk staff. This is chaos.",
    likes: 410, shares: 45, reach: 9800, is_verified: false, is_influencer: false,
  },

  // 🇫🇷 French
  {
    channel: "twitter",
    author_name: "Julien Bernard",
    author_handle: "julienbrnd",
    content: "Vol AF1234 CDG-MAD annulé sans explication, 200 passagers bloqués au terminal 2E depuis 6h. Aucun agent au comptoir. C'est honteux !",
    likes: 3200, shares: 1100, reach: 145000, is_verified: false, is_influencer: false,
  },
  {
    channel: "instagram",
    author_name: "Camille Dubois",
    author_handle: "camille.voyage",
    content: "Atterrissage d'urgence à Lyon ce matin, fumée en cabine. Tout le monde évacué par les toboggans. Merci à l'équipage incroyable 🙏",
    likes: 15600, shares: 4800, reach: 420000, is_verified: true, is_influencer: true,
  },
  {
    channel: "tiktok",
    author_name: "Lucas M.",
    author_handle: "lucasmfly",
    content: "Le personnel de bord a refusé d'embarquer ma mère car elle parlait arabe au téléphone. Inacceptable, je porte plainte.",
    likes: 22000, shares: 6500, reach: 580000, is_verified: false, is_influencer: false,
  },
];

export default function Sevra() {
  const navigate = useNavigate();
  const [mentions, setMentions] = useState<Mention[]>([]);
  const [loading, setLoading] = useState(true);
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);
  const [filter, setFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "incident_created" | "dismissed" | "linked_to_incident">("all");
  const [approvedIds, setApprovedIds] = useState<Set<string>>(new Set());

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

  const filtered = mentions.filter(
    (m) =>
      (filter === "all" || m.channel === filter) &&
      (statusFilter === "all" || m.status === statusFilter),
  );

  const incidentMentionCounts = mentions.reduce<Record<string, number>>((acc, m) => {
    if (m.incident_id) acc[m.incident_id] = (acc[m.incident_id] ?? 0) + 1;
    return acc;
  }, {});

  const stats = {
    pending: mentions.filter((m) => m.status === "pending").length,
    incidents: mentions.filter((m) => m.status === "incident_created").length,
    linked: mentions.filter((m) => m.status === "linked_to_incident").length,
    dismissed: mentions.filter((m) => m.status === "dismissed").length,
  };

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2">
            <Radio className="h-5 w-5 text-primary" />
            <h1 className="text-2xl font-bold text-foreground">SEVRA · Social Intel</h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Live ingest from airline social channels. AI classifies, scores, and auto-creates incidents.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={seedMocks}>
            <RefreshCw className="h-4 w-4" /> Pull new mentions
          </Button>
          <Button onClick={analyzeAllPending} disabled={!stats.pending}>
            <Sparkles className="h-4 w-4" /> Analyze all ({stats.pending})
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {([
          { key: "pending", label: "Pending", value: stats.pending, color: "text-foreground" },
          { key: "incident_created", label: "Incidents created", value: stats.incidents, color: "text-primary" },
          { key: "linked_to_incident", label: "Linked (deduped)", value: stats.linked, color: "text-accent-foreground" },
          { key: "dismissed", label: "Dismissed (noise)", value: stats.dismissed, color: "text-muted-foreground" },
        ] as const).map((s) => {
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

      <Tabs value={filter} onValueChange={setFilter}>
        <TabsList>
          <TabsTrigger value="all">All channels</TabsTrigger>
          <TabsTrigger value="twitter">X</TabsTrigger>
          <TabsTrigger value="instagram">Instagram</TabsTrigger>
          <TabsTrigger value="tiktok">TikTok</TabsTrigger>
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
              <Card key={m.id} className="p-4">
                <div className="flex items-start gap-3">
                  <div className={`h-10 w-10 rounded-full bg-muted flex items-center justify-center shrink-0 ${meta.color}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-foreground">{m.author_name}</span>
                      <span className="text-sm text-muted-foreground">@{m.author_handle}</span>
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
                    <p className="text-sm text-foreground mt-2 whitespace-pre-wrap">{m.content}</p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
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
                              className="text-xs text-muted-foreground ml-auto"
                              title={formatDateTime(m.updated_at) ?? undefined}
                            >
                              analyzed {formatRelative(m.updated_at)}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">{m.ai_summary}</p>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-2 shrink-0">
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
