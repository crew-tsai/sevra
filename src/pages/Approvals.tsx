import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle2, XCircle, FileText, Copy, Loader2, ExternalLink, Megaphone, MessageSquare, Users, HelpCircle, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

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
  const [assets, setAssets] = useState<Asset[]>([]);
  const [incidents, setIncidents] = useState<Record<string, IncidentLite>>({});
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null);
  const [tab, setTab] = useState<"pending" | "approved" | "rejected">("pending");

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
  };

  const copy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  const filtered = assets.filter((a) => a.approval_status === tab);

  // Group by incident
  const grouped = filtered.reduce<Record<string, Asset[]>>((acc, a) => {
    (acc[a.incident_id] ??= []).push(a);
    return acc;
  }, {});

  const counts = {
    pending: assets.filter((a) => a.approval_status === "pending").length,
    approved: assets.filter((a) => a.approval_status === "approved").length,
    rejected: assets.filter((a) => a.approval_status === "rejected").length,
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Approval workflow</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Review and approve communication assets before distribution.
        </p>
      </div>

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
              <div key={incidentId} className="space-y-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-sm font-semibold text-foreground">
                    {inc?.title ?? "Incident"}
                  </h2>
                  {inc?.risk && (
                    <Badge variant="outline" className="text-[10px] uppercase">{inc.risk}</Badge>
                  )}
                  <Link
                    to={`/incidents/${incidentId}`}
                    className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 ml-auto"
                  >
                    View incident <ExternalLink className="h-3 w-3" />
                  </Link>
                </div>
                <div className="space-y-3">
                  {items.map((item) => {
                    const Icon = TYPE_ICON[item.asset_type] ?? FileText;
                    const isPending = item.approval_status === "pending";
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
    </div>
  );
}
