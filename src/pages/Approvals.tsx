import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { SendEmailDialog } from "@/components/SendEmailDialog";
import { PublishSocialDialog } from "@/components/PublishSocialDialog";
import { isEmailAsset, isSocialAsset, socialNetworkLabel } from "@/lib/distribution";
import { CheckCircle2, XCircle, FileText, Copy, Loader2, ExternalLink, Megaphone, MessageSquare, Users, HelpCircle, RefreshCw, LayoutDashboard, X, Filter, Mail, Send } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { TimeRangeFilter, ALL_TIME, isInRange, type TimeRange } from "@/components/TimeRangeFilter";

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
  const [timeRange, setTimeRange] = useState<TimeRange>(ALL_TIME);

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
        .select("id, title, risk")
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

    // Auto-open the relevant distribution dialog after approval
    if (status === "approved") {
      const asset = assets.find((a) => a.id === id);
      if (asset) {
        if (isEmailAsset(asset.asset_type)) {
          setEmailDialogAsset(asset);
        } else if (isSocialAsset(asset.asset_type)) {
          setSocialDialogAsset(asset);
        }
      }
    }
  };

  const copy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
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

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
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
                <div className="space-y-3">
                  {items.map((item) => {
                    const Icon = TYPE_ICON[item.asset_type] ?? FileText;
                    const isPending = item.approval_status === "pending";
                    const isRejected = item.approval_status === "rejected";
                    const isRegenerating = regeneratingId === item.id;
                    return (
                      <Card
                        key={item.id}
                        className={cn(
                          "p-4",
                          item.approval_status === "approved" && "border-risk-low/40",
                          item.approval_status === "rejected" && "border-risk-critical/40",
                        )}
                      >
                        <div className="flex items-start gap-3">
                          <div className="h-9 w-9 rounded-md bg-muted flex items-center justify-center shrink-0 text-muted-foreground">
                            <Icon className="h-4 w-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-semibold text-foreground">{item.title}</span>
                              {item.channel && (
                                <Badge variant="secondary" className="text-[10px]">{item.channel}</Badge>
                              )}
                              {!isPending && (
                                <Badge
                                  className={cn(
                                    "text-[10px] border-0",
                                    item.approval_status === "approved"
                                      ? "bg-risk-low-bg text-risk-low"
                                      : "bg-risk-critical-bg text-risk-critical",
                                  )}
                                >
                                  {item.approval_status}
                                </Badge>
                              )}
                            </div>
                            <pre className="text-sm text-muted-foreground leading-relaxed mt-2 whitespace-pre-wrap font-sans">
                              {item.content}
                            </pre>
                            <div className="flex items-center gap-2 mt-3 flex-wrap">
                              <Button size="sm" variant="outline" onClick={() => copy(item.content)}>
                                <Copy className="h-3.5 w-3.5" /> Copy
                              </Button>
                              {isPending && (
                                <>
                                  <Button
                                    size="sm"
                                    onClick={() => updateStatus(item.id, "approved")}
                                    disabled={busyId === item.id}
                                  >
                                    {busyId === item.id ? (
                                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    ) : (
                                      <CheckCircle2 className="h-3.5 w-3.5" />
                                    )}
                                    Approve
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => updateStatus(item.id, "rejected")}
                                    disabled={busyId === item.id}
                                  >
                                    <XCircle className="h-3.5 w-3.5" /> Reject
                                  </Button>
                                </>
                              )}
                              {item.approval_status === "approved" && isEmailAsset(item.asset_type) && (
                                <Button
                                  size="sm"
                                  onClick={() => setEmailDialogAsset(item)}
                                >
                                  <Mail className="h-3.5 w-3.5" /> Send email
                                </Button>
                              )}
                              {item.approval_status === "approved" && isSocialAsset(item.asset_type) && (
                                <Button
                                  size="sm"
                                  onClick={() => setSocialDialogAsset(item)}
                                >
                                  <Send className="h-3.5 w-3.5" /> Publish to {socialNetworkLabel(item.asset_type)}
                                </Button>
                              )}
                              {(isPending || isRejected) && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => regenerateAsset(item)}
                                  disabled={isRegenerating}
                                >
                                  {isRegenerating ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  ) : (
                                    <RefreshCw className="h-3.5 w-3.5" />
                                  )}
                                  Regenerate
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>
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
    </div>
  );
}
