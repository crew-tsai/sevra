import { useEffect, useState } from "react";
import { useNavigate, useParams, Link, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RiskBadge } from "@/components/RiskBadge";
import { CrisisLevelBadge } from "@/components/CrisisLevelBadge";
import { StatusBadge } from "@/components/StatusBadge";
import { StatusStepper } from "@/components/StatusStepper";
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
  ListChecks,
  LayoutDashboard,
  Lightbulb,
} from "lucide-react";
import { toast } from "sonner";
import { humanizeSubType, INCIDENT_TYPES, profileFor, typeLabel, type IncidentType } from "@/lib/industries";
import { formatDateTime } from "@/lib/utils";
import { useIntlLocale, useLang, useMessages } from "@/i18n";
import { useTranslations } from "@/i18n/useTranslations";
import { commonMessages } from "@/i18n/messages/common";
import { incidentDetailMessages } from "@/i18n/messages/incident-detail";
import { Switch } from "@/components/ui/switch";
import { crisisLevel } from "@/lib/crisis-level";
import { IncidentTimeline } from "@/components/IncidentTimeline";
import { IncidentReview } from "@/components/IncidentReview";

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
  created_by: string | null;
  is_drill: boolean;
  created_at: string;
  updated_at: string;
  translations: unknown;
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
  translations: unknown;
};

const CHANNEL_ICON: Record<string, typeof Twitter> = {
  twitter: Twitter,
  instagram: Instagram,
  tiktok: Music2,
};


/** The four phases, in the order a crisis actually moves through them. */
const PHASES = ["phase_immediate", "phase_short", "phase_medium", "phase_long"] as const;

type ResponsePlan = {
  id: string;
  phase_immediate: string[] | null;
  phase_short: string[] | null;
  phase_medium: string[] | null;
  phase_long: string[] | null;
  generated_by: string | null;
  translations: unknown;
};

export default function IncidentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const navState = (location.state ?? null) as { from?: string; fromLabel?: string } | null;
  const backTo = navState?.from ?? null;
  const t = useMessages(incidentDetailMessages);
  const common = useMessages(commonMessages);
  const { lang } = useLang();
  const intl = useIntlLocale();
  const fmt = (iso: string | null | undefined) => formatDateTime(iso, intl);
  const backLabel = navState?.fromLabel ?? t.back;
  const [incident, setIncident] = useState<Incident | null>(null);
  const [mentions, setMentions] = useState<Mention[]>([]);
  const [assetCount, setAssetCount] = useState(0);
  const [drafting, setDrafting] = useState(false);
  const [plan, setPlan] = useState<ResponsePlan | null>(null);
  const [planning, setPlanning] = useState(false);
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [industry, setIndustry] = useState<string | null>(null);
  const [canEditFacts, setCanEditFacts] = useState(false);
  const [savingFact, setSavingFact] = useState<string | null>(null);
  const vocab = profileFor(industry, lang);

  useEffect(() => {
    void (async () => {
      const { data } = await supabase.from("company_settings").select("industry").maybeSingle();
      setIndustry(data?.industry ?? null);
    })();
  }, []);

  const load = async () => {
    if (!id) return;
    setLoading(true);
    const [
      { data: inc, error: incErr },
      { data: mens, error: menErr },
      { count, error: cntErr },
      { data: planRow },
    ] = await Promise.all([
      supabase.from("incidents").select("*").eq("id", id).maybeSingle(),
      supabase
        .from("social_mentions")
        .select("id, channel, author_name, author_handle, content, post_url, posted_at, ai_summary, ai_risk, is_verified, is_influencer, translations")
        .eq("incident_id", id)
        .order("posted_at", { ascending: false }),
      supabase
        .from("incident_assets")
        .select("id", { count: "exact", head: true })
        .eq("incident_id", id),
      supabase
        .from("response_plan")
        .select("id, phase_immediate, phase_short, phase_medium, phase_long, generated_by, translations")
        .eq("incident_id", id)
        .maybeSingle(),
    ]);
    // Who may correct the facts is already decided by RLS on incidents
    // (creator, admin or manager). Asking here as well is only so the control
    // is absent rather than present-and-failing for everyone else.
    const { data: user } = await supabase.auth.getUser();
    if (user.user?.id) {
      const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", user.user.id);
      const privileged = (roles ?? []).some((r) => r.role === "admin" || r.role === "manager");
      setCanEditFacts(privileged || (inc as Incident | null)?.created_by === user.user.id);
    }

    if (incErr) toast.error(incErr.message);
    if (menErr) toast.error(menErr.message);
    if (cntErr) toast.error(cntErr.message);
    setIncident((inc as Incident | null) ?? null);
    setMentions((mens ?? []) as Mention[]);
    setAssetCount(count ?? 0);
    setPlan((planRow as ResponsePlan | null) ?? null);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  /**
   * Correct one of the facts the crisis level is computed from.
   *
   * These were read-only, which meant the level could only ever be changed by
   * the AI analysing another mention. When someone phones in that a person was
   * hurt, or that the regulator has called, that is the moment the level is
   * most wrong and the moment nobody could fix it.
   *
   * The level is recomputed here from the same shared rules the analysis uses,
   * and it may go DOWN — unlike the AI path, which only ever ratchets up. A
   * person correcting a fact is asserting something they know; if the fact was
   * wrong, so was the level it forced. The audit trigger records both changes
   * and who made them.
   */
  const setFact = async (field: "injury_fatality" | "regulator_involved", value: boolean) => {
    if (!incident) return;
    setSavingFact(field);
    const next = { ...incident, [field]: value };
    const level = crisisLevel({
      risk: next.risk,
      riskScore: next.risk_score,
      injuryFatality: next.injury_fatality,
      regulatorInvolved: next.regulator_involved,
      amplified: next.influencer_media_involved,
    });
    // Spelled out rather than built from a variable key: the generated types
    // reject a computed property, and two lines beat a cast that would also
    // accept a column that does not exist.
    const patch = field === "injury_fatality"
      ? { injury_fatality: value, crisis_level: level }
      : { regulator_involved: value, crisis_level: level };
    const { error } = await supabase
      .from("incidents")
      .update(patch)
      .eq("id", incident.id);
    setSavingFact(null);
    if (error) return toast.error(error.message);
    if (level !== (incident.crisis_level ?? 0)) {
      toast.success(t.levelRecomputed(common.level[level]));
    }
    await load();
  };

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
    // Sevra drafts the package by itself when it detects a crisis, so by the
    // time a person approves the incident the communications may already exist
    // — and a colleague may already have approved some of them. Regenerating
    // deletes the lot, so an incident that has a package is only opened.
    if (assetCount > 0) {
      setApproving(false);
      toast.success(t.packageAlreadyDrafted(assetCount), {
        action: { label: t.openApprovals, onClick: () => navigate("/approvals") },
      });
      navigate("/approvals");
      return;
    }

    toast.success(t.approvedGenerating);
    setApproving(false);
    await draftPackage();
  };

  /**
   * Write the package for this incident.
   *
   * Also reachable on its own, because an incident can end up approved with no
   * package — the generation failed, the AI was rate limited, or it was
   * approved before any of this existed — and the card used to say "in
   * progress" for ever with no way to ask again.
   */
  const draftPackage = async () => {
    if (!incident) return;
    setDrafting(true);
    try {
      const { data, error: fnErr } = await supabase.functions.invoke("generate-incident-assets", {
        // Written in the language the person is working in; see generate-incident-assets.
        body: { incident_id: incident.id, lang },
      });
      if (fnErr) throw fnErr;
      if (!data?.success) throw new Error(data?.error || t.packageFailed);
      // Say which authority it followed: a client who uploaded a manual wants
      // to know the drafts came from theirs, not from generic practice.
      const done = data.basis === "manual" ? t.assetsFromManual : t.assetsGenerated;
      toast.success(done(data.count), {
        action: { label: t.openApprovals, onClick: () => navigate("/approvals") },
      });
      navigate("/approvals");
    } catch (e: any) {
      toast.error(e.message || t.generationFailed);
      load();
    } finally {
      setDrafting(false);
    }
  };

  /**
   * The plan is written alongside the package when Sevra detects a crisis.
   * This is for the incidents that predate that, and for a plan someone wants
   * rewritten after the facts changed.
   */
  const buildPlan = async () => {
    if (!incident) return;
    setPlanning(true);
    const { data, error } = await supabase.functions.invoke("generate-response-plan", {
      body: { incident_id: incident.id },
    });
    setPlanning(false);
    if (error || !data?.success) {
      return toast.error(error?.message ?? data?.error ?? t.planFailed);
    }
    toast.success(t.planReady);
    load();
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
    toast.success(t.rejectedToast);
    load();
  };

  // Hooks above the early returns, so their order never changes between renders.
  const trInc = useTranslations("incidents", incident ? [incident] : []);
  const trMen = useTranslations("social_mentions", mentions);
  const trPlan = useTranslations("response_plan", plan ? [plan] : []);

  if (loading) {
    return (
      <div className="p-10 flex items-center justify-center text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin mr-2" /> {t.loading}
      </div>
    );
  }

  if (!incident) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <p className="text-muted-foreground">{t.notFound}</p>
        <Link to="/sevra" className="text-primary text-sm mt-2 inline-block">{t.backToSevra}</Link>
      </div>
    );
  }

  const isApproved = incident.approval_status === "approved";
  const isRejected = incident.approval_status === "rejected";
  const incidentRef = `INC-${incident.id.slice(0, 8).toUpperCase()}`;
  const title = trInc.text(incident, "title");
  const description = trInc.text(incident, "description");
  const incidentTypeLabel = (INCIDENT_TYPES as readonly string[]).includes(incident.incident_type)
    ? typeLabel(industry, incident.incident_type as IncidentType, lang)
    : incident.incident_type;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <Breadcrumbs
          items={[
            { label: t.dashboard, to: "/dashboard", icon: LayoutDashboard },
            ...(backTo
              ? [{ label: backTo.startsWith("/approvals") ? t.approvals : t.incidents, to: backTo }]
              : [{ label: t.incidents, to: "/dashboard" }]),
            { label: `${incidentRef} · ${title}` },
          ]}
        />
        <button
          onClick={() => (backTo ? navigate(backTo) : navigate(-1))}
          className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> {t.backTo(backLabel)}
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
            <Badge variant="outline" className="text-[10px]">{incidentTypeLabel}</Badge>
            {incident.sub_type && <Badge variant="outline" className="text-[10px]">{humanizeSubType(incident.sub_type, lang)}</Badge>}
            {isApproved && (
              <Badge className="gap-1 bg-risk-low-bg text-risk-low border-0">
                <CheckCircle2 className="h-3 w-3" /> {t.approvedBadge}
              </Badge>
            )}
            {isRejected && (
              <Badge variant="outline" className="gap-1">
                <ShieldAlert className="h-3 w-3" /> {t.rejectedBadge}
              </Badge>
            )}
            {!isApproved && !isRejected && (
              <Badge variant="secondary" className="text-[10px]">{t.pendingReview}</Badge>
            )}
          </div>
          <h1 className="text-xl font-semibold text-foreground">{title}</h1>
          <p className="text-xs text-muted-foreground">
            {t.created(fmt(incident.created_at) ?? "", common.source[incident.source] ?? incident.source)}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2 shrink-0">
          <div className="text-right text-xs text-muted-foreground">
            {t.riskScore} <span className="text-foreground font-bold text-base ml-1">{incident.risk_score}/100</span>
          </div>
          {!isApproved && (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={reject} disabled={rejecting || approving}>
                {rejecting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ShieldAlert className="h-3.5 w-3.5" />}
                {t.reject}
              </Button>
              <Button size="sm" onClick={approve} disabled={approving || rejecting}>
                {approving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                {t.approve}
              </Button>
            </div>
          )}
          {isApproved && incident.approved_at && (
            <p className="text-xs text-muted-foreground">
              {t.approvedAt(fmt(incident.approved_at) ?? "")}
            </p>
          )}
        </div>
      </div>

      <Card className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-foreground">{t.lifecycle}</h2>
          <span className="text-[11px] text-muted-foreground">{t.currentStage} <span className="text-foreground font-medium">{common.status[incident.status] ?? incident.status}</span></span>
        </div>
        <StatusStepper status={incident.status} />
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Main */}
        <div className="lg:col-span-2 space-y-6">
          {incident.description && (
            <Card className="p-4">
              <h2 className="text-sm font-semibold text-foreground mb-2">{t.description}</h2>
              <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                {description}
              </p>
            </Card>
          )}

          <Card className="p-4 border-primary/30">
            <div className="flex items-center gap-2 mb-3">
              <Lightbulb className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-semibold text-foreground">{t.recommendations}</h2>
            </div>
            <p className="text-xs text-muted-foreground mb-3">
              {t.recommendationsIntro}
            </p>
            <ul className="space-y-2">
              {buildRecommendations(incident, vocab, t.recs, intl).map((rec, idx) => (
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

          {/* Said once, loudly, at the top of everything. A drill that reads
              like a real incident is the failure mode this whole flag exists
              to prevent. */}
          {incident.is_drill && (
            <div className="rounded-md border border-risk-medium/60 bg-risk-medium-bg/40 px-4 py-3">
              <p className="text-sm font-semibold text-risk-medium">{t.drillBanner}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{t.drillBannerHint}</p>
            </div>
          )}

          {/* The sequence, which during a crisis is the information: what did
              we know, when, and what had we already said by then. */}
          <IncidentTimeline incidentId={incident.id} openedAt={incident.created_at} />

          {/* Offered once it is over, which is when it is worth writing and
              when the record has stopped moving. */}
          <IncidentReview incidentId={incident.id} resolved={incident.status === "resolved"} />

          <Card className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-semibold text-foreground">
                {t.linkedMentions(mentions.length)}
              </h2>
            </div>
            {mentions.length === 0 ? (
              <p className="text-xs text-muted-foreground">{t.noMentions}</p>
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
                        {m.is_verified && <Badge variant="secondary" className="text-[10px]">{t.verified}</Badge>}
                        {m.is_influencer && <Badge variant="secondary" className="text-[10px]">{t.influencer}</Badge>}
                        {m.ai_risk && <RiskBadge level={m.ai_risk as any} />}
                        {m.posted_at && (
                          <span className="text-muted-foreground ml-auto">
                            {fmt(m.posted_at)}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-foreground mt-2 whitespace-pre-wrap">{m.content}</p>
                      {trMen.text(m, "ai_summary") && (
                        <p className="text-xs text-muted-foreground mt-1.5 italic">{trMen.text(m, "ai_summary")}</p>
                      )}
                      {m.post_url && (
                        <a
                          href={m.post_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 mt-2"
                        >
                          {t.source} <ExternalLink className="h-3 w-3" />
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
            <h2 className="text-sm font-semibold text-foreground">{t.operationalDetails}</h2>
            <DetailRow icon={Plane} label={vocab.operatorLabel} value={incident.airline_name} />
            <DetailRow icon={Plane} label={vocab.serviceLabel} value={incident.flight_number} />
            <DetailRow icon={MapPin} label={vocab.routeLabel} value={incident.route} />
            <DetailRow icon={MapPin} label={vocab.locationLabel} value={incident.airport_code} />
            <DetailRow icon={MapPin} label={t.country} value={incident.country} />
            <DetailRow
              icon={Users}
              label={vocab.peopleLabel}
              value={incident.estimated_passengers_impacted?.toLocaleString(intl) ?? null}
            />
            <FactRow
              icon={AlertTriangle}
              label={t.injury}
              value={incident.injury_fatality}
              yes={common.yes}
              no={common.no}
              editable={canEditFacts}
              busy={savingFact === "injury_fatality"}
              hint={t.factHint}
              onChange={(v) => void setFact("injury_fatality", v)}
            />
            <FactRow
              icon={ShieldAlert}
              label={t.regulator}
              value={incident.regulator_involved}
              yes={common.yes}
              no={common.no}
              editable={canEditFacts}
              busy={savingFact === "regulator_involved"}
              hint={t.factHint}
              onChange={(v) => void setFact("regulator_involved", v)}
            />
            <DetailRow
              icon={Sparkles}
              label={t.influencerMedia}
              value={incident.influencer_media_involved ? common.yes : common.no}
            />
            <DetailRow icon={Users} label={t.assignee} value={incident.assignee} />
          </Card>

          <Card className="p-4 space-y-3">
            <h2 className="text-sm font-semibold text-foreground">{t.approval}</h2>
            <p className="text-xs text-muted-foreground">
              {t.statusLabel}{" "}
              <span className="text-foreground font-medium">
                {t.approvalStatus[incident.approval_status] ?? incident.approval_status.replace("_", " ")}
              </span>
            </p>
            {incident.approved_at && (
              <p className="text-xs text-muted-foreground">
                {t.when(fmt(incident.approved_at) ?? "")}
              </p>
            )}
          </Card>

          <Card className="p-4 space-y-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <h2 className="text-sm font-semibold text-foreground inline-flex items-center gap-2">
                <ListChecks className="h-4 w-4 text-primary" /> {t.responsePlan}
              </h2>
              {plan?.generated_by === "ai+manual" && (
                <Badge variant="secondary" className="text-[10px]">{t.fromManual}</Badge>
              )}
            </div>

            {plan ? (
              <div className="space-y-3">
                {PHASES.map((phase) => {
                  const actions = trPlan.list(plan, phase);
                  if (!actions.length) return null;
                  return (
                    <div key={phase}>
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground/70">
                        {t.phases[phase]}
                      </p>
                      <ul className="mt-1 space-y-1">
                        {actions.map((action, i) => (
                          <li key={i} className="text-xs leading-relaxed flex gap-1.5">
                            <span className="text-primary/60 shrink-0">·</span>
                            <span>{action}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
                <Button size="sm" variant="outline" className="w-full" onClick={buildPlan} disabled={planning}>
                  {planning ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Sparkles className="h-3.5 w-3.5 mr-1" />}
                  {t.rebuildPlan}
                </Button>
              </div>
            ) : (
              <>
                <p className="text-xs text-muted-foreground">{t.noPlanYet}</p>
                <Button size="sm" variant="outline" className="w-full" onClick={buildPlan} disabled={planning}>
                  {planning ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Sparkles className="h-3.5 w-3.5 mr-1" />}
                  {t.buildPlan}
                </Button>
              </>
            )}
          </Card>

          <Card className="p-4 space-y-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <h2 className="text-sm font-semibold text-foreground inline-flex items-center gap-2">
                <Package className="h-4 w-4 text-primary" /> {t.mediaPackage}
              </h2>
              {assetCount > 0 && (
                <Badge variant="secondary" className="text-[10px]">{t.assetsCount(assetCount)}</Badge>
              )}
            </div>
            <Badge variant="outline" className="font-mono text-[10px] tracking-wider border-primary/40 text-primary">
              PKG-{incident.id.slice(0, 8).toUpperCase()}
            </Badge>
            {assetCount > 0 ? (
              <>
                <p className="text-xs text-muted-foreground">
                  {t.packageReady}
                </p>
                <Button asChild size="sm" className="w-full">
                  <Link to={`/approvals?incident=${incident.id}`}>
                    {t.openPackage}
                    <ExternalLink className="h-3.5 w-3.5 ml-1" />
                  </Link>
                </Button>
              </>
            ) : drafting ? (
              <p className="text-xs text-muted-foreground">{t.packageInProgress}</p>
            ) : isApproved ? (
              <>
                <p className="text-xs text-muted-foreground">{t.packageMissing}</p>
                <Button size="sm" className="w-full" onClick={draftPackage}>
                  <Sparkles className="h-3.5 w-3.5 mr-1" />
                  {t.draftPackage}
                </Button>
              </>
            ) : (
              <p className="text-xs text-muted-foreground">{t.approveToGenerate}</p>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

/**
 * A fact that the crisis level is computed from, and can therefore be
 * corrected. Reads exactly like the rows around it until you can edit it —
 * this is a detail panel, not a form, and a crisis is the wrong moment to
 * discover a new layout.
 */
function FactRow({
  icon: Icon,
  label,
  value,
  yes,
  no,
  editable,
  busy,
  hint,
  onChange,
}: {
  icon: typeof Plane;
  label: string;
  value: boolean;
  yes: string;
  no: string;
  editable: boolean;
  busy: boolean;
  hint: string;
  onChange: (next: boolean) => void;
}) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
      <span className="text-muted-foreground">{label}:</span>
      <span className="text-foreground font-medium">{value ? yes : no}</span>
      {editable && (
        <Switch
          checked={value}
          disabled={busy}
          onCheckedChange={onChange}
          title={hint}
          aria-label={label}
          className="ml-auto scale-75"
        />
      )}
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

function buildRecommendations(
  inc: Incident,
  vocab: ReturnType<typeof profileFor>,
  r: typeof incidentDetailMessages.en.recs,
  intl: string,
): { title: string; detail: string }[] {
  const recs: { title: string; detail: string }[] = [];
  const peopleNoun = vocab.peopleLabel.replace(/ (impacted|affected|afectados|afectadas)$/i, "").toLowerCase();
  const isCrisis = (inc.crisis_level ?? 0) >= 3 || inc.risk === "critical" || inc.risk === "high";

  // 1. Activation level
  recs.push(isCrisis ? r.activate : r.monitor);

  // 2. Stakeholder / regulator
  recs.push(inc.injury_fatality || inc.regulator_involved ? r.regulators : r.internal);

  // 3. Care for the people affected
  if ((inc.estimated_passengers_impacted ?? 0) > 0 || inc.incident_type === "delay" || inc.incident_type === "safety") {
    recs.push(r.care(inc.estimated_passengers_impacted ? inc.estimated_passengers_impacted.toLocaleString(intl) : null, peopleNoun));
  } else {
    recs.push(r.faq);
  }

  // 4. Communication channel
  recs.push(inc.influencer_media_involved || inc.is_public ? r.lead : r.stage);

  // 5. Post-incident
  recs.push(r.debrief);

  return recs.slice(0, 5);
}
