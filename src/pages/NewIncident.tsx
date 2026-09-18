import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  INCIDENT_TYPES,
  humanizeSubType,
  profileFor,
  typeLabel,
  type IncidentType,
} from "@/lib/industries";
import { useLang, useMessages } from "@/i18n";
import { commonMessages } from "@/i18n/messages/common";
import { newIncidentMessages } from "@/i18n/messages/new-incident";

const SOURCES = ["manual", "social_media", "news", "internal_ops", "customer_complaint", "regulator"];

export default function NewIncident() {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [industry, setIndustry] = useState<string | null>(null);
  const { lang } = useLang();
  const t = useMessages(newIncidentMessages);
  const common = useMessages(commonMessages);
  const vocab = profileFor(industry, lang);

  useEffect(() => {
    void (async () => {
      const { data } = await supabase.from("company_settings").select("industry").maybeSingle();
      setIndustry(data?.industry ?? null);
    })();
  }, []);

  // Basic Info
  const [title, setTitle] = useState("");
  const [incidentType, setIncidentType] = useState("");
  const [subType, setSubType] = useState("");
  const [description, setDescription] = useState("");

  // Travel Context
  const [airlineName, setAirlineName] = useState("");
  const [flightNumber, setFlightNumber] = useState("");
  const [route, setRoute] = useState("");
  const [airportCode, setAirportCode] = useState("");
  const [country, setCountry] = useState("");

  // Risk Context
  const [injuryFatality, setInjuryFatality] = useState(false);
  const [regulatorInvolved, setRegulatorInvolved] = useState(false);
  const [estimatedPassengers, setEstimatedPassengers] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [influencerMedia, setInfluencerMedia] = useState(false);

  // Source
  const [source, setSource] = useState("manual");

  // The offered sub-types follow the configured industry, so a hospital is
  // asked about medication errors rather than baggage systems. sub_type is
  // free text in the database, so this varies with no schema impact.
  const subTypes = incidentType ? vocab.subTypes[incidentType as IncidentType] ?? [] : [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !incidentType) {
      toast.error(t.required);
      return;
    }

    setSubmitting(true);
    const { data: { user } } = await supabase.auth.getUser();

    // Calculate initial risk score based on context
    let riskScore = 30;
    if (injuryFatality) riskScore += 40;
    if (regulatorInvolved) riskScore += 15;
    if (isPublic) riskScore += 10;
    if (influencerMedia) riskScore += 5;
    const passengers = parseInt(estimatedPassengers) || 0;
    if (passengers > 200) riskScore += 10;
    else if (passengers > 50) riskScore += 5;
    riskScore = Math.min(riskScore, 100);

    let risk = "low";
    if (riskScore >= 80) risk = "critical";
    else if (riskScore >= 60) risk = "high";
    else if (riskScore >= 40) risk = "medium";

    const { error } = await supabase.from("incidents").insert({
      title: title.trim(),
      incident_type: incidentType,
      sub_type: subType || null,
      description: description.trim() || null,
      airline_name: airlineName.trim() || null,
      flight_number: flightNumber.trim() || null,
      route: route.trim() || null,
      airport_code: airportCode.trim().toUpperCase() || null,
      country: country.trim() || null,
      injury_fatality: injuryFatality,
      regulator_involved: regulatorInvolved,
      estimated_passengers_impacted: passengers,
      is_public: isPublic,
      influencer_media_involved: influencerMedia,
      source,
      risk,
      risk_score: riskScore,
      created_by: user?.id || null,
    });

    setSubmitting(false);
    if (error) {
      toast.error(t.createFailed(error.message));
    } else {
      toast.success(t.created);
      navigate("/dashboard");
    }
  };

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-foreground">{t.title}</h1>
        <p className="text-sm text-muted-foreground mt-1">{t.intro}</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Section 1: Basic Info */}
        <section className="space-y-4">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">{t.basicInfo}</h2>
          <div className="space-y-2">
            <Label htmlFor="title">{t.incidentTitle}</Label>
            <Input id="title" placeholder={t.titlePlaceholder} value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t.incidentType}</Label>
              <Select value={incidentType} onValueChange={(v) => { setIncidentType(v); setSubType(""); }}>
                <SelectTrigger><SelectValue placeholder={t.selectType} /></SelectTrigger>
                <SelectContent>
                  {INCIDENT_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>{typeLabel(industry, t, lang)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t.subType}</Label>
              <Select value={subType} onValueChange={setSubType} disabled={!incidentType}>
                <SelectTrigger><SelectValue placeholder={incidentType ? t.selectSubType : t.selectTypeFirst} /></SelectTrigger>
                <SelectContent>
                  {subTypes.map((s) => (
                    <SelectItem key={s} value={s}>{humanizeSubType(s, lang)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">{t.description}</Label>
            <Textarea id="description" placeholder={t.descriptionPlaceholder} rows={4} value={description} onChange={(e) => setDescription(e.target.value)} maxLength={2000} />
          </div>
        </section>

        {/* Section 2: Service details */}
        <section className="space-y-4">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">{t.serviceDetails}</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="airline">{vocab.operatorLabel}</Label>
              <Input id="airline" placeholder={t.eg(vocab.operatorLabel)} value={airlineName} onChange={(e) => setAirlineName(e.target.value)} maxLength={100} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="flight">{vocab.serviceLabel}</Label>
              <Input id="flight" placeholder={vocab.serviceExample} value={flightNumber} onChange={(e) => setFlightNumber(e.target.value)} maxLength={20} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="route">{t.route}</Label>
              <Input id="route" placeholder={vocab.routeExample} value={route} onChange={(e) => setRoute(e.target.value)} maxLength={20} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="airport">{vocab.locationLabel}</Label>
              <Input id="airport" placeholder={vocab.locationExample} value={airportCode} onChange={(e) => setAirportCode(e.target.value)} maxLength={4} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="country">{t.country}</Label>
              <Input id="country" placeholder={t.countryPlaceholder} value={country} onChange={(e) => setCountry(e.target.value)} maxLength={60} />
            </div>
          </div>
        </section>

        {/* Section 3: Risk Context */}
        <section className="space-y-4">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">{t.riskContext}</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center justify-between rounded-md border border-border p-3">
              <Label htmlFor="injury" className="cursor-pointer">{t.injury}</Label>
              <Switch id="injury" checked={injuryFatality} onCheckedChange={setInjuryFatality} />
            </div>
            <div className="flex items-center justify-between rounded-md border border-border p-3">
              <Label htmlFor="regulator" className="cursor-pointer">{t.regulator}</Label>
              <Switch id="regulator" checked={regulatorInvolved} onCheckedChange={setRegulatorInvolved} />
            </div>
            <div className="flex items-center justify-between rounded-md border border-border p-3">
              <Label htmlFor="public" className="cursor-pointer">{t.isPublic}</Label>
              <Switch id="public" checked={isPublic} onCheckedChange={setIsPublic} />
            </div>
            <div className="flex items-center justify-between rounded-md border border-border p-3">
              <Label htmlFor="influencer" className="cursor-pointer">{t.influencer}</Label>
              <Switch id="influencer" checked={influencerMedia} onCheckedChange={setInfluencerMedia} />
            </div>
          </div>
          <div className="space-y-2 max-w-xs">
            <Label htmlFor="passengers">{t.estimated(vocab.peopleLabel)}</Label>
            <Input id="passengers" type="number" min={0} placeholder="0" value={estimatedPassengers} onChange={(e) => setEstimatedPassengers(e.target.value)} />
          </div>
        </section>

        {/* Section 4: Source */}
        <section className="space-y-4">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">{t.source}</h2>
          <div className="space-y-2 max-w-xs">
            <Label>{t.howDiscovered}</Label>
            <Select value={source} onValueChange={setSource}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {SOURCES.map((s) => (
                  <SelectItem key={s} value={s}>{common.source[s]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </section>

        <div className="flex gap-3 pt-2">
          <Button type="submit" disabled={submitting}>{submitting ? t.creating : t.create}</Button>
          <Button type="button" variant="outline" onClick={() => navigate("/dashboard")}>{common.cancel}</Button>
        </div>
      </form>
    </div>
  );
}
