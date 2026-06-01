import { useEffect, useState } from "react";
import { useNavigate, useParams, Link, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RiskBadge } from "@/components/RiskBadge";
import { CrisisLevelBadge } from "@/components/CrisisLevelBadge";
import { StatusBadge } from "@/components/StatusBadge";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import {
  ArrowLeft,
  CheckCircle2,
  Loader2,
  Sparkles,
  ExternalLink,
  Twitter,
  Instagram,
  Music2,
  Plane,
  MapPin,
  Users,
  AlertTriangle,
  ShieldAlert,
  Package,
  LayoutDashboard,
  Lightbulb,
} from "lucide-react";
import { toast } from "sonner";

type Incident = {
  id: string;
  title: string;
  description: string | null;
  incident_type: string;
  sub_type: string | null;
  airline_name: string | null;
  flight_number: string | null;
  route: string | null;
  airport_code: string | null;
  country: string | null;
  injury_fatality: boolean;
  regulator_involved: boolean;
  estimated_passengers_impacted: number | null;
  is_public: boolean;
  influencer_media_involved: boolean;
  source: string;
  risk: "critical" | "high" | "medium" | "low";
  status: "active" | "monitoring" | "contained" | "resolved";
  risk_score: number;
  crisis_level: number | null;
  assignee: string | null;
  approval_status: string;
  approved_at: string | null;
  approved_by: string | null;
  created_at: string;
  updated_at: string;
};

type Mention = {
  id: string;
  channel: string;
  author_name: string | null;
  author_handle: string | null;
  content: string;
  post_url: string | null;
  posted_at: string | null;
  ai_summary: string | null;
  ai_risk: string | null;
  is_verified: boolean | null;
  is_influencer: boolean | null;
};

const CHANNEL_ICON: Record<string, typeof Twitter> = {
  twitter: Twitter,
  instagram: Instagram,
  tiktok: Music2,
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

export default function IncidentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const navState = (location.state ?? null) as { from?: string; fromLabel?: string } | null;
  const backTo = navState?.from ?? null;
  const backLabel = navState?.fromLabel ?? "Back";
  const [incident, setIncident] = useState<Incident | null>(null);
  const [mentions, setMentions] = useState<Mention[]>([]);
  const [assetCount, setAssetCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState(false);
  const [rejecting, setRejecting] = useState(false);

  const load = async () => {
    if (!id) return;
    setLoading(true);
    const [{ data: inc, error: incErr }, { data: mens, error: menErr }, { count, error: cntErr }] = await Promise.all([
      supabase.from("incidents").select("*").eq("id", id).maybeSingle(),
      supabase
        .from("social_mentions")
        .select("id, channel, author_name, author_handle, content, post_url, posted_at, ai_summary, ai_risk, is_verified, is_influencer")
        .eq("incident_id", id)
        .order("posted_at", { ascending: false }),
      supabase
        .from("incident_assets")
        .select("id", { count: "exact", head: true })
        .eq("incident_id", id),
    ]);
    if (incErr) toast.error(incErr.message);
    if (menErr) toast.error(menErr.message);
    if (cntErr) toast.error(cntErr.message);
    setIncident((inc as Incident | null) ?? null);
    setMentions((mens ?? []) as Mention[]);
    setAssetCount(count ?? 0);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const approve = async () => {
    if (!incident) return;
    setApproving(true);
    const { data: userData } = await supabase.auth.getUser();
    const { error } = await supabase
      .from("incidents")
      .update({
        approval_status: "approved",
        approved_at: new Date().toISOString(),
        approved_by: userData.user?.id ?? null,
      })
      .eq("id", incident.id);
    if (error) {
      setApproving(false);
      return toast.error(error.message);
    }
    toast.success("Incident approved — generating asset package…");
    try {
      const { data, error: fnErr } = await supabase.functions.invoke("generate-incident-assets", {
        body: { incident_id: incident.id },
      });
      if (fnErr) throw fnErr;
      if (!data?.success) throw new Error(data?.error || "Failed to generate package");
      toast.success(`${data.count} assets generated — review them in Approvals`, {
        action: { label: "Open Approvals", onClick: () => navigate("/approvals") },
      });
      navigate("/approvals");
    } catch (e: any) {
      toast.error(e.message || "Asset generation failed");
      load();
    } finally {
      setApproving(false);
    }
  };

  const reject = async () => {
    if (!incident) return;
    setRejecting(true);
    const { error } = await supabase
      .from("incidents")
      .update({ approval_status: "rejected" })
      .eq("id", incident.id);
    setRejecting(false);
    if (error) return toast.error(error.message);
    toast.success("Incident rejected");
    load();
  };

  if (loading) {
    return (
      <div className="p-10 flex items-center justify-center text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin mr-2" /> Loading incident…
      </div>
    );
  }

  if (!incident) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <p className="text-muted-foreground">Incident not found.</p>
        <Link to="/sevra" className="text-primary text-sm mt-2 inline-block">← Back to SEVRA</Link>
      </div>
    );
  }

  const isApproved = incident.approval_status === "approved";
  const isRejected = incident.approval_status === "rejected";
  const incidentRef = `INC-${incident.id.slice(0, 8).toUpperCase()}`;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <Breadcrumbs
          items={[
            { label: "Dashboard", to: "/dashboard", icon: LayoutDashboard },
            ...(backTo
              ? [{ label: backTo.startsWith("/approvals") ? "Approvals" : "Incidents", to: backTo }]
              : [{ label: "Incidents", to: "/dashboard" }]),
            { label: `${incidentRef} · ${incident.title}` },
          ]}
        />
        <button
          onClick={() => (backTo ? navigate(backTo) : navigate(-1))}
          className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to {backLabel}
        </button>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="space-y-2 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className="font-mono text-[10px] tracking-wider border-primary/40 text-primary">
              {incidentRef}
            </Badge>
            <RiskBadge level={incident.risk} />
            <CrisisLevelBadge level={incident.crisis_level} />
            <StatusBadge status={incident.status} />
            <Badge variant="outline" className="text-[10px]">{incident.incident_type}</Badge>
            {incident.sub_type && <Badge variant="outline" className="text-[10px]">{incident.sub_type}</Badge>}
            {isApproved && (
              <Badge className="gap-1 bg-risk-low-bg text-risk-low border-0">
                <CheckCircle2 className="h-3 w-3" /> approved
              </Badge>
            )}
            {isRejected && (
              <Badge variant="outline" className="gap-1">
                <ShieldAlert className="h-3 w-3" /> rejected
              </Badge>
            )}
            {!isApproved && !isRejected && (
              <Badge variant="secondary" className="text-[10px]">pending review</Badge>
            )}
          </div>
          <h1 className="text-xl font-semibold text-foreground">{incident.title}</h1>
          <p className="text-xs text-muted-foreground">
            Created {formatDateTime(incident.created_at)} · Source: {incident.source}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2 shrink-0">
          <div className="text-right text-xs text-muted-foreground">
            Risk score <span className="text-foreground font-bold text-base ml-1">{incident.risk_score}/100</span>
          </div>
          {!isApproved && (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={reject} disabled={rejecting || approving}>
                {rejecting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ShieldAlert className="h-3.5 w-3.5" />}
                Reject
              </Button>
              <Button size="sm" onClick={approve} disabled={approving || rejecting}>
                {approving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                Approve incident
              </Button>
            </div>
          )}
          {isApproved && incident.approved_at && (
            <p className="text-xs text-muted-foreground">
              Approved {formatDateTime(incident.approved_at)}
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main */}
        <div className="lg:col-span-2 space-y-6">
          {incident.description && (
            <Card className="p-4">
              <h2 className="text-sm font-semibold text-foreground mb-2">Description</h2>
              <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                {incident.description}
              </p>
            </Card>
          )}

          <Card className="p-4 border-primary/30">
            <div className="flex items-center gap-2 mb-3">
              <Lightbulb className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-semibold text-foreground">Strategic recommendations</h2>
            </div>
            <p className="text-xs text-muted-foreground mb-3">
              Proactive next steps tailored to this incident's profile, risk level and operational context.
            </p>
            <ul className="space-y-2">
              {buildRecommendations(incident).map((rec, idx) => (
                <li key={idx} className="flex items-start gap-2 text-sm text-foreground">
                  <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                  <div>
                    <span className="font-medium">{rec.title}.</span>{" "}
                    <span className="text-muted-foreground">{rec.detail}</span>
                  </div>
                </li>
              ))}
            </ul>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-semibold text-foreground">
                Linked social mentions ({mentions.length})
              </h2>
            </div>
            {mentions.length === 0 ? (
              <p className="text-xs text-muted-foreground">No mentions linked to this incident.</p>
            ) : (
              <div className="space-y-3">
                {mentions.map((m) => {
                  const Icon = CHANNEL_ICON[m.channel] ?? Twitter;
                  return (
                    <div key={m.id} className="border border-border rounded-md p-3">
                      <div className="flex items-center gap-2 flex-wrap text-xs">
                        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="font-semibold text-foreground">{m.author_name}</span>
                        <span className="text-muted-foreground">@{m.author_handle}</span>
                        {m.is_verified && <Badge variant="secondary" className="text-[10px]">verified</Badge>}
                        {m.is_influencer && <Badge variant="secondary" className="text-[10px]">influencer</Badge>}
                        {m.ai_risk && <RiskBadge level={m.ai_risk as any} />}
                        {m.posted_at && (
                          <span className="text-muted-foreground ml-auto">
                            {formatDateTime(m.posted_at)}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-foreground mt-2 whitespace-pre-wrap">{m.content}</p>
                      {m.post_url && (
                        <a
                          href={m.post_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 mt-2"
                        >
                          source <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card className="p-4 space-y-3">
            <h2 className="text-sm font-semibold text-foreground">Operational details</h2>
            <DetailRow icon={Plane} label="Airline" value={incident.airline_name} />
            <DetailRow icon={Plane} label="Flight" value={incident.flight_number} />
            <DetailRow icon={MapPin} label="Route" value={incident.route} />
            <DetailRow icon={MapPin} label="Airport" value={incident.airport_code} />
            <DetailRow icon={MapPin} label="Country" value={incident.country} />
            <DetailRow
              icon={Users}
              label="Pax impacted"
              value={incident.estimated_passengers_impacted?.toLocaleString() ?? null}
            />
            <DetailRow
              icon={AlertTriangle}
              label="Injury / fatality"
              value={incident.injury_fatality ? "Yes" : "No"}
            />
            <DetailRow
              icon={ShieldAlert}
              label="Regulator involved"
              value={incident.regulator_involved ? "Yes" : "No"}
            />
            <DetailRow
              icon={Sparkles}
              label="Influencer media"
              value={incident.influencer_media_involved ? "Yes" : "No"}
            />
            <DetailRow icon={Users} label="Assignee" value={incident.assignee} />
          </Card>

          <Card className="p-4 space-y-3">
            <h2 className="text-sm font-semibold text-foreground">Approval</h2>
            <p className="text-xs text-muted-foreground">
              Status:{" "}
              <span className="text-foreground font-medium">
                {incident.approval_status.replace("_", " ")}
              </span>
            </p>
            {incident.approved_at && (
              <p className="text-xs text-muted-foreground">
                When: {formatDateTime(incident.approved_at)}
              </p>
            )}
          </Card>

          <Card className="p-4 space-y-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <h2 className="text-sm font-semibold text-foreground inline-flex items-center gap-2">
                <Package className="h-4 w-4 text-primary" /> Media package
              </h2>
              {assetCount > 0 && (
                <Badge variant="secondary" className="text-[10px]">{assetCount} assets</Badge>
              )}
            </div>
            <Badge variant="outline" className="font-mono text-[10px] tracking-wider border-primary/40 text-primary">
              PKG-{incident.id.slice(0, 8).toUpperCase()}
            </Badge>
            {assetCount > 0 ? (
              <>
                <p className="text-xs text-muted-foreground">
                  Communication assets generated for this incident. Review and approve them before distribution.
                </p>
                <Button asChild size="sm" className="w-full">
                  <Link to={`/approvals?incident=${incident.id}`}>
                    Open package in Approvals
                    <ExternalLink className="h-3.5 w-3.5 ml-1" />
                  </Link>
                </Button>
              </>
            ) : (
              <p className="text-xs text-muted-foreground">
                {isApproved
                  ? "Package generation in progress…"
                  : "Approve this incident to auto-generate the communication package."}
              </p>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

function DetailRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Plane;
  label: string;
  value: string | null;
}) {
  if (!value) return null;
  return (
    <div className="flex items-center gap-2 text-xs">
      <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
      <span className="text-muted-foreground">{label}:</span>
      <span className="text-foreground font-medium truncate">{value}</span>
    </div>
  );
}
