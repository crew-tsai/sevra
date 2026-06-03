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
import { CheckCircle2, XCircle, FileText, Copy, Loader2, ExternalLink, Megaphone, MessageSquare, Users, HelpCircle, RefreshCw, LayoutDashboard, X, Filter, Mail, Send, ChevronDown, Film, Building2, Briefcase, Newspaper, Headphones, Pencil, MessageCircle, Lock } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { TimeRangeFilter, DEFAULT_TIME_RANGE, isInRange, type TimeRange } from "@/components/TimeRangeFilter";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

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
};

type IncidentLite = {
  id: string;
  title: string;
  risk: string;
  crisis_level: number | null;
};

const CRISIS_LEVEL_META: Record<number, { label: string; className: string }> = {
  0: { label: "L0 · Routine", className: "bg-risk-low-bg text-risk-low" },
  1: { label: "L1 · Localized", className: "bg-risk-low-bg text-risk-low" },
  2: { label: "L2 · Significant", className: "bg-risk-medium-bg text-risk-medium" },
  3: { label: "L3 · Major", className: "bg-risk-high-bg text-risk-high" },
  4: { label: "L4 · Catastrophic", className: "bg-risk-critical-bg text-risk-critical" },
};

const TYPE_ICON: Record<string, typeof FileText> = {
  press_release: Megaphone,
  holding_statement: Megaphone,
  post_x: MessageSquare,
  post_instagram: MessageSquare,
  tiktok_script: MessageSquare,
  internal_memo: Users,
  customer_faq: HelpCircle,
};

type TabKey = "press" | "internal" | "social" | "scripts" | "qna" | "customers";

const TAB_DEFS: Array<{ key: TabKey; label: string; icon: typeof FileText; types: string[] }> = [
  { key: "press", label: "Press", icon: Megaphone, types: ["press_release", "holding_statement"] },
  { key: "internal", label: "Internal Releases", icon: Users, types: ["internal_memo"] },
  { key: "social", label: "Social", icon: MessageSquare, types: ["post_x", "post_instagram"] },
  { key: "scripts", label: "Scripts", icon: Film, types: ["tiktok_script"] },
  { key: "qna", label: "Q&As", icon: HelpCircle, types: ["faq_media", "faq_employees", "faq_authorities", "faq_partners"] },
  { key: "customers", label: "Customers", icon: Headphones, types: ["customer_faq"] },
];

const QNA_AUDIENCES: Array<{ type: string; label: string; icon: typeof FileText }> = [
  { type: "faq_media", label: "Media", icon: Newspaper },
  { type: "faq_employees", label: "Employees", icon: Users },
  { type: "faq_authorities", label: "Authorities", icon: Building2 },
  { type: "faq_partners", label: "Partners", icon: Briefcase },
];

function tabFor(assetType: string): TabKey | "other" {
  for (const t of TAB_DEFS) {
    if (t.types.includes(assetType)) return t.key;
  }
  return "other";
}

export default function Approvals() {
  const [searchParams, setSearchParams] = useSearchParams();
  const focusIncidentId = searchParams.get("incident");
  const [assets, setAssets] = useState<Asset[]>([]);
  const [incidents, setIncidents] = useState<Record<string, IncidentLite>>({});
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null);
  const [tab, setTab] = useState<"pending" | "approved" | "rejected">("pending");
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
  const [timeRange, setTimeRange] = useState<TimeRange>(DEFAULT_TIME_RANGE);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [isAdmin, setIsAdmin] = useState(false);

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
        .select("id, title, risk, crisis_level")
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
    const order: Array<"pending" | "approved" | "rejected"> = ["pending", "approved", "rejected"];
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
    const t = window.setTimeout(() => setHighlightId(null), 2000);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusIncidentId, tab, loading]);

  const updateStatus = async (id: string, status: "approved" | "rejected") => {
    setBusyId(id);
    const { data: userData } = await supabase.auth.getUser();
    const { error } = await supabase
      .from("incident_assets")
      .update({
        approval_status: status,
        approved_at: status === "approved" ? new Date().toISOString() : null,
        approved_by: status === "approved" ? userData.user?.id ?? null : null,
      })
      .eq("id", id);
    setBusyId(null);
    if (error) return toast.error(error.message);
    toast.success(`Asset ${status}`);

    // After approval, prompt the user to choose a distribution channel
    if (status === "approved") {
      const asset = assets.find((a) => a.id === id);
      if (asset) setPostApproveAsset(asset);
    }
  };

  const copy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  const shareOnWhatsApp = (item: Asset) => {
    const text = `${item.title}\n\n${item.content}`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
  };

  const regenerateAsset = async (asset: Asset) => {
    setRegeneratingId(asset.id);
    const { data, error } = await supabase.functions.invoke("generate-incident-assets", {
      body: { incident_id: asset.incident_id, asset_key: asset.asset_type },
    });
    setRegeneratingId(null);
    if (error || !data?.success) {
      return toast.error(error?.message ?? "Failed to regenerate asset");
    }
    toast.success(`${asset.title} regenerated`);
    setTab("pending");
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
      return toast.error("Title and content are required");
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
    toast.success("Asset updated");
    if (editResetToPending) setTab("pending");
    setEditAsset(null);
  };

  const stripVersionSuffix = (t: string) => t.replace(/\s+·\s+v\d+$/i, "").trim();

  const saveAsNewVersion = async () => {
    if (!editAsset) return;
    const title = editTitle.trim();
    const content = editContent.trim();
    if (!title || !content) {
      return toast.error("Title and content are required");
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
      approval_status: "pending",
      created_by: userData.user?.id ?? null,
    });
    setSavingNewVersion(false);
    if (error) return toast.error(error.message);
    toast.success(`Saved as ${versionedTitle}`);
    setTab("pending");
    setEditAsset(null);
  };




  const baseScoped = focusIncidentId ? assets.filter((a) => a.incident_id === focusIncidentId) : assets;
  const scoped = baseScoped.filter((a) => isInRange(a.created_at, timeRange));
  const filtered = scoped.filter((a) => a.approval_status === tab);

  // Group by incident
  const grouped = filtered.reduce<Record<string, Asset[]>>((acc, a) => {
    (acc[a.incident_id] ??= []).push(a);
    return acc;
  }, {});

  const counts = {
    pending: scoped.filter((a) => a.approval_status === "pending").length,
    approved: scoped.filter((a) => a.approval_status === "approved").length,
    rejected: scoped.filter((a) => a.approval_status === "rejected").length,
  };

  const focusIncident = focusIncidentId ? incidents[focusIncidentId] : null;
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
    const isApproved = item.approval_status === "approved";
    const isRejected = item.approval_status === "rejected";
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
              {item.channel && (
                <Badge variant="secondary" className="text-[10px]">{item.channel}</Badge>
              )}
              {isApproved && (
                <Badge className="text-[10px] border-0 bg-risk-low-bg text-risk-low">approved</Badge>
              )}
              {isRejected && (
                <Badge className="text-[10px] border-0 bg-risk-critical-bg text-risk-critical">rejected</Badge>
              )}
            </div>
            {!isExpanded ? (
              <p className="text-xs text-muted-foreground truncate mt-0.5">
                <span className="text-muted-foreground/70">{new Date(item.created_at).toLocaleString()}</span>
                {" · "}{preview}
              </p>
            ) : (
              <p className="text-[11px] text-muted-foreground/70 mt-0.5">
                Created {new Date(item.created_at).toLocaleString()}
              </p>
            )}
          </div>
          {isPending && isAdmin && (
            <div className="hidden sm:flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
              <Button
                size="sm"
                variant="ghost"
                className="h-8 px-2 text-risk-critical hover:text-risk-critical hover:bg-risk-critical-bg"
                onClick={() => updateStatus(item.id, "rejected")}
                disabled={isBusy}
              >
                <XCircle className="h-3.5 w-3.5" /> Reject
              </Button>
              <Button
                size="sm"
                onClick={() => updateStatus(item.id, "approved")}
                disabled={isBusy}
              >
                {isBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                Approve
              </Button>
            </div>
          )}
          {isPending && !isAdmin && (
            <span className="hidden sm:inline-flex items-center gap-1 text-[10px] text-muted-foreground shrink-0">
              <Lock className="h-3 w-3" /> Admin approval required
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
            <div className="flex items-center gap-2 mt-3 flex-wrap">
              <Button size="sm" variant="outline" onClick={() => copy(item.content)}>
                <Copy className="h-3.5 w-3.5" /> Copy
              </Button>
              <Button size="sm" variant="outline" onClick={() => openEdit(item)}>
                <Pencil className="h-3.5 w-3.5" /> Edit
              </Button>
              {isPending && isAdmin && (
                <>
                  <Button size="sm" onClick={() => updateStatus(item.id, "approved")} disabled={isBusy}>
                    {isBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                    Approve
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => updateStatus(item.id, "rejected")} disabled={isBusy}>
                    <XCircle className="h-3.5 w-3.5" /> Reject
                  </Button>
                </>
              )}
              {isPending && !isAdmin && (
                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                  <Lock className="h-3 w-3" /> Approval reserved to admins
                </span>
              )}
              {isApproved && isEmailAsset(item.asset_type) && (
                <>
                  <Button size="sm" onClick={() => setEmailDialogAsset(item)}>
                    <Mail className="h-3.5 w-3.5" /> Send email
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => shareOnWhatsApp(item)}>
                    <MessageCircle className="h-3.5 w-3.5" /> Share on WhatsApp
                  </Button>
                </>
              )}
              {isApproved && isSocialAsset(item.asset_type) && (
                <>
                  <Button size="sm" onClick={() => setSocialDialogAsset(item)}>
                    <Send className="h-3.5 w-3.5" /> Publish to {socialNetworkLabel(item.asset_type)}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => shareOnWhatsApp(item)}>
                    <MessageCircle className="h-3.5 w-3.5" /> Share on WhatsApp
                  </Button>
                </>
              )}
              {(isPending || isRejected) && (
                <Button size="sm" variant="outline" onClick={() => regenerateAsset(item)} disabled={isRegenerating}>
                  {isRegenerating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                  Regenerate
                </Button>
              )}
            </div>
            <AssetComments assetId={item.id} isAdmin={isAdmin} />
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
                { label: "Dashboard", to: "/dashboard", icon: LayoutDashboard },
                { label: `${focusRef} · ${focusIncident?.title ?? "Incident"}`, to: `/incidents/${focusIncidentId}` },
                { label: `${focusPkgRef} · Media package` },
              ]
            : [
                { label: "Dashboard", to: "/dashboard", icon: LayoutDashboard },
                { label: "Approvals" },
              ]
        }
      />

      <div>
        <h1 className="text-xl font-semibold text-foreground inline-flex items-center gap-2 flex-wrap">
          {focusIncidentId ? (
            <>
              <span>Media package</span>
              <Badge variant="outline" className="font-mono text-[10px] tracking-wider border-primary/40 text-primary">
                {focusPkgRef}
              </Badge>
            </>
          ) : (
            "Approval workflow"
          )}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {focusIncidentId ? (
            <>
              Assets generated for{" "}
              <span className="font-mono text-foreground">{focusRef}</span>
              {focusIncident?.title ? <> · {focusIncident.title}</> : null}.
            </>
          ) : (
            "Review and approve communication assets before distribution."
          )}
        </p>
      </div>

      <TimeRangeFilter value={timeRange} onChange={setTimeRange} />

      {focusIncidentId && (
        <div className="flex items-center gap-2 flex-wrap rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-xs">
          <Filter className="h-3.5 w-3.5 text-primary" />
          <span className="text-muted-foreground">Filtered to:</span>
          <Badge variant="outline" className="font-mono text-[10px] tracking-wider border-primary/40 text-primary">
            {focusRef}
          </Badge>
          <span className="text-foreground font-medium truncate max-w-[280px]">
            {focusIncident?.title ?? focusIncidentId.slice(0, 8)}
          </span>
          <Link
            to={`/incidents/${focusIncidentId}`}
            state={{ from: `/approvals?incident=${focusIncidentId}`, fromLabel: "Media package" }}
            className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
          >
            view incident <ExternalLink className="h-3 w-3" />
          </Link>
          <Button
            size="sm"
            variant="ghost"
            className="h-6 px-2 ml-auto text-xs"
            onClick={clearIncidentFilter}
          >
            <X className="h-3 w-3" /> Show all
          </Button>
        </div>
      )}

      <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
        <TabsList>
          <TabsTrigger value="pending">Pending ({counts.pending})</TabsTrigger>
          <TabsTrigger value="approved">Approved ({counts.approved})</TabsTrigger>
          <TabsTrigger value="rejected">Rejected ({counts.rejected})</TabsTrigger>
        </TabsList>
      </Tabs>

      {loading ? (
        <div className="text-center py-10 text-muted-foreground">Loading…</div>
      ) : !filtered.length ? (
        <Card className="p-10 text-center text-sm text-muted-foreground">
          No assets in this state. Approve an incident from SEVRA to generate a package.
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
                  <span className="text-[10px] text-muted-foreground">for</span>
                  <Badge variant="outline" className="font-mono text-[10px] tracking-wider">
                    INC-{incidentId.slice(0, 8).toUpperCase()}
                  </Badge>
                  <h2 className="text-sm font-semibold text-foreground">
                    {inc?.title ?? "Incident"}
                  </h2>
                  {typeof inc?.crisis_level === "number" && CRISIS_LEVEL_META[inc.crisis_level] && (
                    <Badge className={`text-[10px] border-0 ${CRISIS_LEVEL_META[inc.crisis_level].className}`}>
                      {CRISIS_LEVEL_META[inc.crisis_level].label}
                    </Badge>
                  )}
                  {inc?.risk && (
                    <Badge variant="outline" className="text-[10px] uppercase">{inc.risk}</Badge>
                  )}
                  <Link
                    to={`/incidents/${incidentId}`}
                    state={{ from: `/approvals?incident=${incidentId}`, fromLabel: "Media package" }}
                    className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 ml-auto"
                  >
                    View incident <ExternalLink className="h-3 w-3" />
                  </Link>
                </div>
                {(() => {
                  const byTab = items.reduce<Record<string, Asset[]>>((acc, a) => {
                    const k = tabFor(a.asset_type);
                    (acc[k] ??= []).push(a);
                    return acc;
                  }, {});
                  const firstWithItems = TAB_DEFS.find((t) => byTab[t.key]?.length)?.key ?? TAB_DEFS[0].key;
                  return (
                    <Tabs defaultValue={firstWithItems} className="w-full">
                      <div className="-mx-1 overflow-x-auto sm:mx-0 sm:overflow-visible">
                        <TabsList className="flex w-max sm:w-full flex-nowrap sm:flex-wrap h-auto justify-start gap-1 bg-muted/40 px-1">
                          {TAB_DEFS.map((t) => {
                            const TIcon = t.icon;
                            const count = byTab[t.key]?.length ?? 0;
                            return (
                              <TabsTrigger key={t.key} value={t.key} className="gap-1.5 shrink-0 data-[state=active]:bg-background">
                                <TIcon className="h-3.5 w-3.5" />
                                <span>{t.label}</span>
                                <span className="text-[10px] text-muted-foreground">({count})</span>
                              </TabsTrigger>
                            );
                          })}
                        </TabsList>
                      </div>

                      {TAB_DEFS.map((t) => {
                        const tabItems = byTab[t.key] ?? [];
                        return (
                          <TabsContent key={t.key} value={t.key} className="mt-3">
                            {tabItems.length === 0 ? (
                              <Card className="p-6 text-center text-xs text-muted-foreground border-dashed">
                                No {t.label.toLowerCase()} assets for this incident yet.
                              </Card>
                            ) : t.key === "qna" ? (
                              <div className="space-y-4">
                                {QNA_AUDIENCES.map((aud) => {
                                  const audItems = tabItems.filter((i) => i.asset_type === aud.type);
                                  if (!audItems.length) return null;
                                  const AIcon = aud.icon;
                                  return (
                                    <div key={aud.type} className="space-y-2">
                                      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                        <AIcon className="h-3.5 w-3.5" />
                                        <span>{aud.label}</span>
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
              <CheckCircle2 className="h-5 w-5 text-risk-low" /> Asset approved
            </DialogTitle>
            <DialogDescription>
              How would you like to distribute <span className="font-medium text-foreground">{postApproveAsset?.title}</span>?
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
                <Mail className="h-4 w-4" /> Send by email
              </Button>
            )}
            {postApproveAsset && isSocialAsset(postApproveAsset.asset_type) && (
              <Button
                onClick={() => {
                  setSocialDialogAsset(postApproveAsset);
                  setPostApproveAsset(null);
                }}
              >
                <Send className="h-4 w-4" /> Publish to {socialNetworkLabel(postApproveAsset.asset_type)}
              </Button>
            )}
            <Button
              variant="outline"
              onClick={() => {
                if (postApproveAsset) shareOnWhatsApp(postApproveAsset);
                setPostApproveAsset(null);
              }}
            >
              <MessageCircle className="h-4 w-4" /> Share on WhatsApp
            </Button>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setPostApproveAsset(null)}>
              Skip for now
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>


      <Dialog open={!!editAsset} onOpenChange={(v) => !v && setEditAsset(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Update asset</DialogTitle>
            <DialogDescription>
              Edit the title and content. Saving creates a new version of this asset.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-asset-title">Title</Label>
              <Input
                id="edit-asset-title"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-asset-content">Content</Label>
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
                  Send back to pending for re-approval before redeploying. Recommended when content changes
                  meaningfully (e.g. updated facts in a press release).
                </Label>
              </div>
            )}
          </div>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => setEditAsset(null)} disabled={savingEdit || savingNewVersion}>
              Cancel
            </Button>
            <Button variant="outline" onClick={saveEdit} disabled={savingEdit || savingNewVersion}>
              {savingEdit ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
              Save changes
            </Button>
            <Button onClick={saveAsNewVersion} disabled={savingEdit || savingNewVersion}>
              {savingNewVersion ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
              Save as new version
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
