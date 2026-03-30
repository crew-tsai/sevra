import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const INCIDENT_TYPES: Record<string, string[]> = {
  safety: ["injury_report", "turbulence_event"],
  delay: ["cancellation_wave"],
  customer_treatment: ["discrimination_claim", "baggage_failure"],
  outage: ["system_outage"],
  misinformation: ["false_rumor"],
};

const SOURCES = [
  { value: "manual", label: "Manual" },
  { value: "social_media", label: "Social Media" },
  { value: "news", label: "News" },
  { value: "internal_ops", label: "Internal Ops" },
  { value: "customer_complaint", label: "Customer Complaint" },
  { value: "regulator", label: "Regulator" },
];

export default function NewIncident() {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);

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

  const subTypes = incidentType ? INCIDENT_TYPES[incidentType] || [] : [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !incidentType) {
      toast.error("Title and Incident Type are required.");
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
      toast.error("Failed to create incident: " + error.message);
    } else {
      toast.success("Incident created successfully.");
      navigate("/dashboard");
    }
  };

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Report New Incident</h1>
        <p className="text-sm text-muted-foreground mt-1">Provide details to begin the crisis response workflow</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Section 1: Basic Info */}
        <section className="space-y-4">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Basic Information</h2>
          <div className="space-y-2">
            <Label htmlFor="title">Incident Title *</Label>
            <Input id="title" placeholder="Brief description of the incident" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Incident Type *</Label>
              <Select value={incidentType} onValueChange={(v) => { setIncidentType(v); setSubType(""); }}>
                <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                <SelectContent>
                  {Object.keys(INCIDENT_TYPES).map((t) => (
                    <SelectItem key={t} value={t} className="capitalize">{t.charAt(0).toUpperCase() + t.slice(1)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Sub-type</Label>
              <Select value={subType} onValueChange={setSubType} disabled={!incidentType}>
                <SelectTrigger><SelectValue placeholder={incidentType ? "Select sub-type" : "Select type first"} /></SelectTrigger>
                <SelectContent>
                  {subTypes.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" placeholder="What happened, impact scope, immediate actions taken..." rows={4} value={description} onChange={(e) => setDescription(e.target.value)} maxLength={2000} />
          </div>
        </section>

        {/* Section 2: Travel Context */}
        <section className="space-y-4">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Travel Context</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="airline">Airline Name</Label>
              <Input id="airline" placeholder="e.g. Iberia" value={airlineName} onChange={(e) => setAirlineName(e.target.value)} maxLength={100} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="flight">Flight Number</Label>
              <Input id="flight" placeholder="e.g. IB3214" value={flightNumber} onChange={(e) => setFlightNumber(e.target.value)} maxLength={20} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="route">Route</Label>
              <Input id="route" placeholder="e.g. MAD-BCN" value={route} onChange={(e) => setRoute(e.target.value)} maxLength={20} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="airport">Airport Code</Label>
              <Input id="airport" placeholder="e.g. MAD" value={airportCode} onChange={(e) => setAirportCode(e.target.value)} maxLength={4} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="country">Country</Label>
              <Input id="country" placeholder="e.g. Spain" value={country} onChange={(e) => setCountry(e.target.value)} maxLength={60} />
            </div>
          </div>
        </section>

        {/* Section 3: Risk Context */}
        <section className="space-y-4">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Risk Context</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center justify-between rounded-md border border-border p-3">
              <Label htmlFor="injury" className="cursor-pointer">Injury / fatality mentioned?</Label>
              <Switch id="injury" checked={injuryFatality} onCheckedChange={setInjuryFatality} />
            </div>
            <div className="flex items-center justify-between rounded-md border border-border p-3">
              <Label htmlFor="regulator" className="cursor-pointer">Regulator involved?</Label>
              <Switch id="regulator" checked={regulatorInvolved} onCheckedChange={setRegulatorInvolved} />
            </div>
            <div className="flex items-center justify-between rounded-md border border-border p-3">
              <Label htmlFor="public" className="cursor-pointer">Is this public already?</Label>
              <Switch id="public" checked={isPublic} onCheckedChange={setIsPublic} />
            </div>
            <div className="flex items-center justify-between rounded-md border border-border p-3">
              <Label htmlFor="influencer" className="cursor-pointer">Influencer / media involved?</Label>
              <Switch id="influencer" checked={influencerMedia} onCheckedChange={setInfluencerMedia} />
            </div>
          </div>
          <div className="space-y-2 max-w-xs">
            <Label htmlFor="passengers">Estimated Passengers Impacted</Label>
            <Input id="passengers" type="number" min={0} placeholder="0" value={estimatedPassengers} onChange={(e) => setEstimatedPassengers(e.target.value)} />
          </div>
        </section>

        {/* Section 4: Source */}
        <section className="space-y-4">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Source</h2>
          <div className="space-y-2 max-w-xs">
            <Label>How was this discovered?</Label>
            <Select value={source} onValueChange={setSource}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {SOURCES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </section>

        <div className="flex gap-3 pt-2">
          <Button type="submit" disabled={submitting}>{submitting ? "Creating..." : "Create Incident"}</Button>
          <Button type="button" variant="outline" onClick={() => navigate("/dashboard")}>Cancel</Button>
        </div>
      </form>
    </div>
  );
}
