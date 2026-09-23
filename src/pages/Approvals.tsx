import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { SendEmailDialog } from "@/components/SendEmailDialog";
import { AssetComments } from "@/components/AssetComments";
import { PublishSocialDialog } from "@/components/PublishSocialDialog";
import { isEmailAsset, isSocialAsset, socialNetworkLabel } from "@/lib/distribution";
import { profileFor } from "@/lib/industries";
import { CheckCircle2, XCircle, FileText, Copy, Loader2, ExternalLink, Megaphone, MessageSquare, Users, HelpCircle, RefreshCw, LayoutDashboard, X, Filter, Mail, Send, ChevronDown, Film, Building2, Briefcase, Newspaper, Headphones, Pencil, MessageCircle, Lock, Upload, Sparkles, Image as ImageIcon, Video } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { TimeRangeFilter, ALL_TIME, isInRangeOrUnfinished, type TimeRange } from "@/components/TimeRangeFilter";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useIntlLocale, useLang, useMessages } from "@/i18n";
import { useTranslations } from "@/i18n/useTranslations";
import { commonMessages } from "@/i18n/messages/common";
import { approvalsMessages } from "@/i18n/messages/approvals";

type Asset = {
  id: string;
  incident_id: string;
  asset_type: string;
  channel: string | null;
  title: string;
  content: string;
  approval_status: string;
  approved_at: string | null;
  created_at: string;
  media_url: string | null;
  media_type: string | null;
  media_source: string | null;
  language: string | null;
};

type IncidentLite = {
  id: string;
  title: string;
  risk: string;
  crisis_level: number | null;
  translations: unknown;
};

const CRISIS_LEVEL_META: Record<number, { className: string }> = {
  0: { className: "bg-risk-low-bg text-risk-low" },
  1: { className: "bg-risk-low-bg text-risk-low" },
  2: { className: "bg-risk-medium-bg text-risk-medium" },
  3: { className: "bg-risk-high-bg text-risk-high" },
  4: { className: "bg-risk-critical-bg text-risk-critical" },
};

const TYPE_ICON: Record<string, typeof FileText> = {
  press_release: Megaphone,
  holding_statement: Megaphone,
  post_x: MessageSquare,
  post_instagram: MessageSquare,
  post_facebook: MessageSquare,
  tiktok_script: MessageSquare,
  internal_memo: Users,
  customer_faq: HelpCircle,
};

type TabKey = "press" | "internal" | "social" | "scripts" | "qna" | "customers";

// Labels live in approvalsMessages, keyed by `key` / `type`.
const TAB_DEFS: Array<{ key: TabKey; icon: typeof FileText; types: string[] }> = [
  { key: "press", icon: Megaphone, types: ["press_release", "holding_statement"] },
  { key: "internal", icon: Users, types: ["internal_memo"] },
  { key: "social", icon: MessageSquare, types: ["post_x", "post_instagram", "post_facebook"] },
  { key: "scripts", icon: Film, types: ["tiktok_script"] },
  { key: "qna", icon: HelpCircle, types: ["faq_media", "faq_employees", "faq_authorities", "faq_partners"] },
  { key: "customers", icon: Headphones, types: ["customer_faq"] },
];

const QNA_AUDIENCES: Array<{ type: string; icon: typeof FileText }> = [
  { type: "faq_media", icon: Newspaper },
  { type: "faq_employees", icon: Users },
  { type: "faq_authorities", icon: Building2 },
  { type: "faq_partners", icon: Briefcase },
];

function tabFor(assetType: string): TabKey | "other" {
  for (const def of TAB_DEFS) {
    if (def.types.includes(assetType)) return def.key;
  }
  return "other";
}

/**
 * How long an unapproved communication has been sitting.
 *
 * Deliberately blunt past an hour: "waiting 3 h" is a different sentence from
 * "waiting 47 min", and a crisis team reading a list of twelve drafts needs
 * the one that has gone stale to look different, not to be computed.
 */
function WaitingFor({ since, label }: { since: string; label: (human: string) => string }) {
  const minutes = Math.floor((Date.now() - new Date(since).getTime()) / 60_000);
  if (minutes < 15) return null;
  const human = minutes < 60 ? `${minutes} min` : `${Math.floor(minutes / 60)} h`;
  const stale = minutes >= 60;
  return (
    <Badge
      variant="outline"
      className={`text-[10px] ${stale ? "border-risk-medium/50 text-risk-medium" : "text-muted-foreground"}`}
    >
      {label(human)}
    </Badge>
  );
}

export default function Approvals() {
  const [searchParams, setSearchParams] = useSearchParams();
  const focusIncidentId = searchParams.get("incident");
  const [assets, setAssets] = useState<Asset[]>([]);
  const [incidents, setIncidents] = useState<Record<string, IncidentLite>>({});
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [busyPackage, setBusyPackage] = useState<string | null>(null);
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null);
  const [tab, setTab] = useState<"pending" | "user_approved" | "approved" | "rejected">("pending");
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [emailDialogAsset, setEmailDialogAsset] = useState<Asset | null>(null);
  const [socialDialogAsset, setSocialDialogAsset] = useState<Asset | null>(null);
  const [postApproveAsset, setPostApproveAsset] = useState<Asset | null>(null);
  const [editAsset, setEditAsset] = useState<Asset | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [editResetToPending, setEditResetToPending] = useState(true);
  const [savingEdit, setSavingEdit] = useState(false);
  const [savingNewVersion, setSavingNewVersion] = useState(false);
  const [timeRange, setTimeRange] = useState<TimeRange>(ALL_TIME);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [isAdmin, setIsAdmin] = useState(false);
  const [mediaBusyId, setMediaBusyId] = useState<string | null>(null);
  const [showPromptFor, setShowPromptFor] = useState<Set<string>>(new Set());
  const [promptDraft, setPromptDraft] = useState<Record<string, string>>({});
  const [industry, setIndustry] = useState<string | null>(null);
  const mediaInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const t = useMessages(approvalsMessages);
  const common = useMessages(commonMessages);
  const { lang } = useLang();
  const intl = useIntlLocale();
  const when = (iso: string) => new Date(iso).toLocaleString(intl);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userData.user.id);
      if (!cancelled) {
        setIsAdmin((roles ?? []).some((r: { role: string }) => r.role === "admin"));
      }
      // The suggested image prompt names the industry, so it has to come from
      // the workspace rather than being assumed.
      const { data: settings } = await supabase
        .from("company_settings")
        .select("industry")
        .maybeSingle();
      if (!cancelled) setIndustry(settings?.industry ?? null);
    })();
    return () => {
      cancelled = true;
    };
  }, []);
  const toggleExpanded = (id: string) =>
    setExpandedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const load = async () => {
    setLoading(true);
    const { data: assetData, error } = await supabase
      .from("incident_assets")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    const list = (assetData ?? []) as Asset[];
    setAssets(list);

    const ids = Array.from(new Set(list.map((a) => a.incident_id)));
    if (ids.length) {
      const { data: incData } = await supabase
        .from("incidents")
        .select("id, title, risk, crisis_level, translations")
        .in("id", ids);
      const map: Record<string, IncidentLite> = {};
      (incData ?? []).forEach((i: any) => (map[i.id] = i));
      setIncidents(map);
    } else {
      setIncidents({});
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
    const channel = supabase
      .channel("incident_assets_realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "incident_assets" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  // When arriving with ?incident=<id>, switch to the tab where that incident has assets
  useEffect(() => {
    if (!focusIncidentId || loading || !assets.length) return;
    const incidentAssets = assets.filter((a) => a.incident_id === focusIncidentId);
    if (!incidentAssets.length) return;
    const order: Array<"pending" | "user_approved" | "approved" | "rejected"> = ["pending", "user_approved", "approved", "rejected"];
    const best = order.find((s) => incidentAssets.some((a) => a.approval_status === s));
    if (best) setTab(best);
  }, [focusIncidentId, loading, assets]);

  // Scroll + highlight after the section mounts in the active tab
  useEffect(() => {
    if (!focusIncidentId || loading) return;
    const el = sectionRefs.current[focusIncidentId];
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "start" });
    setHighlightId(focusIncidentId);
    const timer = window.setTimeout(() => setHighlightId(null), 2000);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusIncidentId, tab, loading]);

  /**
   * Approving a package: the same two steps as a single asset, applied to every
   * asset a person is looking at. One press release approved and eleven left
   * pending is the state a crisis team gets stuck in.
   */
  const updatePackage = async (items: Asset[], status: "user_approved" | "approved") => {
    if (!items.length) return;
    setBusyPackage(items[0].incident_id);
    const { data: userData } = await supabase.auth.getUser();
    const isFinal = status === "approved";
    const { data, error } = await supabase
      .from("incident_assets")
      .update({
        approval_status: status,
        approved_at: isFinal ? new Date().toISOString() : null,
        approved_by: isFinal ? userData.user?.id ?? null : null,
      })
      .in("id", items.map((a) => a.id))
      .select("id");
    setBusyPackage(null);
    if (error) return toast.error(error.message);
    // RLS refuses without an error, so report what actually changed.
    const n = data?.length ?? 0;
    if (!n) return toast.error(common.somethingWrong);
    toast.success(isFinal ? t.packageApproved(n) : t.packageSentToAdmin(n));
  };

  const updateStatus = async (
    id: string,
    status: "user_approved" | "approved" | "rejected",
  ) => {
    setBusyId(id);
    const { data: userData } = await supabase.auth.getUser();
    const isFinal = status === "approved";
    const { error } = await supabase
      .from("incident_assets")
      .update({
        approval_status: status,
        approved_at: isFinal ? new Date().toISOString() : null,
        approved_by: isFinal ? userData.user?.id ?? null : null,
      })
      .eq("id", id);
    setBusyId(null);
    if (error) return toast.error(error.message);
    toast.success(t.statusToast[status]);

    // Only after the final admin approval prompt for distribution
    if (status === "approved") {
      const asset = assets.find((a) => a.id === id);
      if (asset) setPostApproveAsset(asset);
    }
  };

  const copy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success(t.copied);
  };

  const shareOnWhatsApp = (item: Asset) => {
    const text = `${item.title}\n\n${item.content}`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
  };

  const regenerateAsset = async (asset: Asset) => {
    setRegeneratingId(asset.id);
    const { data, error } = await supabase.functions.invoke("generate-incident-assets", {
      // Regenerated in the language it was written in, not the viewer's.
      body: { incident_id: asset.incident_id, asset_key: asset.asset_type, lang: asset.language ?? lang },
    });
    setRegeneratingId(null);
    if (error || !data?.success) {
      return toast.error(error?.message ?? t.regenerateFailed);
    }
    toast.success(t.regenerated(asset.title));
    setTab("pending");
  };

  // Deliberately not photo-realistic. This image accompanies a crisis
  // statement, and a synthetic photo of the event reads to an audience as
  // documentation of it — which turns one crisis into two. A branded graphic
  // carries the message without pretending to be evidence.
  const suggestedImagePrompt = (asset: Asset) =>
    `Clean, professional branded graphic for a ${profileFor(industry).simFlavor} operator's ` +
    `social media post. No photo-realistic depiction of people, vehicles or the incident ` +
    `itself. Message: ${asset.content.replace(/\s+/g, " ").trim().slice(0, 200)}`;

  const uploadMedia = async (asset: Asset, file: File) => {
    const isVideo = asset.asset_type === "tiktok_script";
    const maxMb = isVideo ? 100 : 10;
    if (file.size > maxMb * 1024 * 1024) {
      return toast.error(t.fileTooLarge(maxMb));
    }
    setMediaBusyId(asset.id);
    const ext = file.name.split(".").pop() || (isVideo ? "mp4" : "jpg");
    const path = `${asset.id}-upload-${Date.now()}.${ext}`;
    const { error: uploadErr } = await supabase.storage.from("asset-media").upload(path, file, { upsert: true });
    if (uploadErr) {
      setMediaBusyId(null);
      return toast.error(uploadErr.message);
    }
    const { data: pub } = supabase.storage.from("asset-media").getPublicUrl(path);
    const { error } = await supabase
      .from("incident_assets")
      .update({ media_url: pub.publicUrl, media_type: isVideo ? "video" : "image", media_source: "upload" })
      .eq("id", asset.id);
    setMediaBusyId(null);
    if (error) return toast.error(error.message);
    toast.success(t.mediaAttached);
  };

  const generateAssetImage = async (asset: Asset) => {
    const prompt = (promptDraft[asset.id] ?? suggestedImagePrompt(asset)).trim();
    if (!prompt) return toast.error(t.enterPrompt);
    setMediaBusyId(asset.id);
    const { data, error } = await supabase.functions.invoke("generate-asset-image", {
      body: { asset_id: asset.id, prompt },
    });
    setMediaBusyId(null);
    if (error || !data?.success) {
      return toast.error(data?.error ?? error?.message ?? t.imageFailed);
    }
    toast.success(t.imageGenerated);
    setShowPromptFor((s) => {
      const next = new Set(s);
      next.delete(asset.id);
      return next;
    });
  };

  const openEdit = (asset: Asset) => {
    setEditAsset(asset);
    setEditTitle(asset.title);
    setEditContent(asset.content);
    setEditResetToPending(asset.approval_status === "approved");
  };

  const saveEdit = async () => {
    if (!editAsset) return;
    const title = editTitle.trim();
    const content = editContent.trim();
    if (!title || !content) {
      return toast.error(t.titleContentRequired);
    }
    setSavingEdit(true);
    const updates: {
      title: string;
      content: string;
      approval_status?: string;
      approved_at?: string | null;
      approved_by?: string | null;
    } = { title, content };
    if (editResetToPending) {
      updates.approval_status = "pending";
      updates.approved_at = null;
      updates.approved_by = null;
    }
    const { error } = await supabase
      .from("incident_assets")
      .update(updates)
      .eq("id", editAsset.id);
    setSavingEdit(false);
    if (error) return toast.error(error.message);
    toast.success(t.assetUpdated);
    if (editResetToPending) setTab("pending");
    setEditAsset(null);
  };

  const stripVersionSuffix = (s: string) => s.replace(/\s+·\s+v\d+$/i, "").trim();

  const saveAsNewVersion = async () => {
    if (!editAsset) return;
    const title = editTitle.trim();
    const content = editContent.trim();
    if (!title || !content) {
      return toast.error(t.titleContentRequired);
    }
    setSavingNewVersion(true);
    const baseTitle = stripVersionSuffix(title);
    const { count } = await supabase
      .from("incident_assets")
      .select("id", { count: "exact", head: true })
      .eq("incident_id", editAsset.incident_id)
      .eq("asset_type", editAsset.asset_type);
    const nextVersion = (count ?? 1) + 1;
    const versionedTitle = `${baseTitle} · v${nextVersion}`;
    const { data: userData } = await supabase.auth.getUser();
    const { error } = await supabase.from("incident_assets").insert({
      incident_id: editAsset.incident_id,
      asset_type: editAsset.asset_type,
      channel: editAsset.channel,
      title: versionedTitle,
      content,
      language: editAsset.language,
      approval_status: "pending",
      created_by: userData.user?.id ?? null,
    });
    setSavingNewVersion(false);
    if (error) return toast.error(error.message);
    toast.success(t.savedAs(versionedTitle));
    setTab("pending");
    setEditAsset(null);
  };




  const baseScoped = focusIncidentId ? assets.filter((a) => a.incident_id === focusIncidentId) : assets;
  // A communication waiting on somebody is not filtered out by a calendar.
  // Only what has been approved or rejected is old news.
  const scoped = baseScoped.filter((a) =>
    isInRangeOrUnfinished(
      a.created_at,
      timeRange,
      a.approval_status !== "approved" && a.approval_status !== "rejected",
    ));
  const filtered = scoped.filter((a) => a.approval_status === tab);

  // Group by incident
  const grouped = filtered.reduce<Record<string, Asset[]>>((acc, a) => {
    (acc[a.incident_id] ??= []).push(a);
    return acc;
  }, {});

  const counts = {
    pending: scoped.filter((a) => a.approval_status === "pending").length,
    user_approved: scoped.filter((a) => a.approval_status === "user_approved").length,
    approved: scoped.filter((a) => a.approval_status === "approved").length,
    rejected: scoped.filter((a) => a.approval_status === "rejected").length,
  };

  const focusIncident = focusIncidentId ? incidents[focusIncidentId] : null;
  const tr = useTranslations("incidents", Object.keys(grouped).map((id) => incidents[id]).concat(focusIncident ? [focusIncident] : []));
  const incTitle = (inc: IncidentLite | null | undefined) => (inc ? tr.text(inc, "title") : "");
  const focusRef = focusIncidentId ? `INC-${focusIncidentId.slice(0, 8).toUpperCase()}` : null;
  const focusPkgRef = focusIncidentId ? `PKG-${focusIncidentId.slice(0, 8).toUpperCase()}` : null;

  const clearIncidentFilter = () => {
    const next = new URLSearchParams(searchParams);
    next.delete("incident");
    setSearchParams(next, { replace: true });
  };

  const renderAssetRow = (item: Asset) => {
    const Icon = TYPE_ICON[item.asset_type] ?? FileText;
    const isPending = item.approval_status === "pending";
    const isUserApproved = item.approval_status === "user_approved";
    const isApproved = item.approval_status === "approved";
    const isRejected = item.approval_status === "rejected";
    const isAwaitingAdmin = isUserApproved;
    const isRegenerating = regeneratingId === item.id;
    const isExpanded = expandedIds.has(item.id);
    const isBusy = busyId === item.id;
    const preview = item.content.replace(/\s+/g, " ").trim();
    return (
      <Card
        key={item.id}
        className={cn(
          "group overflow-hidden transition-colors",
          isPending && "hover:border-primary/40",
          isApproved && "border-risk-low/40",
          isRejected && "border-risk-critical/40",
        )}
      >
        <button
          type="button"
          onClick={() => toggleExpanded(item.id)}
          className="w-full text-left flex items-center gap-3 p-3 hover:bg-muted/30 transition-colors"
        >
          <div className="h-9 w-9 rounded-md bg-muted flex items-center justify-center shrink-0 text-muted-foreground">
            <Icon className="h-4 w-4" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold text-foreground truncate">{item.title}</span>
              {item.language && (
                <span title={common.writtenIn[item.language]} className="rounded border border-border px-1 text-[10px] font-medium uppercase text-muted-foreground">
                  {item.language}
                </span>
              )}
              {item.channel && (
                <Badge variant="secondary" className="text-[10px]">{item.channel}</Badge>
              )}
              {isUserApproved && (
                <Badge className="text-[10px] border-0 bg-risk-medium-bg text-risk-medium">{t.awaitingAdmin}</Badge>
              )}
              {isApproved && (
                <Badge className="text-[10px] border-0 bg-risk-low-bg text-risk-low">{t.approvedBadge}</Badge>
              )}
              {isRejected && (
                <Badge className="text-[10px] border-0 bg-risk-critical-bg text-risk-critical">{t.rejectedBadge}</Badge>
              )}
              {/* How long this has been waiting. The number the escalation
                  sweep acts on, shown before it acts, so a team can see a
                  package going stale rather than be told about it by email. */}
              {!isApproved && !isRejected && <WaitingFor since={item.created_at} label={t.waiting} />}
            </div>
            {!isExpanded ? (
              <p className="text-xs text-muted-foreground truncate mt-0.5">
                <span className="text-muted-foreground/70">{when(item.created_at)}</span>
                {" · "}{preview}
              </p>
            ) : (
              <p className="text-[11px] text-muted-foreground/70 mt-0.5">
                {t.created(when(item.created_at))}
              </p>
            )}
          </div>
          {isPending && (
            <div className="hidden sm:flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
              <Button
                size="sm"
                onClick={() => updateStatus(item.id, "user_approved")}
                disabled={isBusy}
              >
                {isBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                {t.approveAndSend}
              </Button>
            </div>
          )}
          {isUserApproved && isAdmin && (
            <div className="hidden sm:flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
              <Button
                size="sm"
                variant="ghost"
                className="h-8 px-2 text-risk-critical hover:text-risk-critical hover:bg-risk-critical-bg"
                onClick={() => updateStatus(item.id, "rejected")}
                disabled={isBusy}
              >
                <XCircle className="h-3.5 w-3.5" /> {t.reject}
              </Button>
              <Button size="sm" onClick={() => updateStatus(item.id, "approved")} disabled={isBusy}>
                {isBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                {t.finalApprove}
              </Button>
            </div>
          )}
          {isUserApproved && !isAdmin && (
            <span className="hidden sm:inline-flex items-center gap-1 text-[10px] text-muted-foreground shrink-0">
              <Lock className="h-3 w-3" /> {t.awaitingAdminShort}
            </span>
          )}
          <ChevronDown
            className={cn(
              "h-4 w-4 text-muted-foreground shrink-0 transition-transform",
              isExpanded && "rotate-180",
            )}
          />
        </button>

        {isExpanded && (
          <div className="px-3 pb-3 pt-0 border-t border-border/50">
            <pre className="text-sm text-muted-foreground leading-relaxed mt-3 whitespace-pre-wrap font-sans">
              {item.content}
            </pre>

            {(item.asset_type === "post_instagram" || item.asset_type === "tiktok_script") && (
              <div className="mt-3 rounded-md border p-3 bg-muted/20 space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  {item.asset_type === "tiktok_script" ? (
                    <Video className="h-3.5 w-3.5" />
                  ) : (
                    <ImageIcon className="h-3.5 w-3.5" />
                  )}
                  {item.asset_type === "tiktok_script" ? t.video : t.image}
                </div>

                {item.media_url ? (
                  <div className="space-y-2">
                    {item.media_type === "video" ? (
                      <video src={item.media_url} controls className="max-h-48 rounded-md border" />
                    ) : (
                      <img src={item.media_url} alt="" className="max-h-48 rounded-md border object-contain" />
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={mediaBusyId === item.id}
                      onClick={() => mediaInputRefs.current[item.id]?.click()}
                    >
                      {mediaBusyId === item.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Upload className="h-3.5 w-3.5" />
                      )}
                      {t.replace}
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={mediaBusyId === item.id}
                        onClick={() => mediaInputRefs.current[item.id]?.click()}
                      >
                        {mediaBusyId === item.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Upload className="h-3.5 w-3.5" />
                        )}
                        {item.asset_type === "tiktok_script" ? t.uploadVideo : t.uploadImage}
                      </Button>
                      {item.asset_type === "post_instagram" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            setShowPromptFor((s) => {
                              const next = new Set(s);
                              next.add(item.id);
                              return next;
                            })
                          }
                        >
                          <Sparkles className="h-3.5 w-3.5" /> {t.generateWithAI}
                        </Button>
                      )}
                    </div>
                    {showPromptFor.has(item.id) && (
                      <div className="space-y-2">
                        <Textarea
                          value={promptDraft[item.id] ?? suggestedImagePrompt(item)}
                          onChange={(e) => setPromptDraft((d) => ({ ...d, [item.id]: e.target.value }))}
                          className="text-xs"
                          rows={3}
                        />
                        <Button
                          size="sm"
                          disabled={mediaBusyId === item.id}
                          onClick={() => generateAssetImage(item)}
                        >
                          {mediaBusyId === item.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Sparkles className="h-3.5 w-3.5" />
                          )}
                          {t.generate}
                        </Button>
                      </div>
                    )}
                  </div>
                )}

                <input
                  type="file"
                  ref={(el) => (mediaInputRefs.current[item.id] = el)}
                  accept={item.asset_type === "tiktok_script" ? "video/*" : "image/*"}
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    e.currentTarget.value = "";
                    if (file) void uploadMedia(item, file);
                  }}
                />
              </div>
            )}

            <div className="flex items-center gap-2 mt-3 flex-wrap">
              <Button size="sm" variant="outline" onClick={() => copy(item.content)}>
                <Copy className="h-3.5 w-3.5" /> {t.copy}
              </Button>
              <Button size="sm" variant="outline" onClick={() => openEdit(item)}>
                <Pencil className="h-3.5 w-3.5" /> {t.edit}
              </Button>
              {isPending && (
                <Button size="sm" onClick={() => updateStatus(item.id, "user_approved")} disabled={isBusy}>
                  {isBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                  {t.approveAndSend}
                </Button>
              )}
              {isUserApproved && isAdmin && (
                <>
                  <Button size="sm" onClick={() => updateStatus(item.id, "approved")} disabled={isBusy}>
                    {isBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                    {t.finalApprove}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => updateStatus(item.id, "rejected")} disabled={isBusy}>
                    <XCircle className="h-3.5 w-3.5" /> {t.reject}
                  </Button>
                </>
              )}
              {isUserApproved && !isAdmin && (
                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                  <Lock className="h-3 w-3" /> {t.awaitingAdminApproval}
                </span>
              )}
              {isApproved && isEmailAsset(item.asset_type) && (
                <>
                  <Button size="sm" onClick={() => setEmailDialogAsset(item)}>
                    <Mail className="h-3.5 w-3.5" /> {t.sendEmail}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => shareOnWhatsApp(item)}>
                    <MessageCircle className="h-3.5 w-3.5" /> {t.shareWhatsApp}
                  </Button>
                </>
              )}
              {isApproved && isSocialAsset(item.asset_type) && (
                <>
                  <Button size="sm" onClick={() => setSocialDialogAsset(item)}>
                    <Send className="h-3.5 w-3.5" /> {t.publishTo(socialNetworkLabel(item.asset_type))}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => shareOnWhatsApp(item)}>
                    <MessageCircle className="h-3.5 w-3.5" /> {t.shareWhatsApp}
                  </Button>
                </>
              )}
              {(isPending || isUserApproved || isRejected) && (
                <Button size="sm" variant="outline" onClick={() => regenerateAsset(item)} disabled={isRegenerating}>
                  {isRegenerating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                  {t.regenerate}
                </Button>
              )}
            </div>
            <AssetComments
              assetId={item.id}
              isAdmin={isAdmin}
              canApprove={isAdmin && (isPending || isUserApproved)}
              onApprove={() => updateStatus(item.id, "approved")}
              onReject={() => updateStatus(item.id, "rejected")}
            />
          </div>
        )}
      </Card>
    );
  };

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6">
      <Breadcrumbs
        items={
          focusIncidentId
            ? [
                { label: t.dashboard, to: "/dashboard", icon: LayoutDashboard },
                { label: `${focusRef} · ${incTitle(focusIncident) || t.incident}`, to: `/incidents/${focusIncidentId}` },
                { label: `${focusPkgRef} · ${t.mediaPackage}` },
              ]
            : [
                { label: t.dashboard, to: "/dashboard", icon: LayoutDashboard },
                { label: t.approvals },
              ]
        }
      />

      <div>
        <h1 className="text-xl font-semibold text-foreground inline-flex items-center gap-2 flex-wrap">
          {focusIncidentId ? (
            <>
              <span>{t.mediaPackage}</span>
              <Badge variant="outline" className="font-mono text-[10px] tracking-wider border-primary/40 text-primary">
                {focusPkgRef}
              </Badge>
            </>
          ) : (
            t.workflowTitle
          )}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {focusIncidentId ? (
            <>
              {t.assetsGeneratedFor}{" "}
              <span className="font-mono text-foreground">{focusRef}</span>
              {focusIncident ? <> · {incTitle(focusIncident)}</> : null}.
            </>
          ) : (
            t.workflowIntro
          )}
        </p>
      </div>

      <TimeRangeFilter value={timeRange} onChange={setTimeRange} />

      {focusIncidentId && (
        <div className="flex items-center gap-2 flex-wrap rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-xs">
          <Filter className="h-3.5 w-3.5 text-primary" />
          <span className="text-muted-foreground">{t.filteredTo}</span>
          <Badge variant="outline" className="font-mono text-[10px] tracking-wider border-primary/40 text-primary">
            {focusRef}
          </Badge>
          <span className="text-foreground font-medium truncate max-w-[280px]">
            {incTitle(focusIncident) || focusIncidentId.slice(0, 8)}
          </span>
          <Link
            to={`/incidents/${focusIncidentId}`}
            state={{ from: `/approvals?incident=${focusIncidentId}`, fromLabel: t.mediaPackage }}
            className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
          >
            {t.viewIncidentLower} <ExternalLink className="h-3 w-3" />
          </Link>
          <Button
            size="sm"
            variant="ghost"
            className="h-6 px-2 ml-auto text-xs"
            onClick={clearIncidentFilter}
          >
            <X className="h-3 w-3" /> {t.showAll}
          </Button>
        </div>
      )}

      <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
        <TabsList>
          <TabsTrigger value="pending">{t.tabPending(counts.pending)}</TabsTrigger>
          <TabsTrigger value="user_approved">{t.tabAwaiting(counts.user_approved)}</TabsTrigger>
          <TabsTrigger value="approved">{t.tabApproved(counts.approved)}</TabsTrigger>
          <TabsTrigger value="rejected">{t.tabRejected(counts.rejected)}</TabsTrigger>
        </TabsList>
      </Tabs>

      {loading ? (
        <div className="text-center py-10 text-muted-foreground">{common.loading}</div>
      ) : !filtered.length ? (
        <Card className="p-10 text-center text-sm text-muted-foreground">
          {t.empty}
        </Card>
      ) : (
        <div className="space-y-8">
          {Object.entries(grouped).map(([incidentId, items]) => {
            const inc = incidents[incidentId];
            return (
              <div
                key={incidentId}
                ref={(el) => { sectionRefs.current[incidentId] = el; }}
                className={cn(
                  "space-y-3 rounded-lg transition-all duration-500 scroll-mt-6",
                  highlightId === incidentId && "ring-2 ring-primary ring-offset-2 ring-offset-background p-3 -m-3 bg-primary/5",
                )}
              >
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className="font-mono text-[10px] tracking-wider border-primary/40 text-primary">
                    PKG-{incidentId.slice(0, 8).toUpperCase()}
                  </Badge>
                  <span className="text-[10px] text-muted-foreground">{t.for}</span>
                  <Badge variant="outline" className="font-mono text-[10px] tracking-wider">
                    INC-{incidentId.slice(0, 8).toUpperCase()}
                  </Badge>
                  <h2 className="text-sm font-semibold text-foreground">
                    {incTitle(inc) || t.incident}
                  </h2>
                  {typeof inc?.crisis_level === "number" && CRISIS_LEVEL_META[inc.crisis_level] && (
                    <Badge className={`text-[10px] border-0 ${CRISIS_LEVEL_META[inc.crisis_level].className}`}>
                      {common.level[inc.crisis_level]}
                    </Badge>
                  )}
                  {inc?.risk && (
                    <Badge variant="outline" className="text-[10px] uppercase">{common.risk[inc.risk] ?? inc.risk}</Badge>
                  )}
                  {tab === "pending" && (
                    <Button
                      size="sm"
                      className="ml-auto h-7 text-xs"
                      disabled={busyPackage === incidentId}
                      onClick={() => updatePackage(items, "user_approved")}
                    >
                      {busyPackage === incidentId
                        ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        : <CheckCircle2 className="h-3.5 w-3.5" />}
                      {t.approveWholePackage(items.length)}
                    </Button>
                  )}
                  {tab === "user_approved" && isAdmin && (
                    <Button
                      size="sm"
                      className="ml-auto h-7 text-xs"
                      disabled={busyPackage === incidentId}
                      onClick={() => updatePackage(items, "approved")}
                    >
                      {busyPackage === incidentId
                        ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        : <CheckCircle2 className="h-3.5 w-3.5" />}
                      {t.finalApproveWholePackage(items.length)}
                    </Button>
                  )}
                  <Link
                    to={`/incidents/${incidentId}`}
                    state={{ from: `/approvals?incident=${incidentId}`, fromLabel: t.mediaPackage }}
                    className={cn(
                      "text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1",
                      tab === "pending" || (tab === "user_approved" && isAdmin) ? "" : "ml-auto",
                    )}
                  >
                    {t.viewIncident} <ExternalLink className="h-3 w-3" />
                  </Link>
                </div>
                {(() => {
                  const byTab = items.reduce<Record<string, Asset[]>>((acc, a) => {
                    const k = tabFor(a.asset_type);
                    (acc[k] ??= []).push(a);
                    return acc;
                  }, {});
                  const firstWithItems = TAB_DEFS.find((def) => byTab[def.key]?.length)?.key ?? TAB_DEFS[0].key;
                  return (
                    <Tabs defaultValue={firstWithItems} className="w-full">
                      <div className="-mx-1 overflow-x-auto sm:mx-0 sm:overflow-visible">
                        <TabsList className="flex w-max sm:w-full flex-nowrap sm:flex-wrap h-auto justify-start gap-1 bg-muted/40 px-1">
                          {TAB_DEFS.map((def) => {
                            const TIcon = def.icon;
                            const count = byTab[def.key]?.length ?? 0;
                            return (
                              <TabsTrigger key={def.key} value={def.key} className="gap-1.5 shrink-0 data-[state=active]:bg-background">
                                <TIcon className="h-3.5 w-3.5" />
                                <span>{t.tabs[def.key]}</span>
                                <span className="text-[10px] text-muted-foreground">({count})</span>
                              </TabsTrigger>
                            );
                          })}
                        </TabsList>
                      </div>

                      {TAB_DEFS.map((def) => {
                        const tabItems = byTab[def.key] ?? [];
                        return (
                          <TabsContent key={def.key} value={def.key} className="mt-3">
                            {tabItems.length === 0 ? (
                              <Card className="p-6 text-center text-xs text-muted-foreground border-dashed">
                                {t.noneOfType(t.tabs[def.key])}
                              </Card>
                            ) : def.key === "qna" ? (
                              <div className="space-y-4">
                                {QNA_AUDIENCES.map((aud) => {
                                  const audItems = tabItems.filter((i) => i.asset_type === aud.type);
                                  if (!audItems.length) return null;
                                  const AIcon = aud.icon;
                                  return (
                                    <div key={aud.type} className="space-y-2">
                                      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                        <AIcon className="h-3.5 w-3.5" />
                                        <span>{t.audiences[aud.type]}</span>
                                        <span className="text-muted-foreground/60 normal-case font-normal">({audItems.length})</span>
                                      </div>
                                      <div className="space-y-3">{audItems.map(renderAssetRow)}</div>
                                    </div>
                                  );
                                })}
                              </div>
                            ) : (
                              <div className="space-y-3">{tabItems.map(renderAssetRow)}</div>
                            )}
                          </TabsContent>
                        );
                      })}
                    </Tabs>
                  );
                })()}
              </div>
            );
          })}
        </div>
      )}

      <SendEmailDialog
        open={!!emailDialogAsset}
        onOpenChange={(v) => !v && setEmailDialogAsset(null)}
        asset={emailDialogAsset}
      />
      <PublishSocialDialog
        open={!!socialDialogAsset}
        onOpenChange={(v) => !v && setSocialDialogAsset(null)}
        asset={socialDialogAsset}
      />

      <Dialog open={!!postApproveAsset} onOpenChange={(v) => !v && setPostApproveAsset(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-risk-low" /> {t.assetApproved}
            </DialogTitle>
            <DialogDescription>
              {t.howDistribute} <span className="font-medium text-foreground">{postApproveAsset?.title}</span>?
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            {postApproveAsset && isEmailAsset(postApproveAsset.asset_type) && (
              <Button
                onClick={() => {
                  setEmailDialogAsset(postApproveAsset);
                  setPostApproveAsset(null);
                }}
              >
                <Mail className="h-4 w-4" /> {t.sendByEmail}
              </Button>
            )}
            {postApproveAsset && isSocialAsset(postApproveAsset.asset_type) && (
              <Button
                onClick={() => {
                  setSocialDialogAsset(postApproveAsset);
                  setPostApproveAsset(null);
                }}
              >
                <Send className="h-4 w-4" /> {t.publishTo(socialNetworkLabel(postApproveAsset.asset_type))}
              </Button>
            )}
            <Button
              variant="outline"
              onClick={() => {
                if (postApproveAsset) shareOnWhatsApp(postApproveAsset);
                setPostApproveAsset(null);
              }}
            >
              <MessageCircle className="h-4 w-4" /> {t.shareWhatsApp}
            </Button>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setPostApproveAsset(null)}>
              {t.skip}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>


      <Dialog open={!!editAsset} onOpenChange={(v) => !v && setEditAsset(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t.updateAsset}</DialogTitle>
            <DialogDescription>
              {t.updateIntro}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-asset-title">{t.title}</Label>
              <Input
                id="edit-asset-title"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-asset-content">{t.content}</Label>
              <Textarea
                id="edit-asset-content"
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="min-h-[280px] font-sans text-sm"
              />
            </div>
            {editAsset?.approval_status === "approved" && (
              <div className="flex items-start gap-2 rounded-md border border-border bg-muted/30 p-3">
                <Checkbox
                  id="edit-reset-pending"
                  checked={editResetToPending}
                  onCheckedChange={(v) => setEditResetToPending(v === true)}
                />
                <Label htmlFor="edit-reset-pending" className="text-xs font-normal leading-relaxed cursor-pointer">
                  {t.resetToPending}
                </Label>
              </div>
            )}
          </div>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => setEditAsset(null)} disabled={savingEdit || savingNewVersion}>
              {common.cancel}
            </Button>
            <Button variant="outline" onClick={saveEdit} disabled={savingEdit || savingNewVersion}>
              {savingEdit ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
              {t.saveChanges}
            </Button>
            <Button onClick={saveAsNewVersion} disabled={savingEdit || savingNewVersion}>
              {savingNewVersion ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
              {t.saveNewVersion}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
