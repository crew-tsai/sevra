import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { z } from "zod";
import { ShieldAlert, Megaphone, Activity, Sparkles, Users, Clock, Check, ArrowRight } from "lucide-react";
import { BrowserMockup } from "@/components/marketing/BrowserMockup";
import dashboardShot from "@/assets/product-dashboard.png";

const leadSchema = z.object({
  name: z.string().trim().min(1, "Name required").max(100),
  email: z.string().trim().email("Invalid email").max(255),
  company: z.string().trim().max(150).optional(),
  industry: z.string().trim().max(100).optional(),
  message: z.string().trim().max(1000).optional(),
});

const INDUSTRIES = ["Aviation", "Hospitality", "Financial Services", "Healthcare", "Energy", "Retail", "Technology", "Public Sector", "Other"];

export default function Home() {
  const [form, setForm] = useState({ name: "", email: "", company: "", industry: "", message: "" });
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = leadSchema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setLoading(true);
    const { error } = await supabase.from("leads").insert([parsed.data as { name: string; email: string; company?: string; industry?: string; message?: string }]);
    setLoading(false);
    if (error) {
      toast.error("Could not submit. Please try again.");
      return;
    }
    setDone(true);
    setForm({ name: "", email: "", company: "", industry: "", message: "" });
    toast.success("Thanks! We'll be in touch soon.");
  };

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div
          className="absolute inset-0 -z-10 opacity-60"
          style={{
            background:
              "radial-gradient(60% 50% at 20% 10%, hsl(11 100% 62% / 0.18), transparent 60%), radial-gradient(50% 50% at 90% 30%, hsl(258 100% 65% / 0.18), transparent 60%)",
          }}
        />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16 lg:pt-28 lg:pb-24 grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-3 py-1 text-xs text-muted-foreground mb-6">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              AI-powered crisis intelligence
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-[1.05] tracking-tight">
              Lead the room when{" "}
              <span
                className="bg-clip-text text-transparent"
                style={{ backgroundImage: "linear-gradient(135deg, #FF5A3C 0%, #7C4DFF 100%)" }}
              >
                every second counts
              </span>
            </h1>
            <p className="mt-6 text-lg text-muted-foreground max-w-xl">
              Sevra is the enterprise platform for crisis communications teams. Detect, decide and respond
              with confidence — across aviation, hospitality, finance and beyond.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a
                href="#contact"
                className="inline-flex items-center gap-2 rounded-md bg-primary px-5 py-3 text-sm font-medium text-primary-foreground hover:opacity-90"
              >
                Request a demo <ArrowRight className="h-4 w-4" />
              </a>
              <Link
                to="/product"
                className="inline-flex items-center rounded-md border border-border px-5 py-3 text-sm font-medium hover:bg-secondary"
              >
                Explore the product
              </Link>
            </div>
            <div className="mt-10 flex flex-wrap gap-x-8 gap-y-3 text-sm text-muted-foreground">
              {["SOC2-ready", "Real-time monitoring", "Approval workflows"].map((b) => (
                <div key={b} className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-primary" /> {b}
                </div>
              ))}
            </div>
          </div>

          {/* Lead form */}
          <Card id="contact" className="bg-card/70 border-border p-6 sm:p-8 backdrop-blur">
            {done ? (
              <div className="text-center py-10">
                <div className="mx-auto h-12 w-12 rounded-full bg-primary/15 flex items-center justify-center mb-4">
                  <Check className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold">You're on the list</h3>
                <p className="text-muted-foreground mt-2">A member of our team will reach out shortly.</p>
                <Button className="mt-6" variant="secondary" onClick={() => setDone(false)}>
                  Submit another
                </Button>
              </div>
            ) : (
              <form onSubmit={submit} className="space-y-4">
                <div>
                  <h3 className="text-xl font-semibold">Talk to our crisis team</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Tell us about your team and we'll set up a tailored walkthrough.
                  </p>
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full name</Label>
                    <Input id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Work email</Label>
                    <Input id="email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="company">Company</Label>
                    <Input id="company" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="industry">Industry</Label>
                    <select
                      id="industry"
                      value={form.industry}
                      onChange={(e) => setForm({ ...form, industry: e.target.value })}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <option value="">Select…</option>
                      {INDUSTRIES.map((i) => (
                        <option key={i} value={i}>{i}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="message">What are you trying to solve?</Label>
                  <Textarea id="message" rows={3} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} />
                </div>
                <Button type="submit" disabled={loading} className="w-full">
                  {loading ? "Sending…" : "Get a demo"}
                </Button>
                <p className="text-xs text-muted-foreground text-center">
                  By submitting, you agree to be contacted by Sevra. We respect your privacy.
                </p>
              </form>
            )}
          </Card>
        </div>
      </section>

      {/* Industries */}
      <section className="border-t border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <p className="text-xs uppercase tracking-widest text-muted-foreground text-center">Built for crisis teams across</p>
          <div className="mt-6 flex flex-wrap justify-center gap-x-10 gap-y-3 text-muted-foreground">
            {["Aviation", "Hospitality", "Finance", "Healthcare", "Energy", "Retail", "Public sector"].map((i) => (
              <span key={i} className="text-sm font-medium">{i}</span>
            ))}
          </div>
        </div>
      </section>

      {/* Value props */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="max-w-2xl">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">A single source of truth in crisis.</h2>
          <p className="mt-4 text-muted-foreground">
            From the first signal to public statement — Sevra orchestrates monitoring, decision-making and
            approved communications in one place.
          </p>
        </div>
        <div className="mt-12 grid md:grid-cols-3 gap-6">
          {[
            { icon: ShieldAlert, title: "Detect early", body: "Real-time monitoring across social, news and internal signals — surfaced and triaged automatically." },
            { icon: Activity, title: "Decide faster", body: "Crisis level scoring (L0–L4) and AI-assisted analysis aligned with your playbooks." },
            { icon: Megaphone, title: "Respond on-brand", body: "Generate, approve and publish statements, FAQs and social posts with a clear audit trail." },
          ].map((f) => (
            <Card key={f.title} className="bg-card border-border p-6">
              <div className="h-10 w-10 rounded-md bg-primary/15 flex items-center justify-center text-primary mb-4">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-semibold">{f.title}</h3>
              <p className="text-sm text-muted-foreground mt-2">{f.body}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* Product preview */}
      <section className="border-t border-border bg-secondary/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center max-w-2xl mx-auto">
            <p className="text-xs uppercase tracking-widest text-primary">The command center</p>
            <h2 className="mt-3 text-3xl sm:text-4xl font-bold tracking-tight">Your crisis dashboard, at a glance.</h2>
            <p className="mt-4 text-muted-foreground">
              Active incidents, crisis levels, owners and trends — all in one real-time view your whole team can rely on.
            </p>
          </div>
          <div className="mt-12 max-w-5xl mx-auto">
            <BrowserMockup src={dashboardShot} alt="Sevra crisis dashboard" url="app.sevra.ai/dashboard" />
          </div>
        </div>

      {/* Stats */}
      <section className="border-t border-border bg-secondary/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 grid sm:grid-cols-3 gap-8">
          {[
            { icon: Clock, kpi: "70%", label: "faster time-to-statement" },
            { icon: Users, kpi: "24/7", label: "monitoring across channels" },
            { icon: ShieldAlert, kpi: "L0–L4", label: "structured crisis levels" },
          ].map((s) => (
            <div key={s.label} className="flex items-start gap-4">
              <div className="h-10 w-10 rounded-md bg-primary/15 flex items-center justify-center text-primary shrink-0">
                <s.icon className="h-5 w-5" />
              </div>
              <div>
                <div className="text-3xl font-bold">{s.kpi}</div>
                <div className="text-sm text-muted-foreground">{s.label}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
        <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">Ready when the next crisis hits?</h2>
        <p className="mt-4 text-muted-foreground max-w-xl mx-auto">
          See Sevra in action with a guided walkthrough tailored to your industry and playbooks.
        </p>
        <a
          href="#contact"
          className="mt-8 inline-flex items-center gap-2 rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:opacity-90"
        >
          Request a demo <ArrowRight className="h-4 w-4" />
        </a>
      </section>
    </div>
  );
}
