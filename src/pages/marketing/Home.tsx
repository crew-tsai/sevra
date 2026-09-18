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
import { DeviceMockup } from "@/components/marketing/DeviceMockup";
import dashboardShot from "@/assets/product-dashboard.png";
import dashboardMobileShot from "@/assets/product-dashboard-mobile.png";
import { INDUSTRY_GROUPS, industryLabel } from "@/lib/industries";
import { useLang, useMessages } from "@/i18n";
import { homeMessages } from "@/i18n/messages/home";

const leadSchema = (m: { nameRequired: string; invalidEmail: string }) =>
  z.object({
    name: z.string().trim().min(1, m.nameRequired).max(100),
    email: z.string().trim().email(m.invalidEmail).max(255),
    company: z.string().trim().max(150).optional(),
    industry: z.string().trim().max(100).optional(),
    message: z.string().trim().max(1000).optional(),
  });

export default function Home() {
  const { lang } = useLang();
  const m = useMessages(homeMessages);
  const [form, setForm] = useState({ name: "", email: "", company: "", industry: "", message: "" });
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = leadSchema(m).safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setLoading(true);
    const { error } = await supabase.from("leads").insert([parsed.data as { name: string; email: string; company?: string; industry?: string; message?: string }]);
    setLoading(false);
    if (error) {
      toast.error(m.submitFailed);
      return;
    }
    setDone(true);
    setForm({ name: "", email: "", company: "", industry: "", message: "" });
    toast.success(m.thanks);
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
              {m.eyebrow}
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-[1.05] tracking-tight">
              {m.heroLead}{" "}
              <span
                className="bg-clip-text text-transparent"
                style={{ backgroundImage: "linear-gradient(135deg, #FF5A3C 0%, #7C4DFF 100%)" }}
              >
                {m.heroAccent}
              </span>
            </h1>
            <p className="mt-6 text-lg text-muted-foreground max-w-xl">
              {m.heroBody}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a
                href="#contact"
                className="inline-flex items-center gap-2 rounded-md bg-primary px-5 py-3 text-sm font-medium text-primary-foreground hover:opacity-90"
              >
                {m.requestDemo} <ArrowRight className="h-4 w-4" />
              </a>
              <Link
                to="/product"
                className="inline-flex items-center rounded-md border border-border px-5 py-3 text-sm font-medium hover:bg-secondary"
              >
                {m.exploreProduct}
              </Link>
            </div>
            <div className="mt-10 flex flex-wrap gap-x-8 gap-y-3 text-sm text-muted-foreground">
              {m.badges.map((b) => (
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
                <h3 className="text-xl font-semibold">{m.onTheList}</h3>
                <p className="text-muted-foreground mt-2">{m.reachOut}</p>
                <Button className="mt-6" variant="secondary" onClick={() => setDone(false)}>
                  {m.submitAnother}
                </Button>
              </div>
            ) : (
              <form onSubmit={submit} className="space-y-4">
                <div>
                  <h3 className="text-xl font-semibold">{m.formTitle}</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {m.formIntro}
                  </p>
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">{m.fullName}</Label>
                    <Input id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">{m.workEmail}</Label>
                    <Input id="email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="company">{m.company}</Label>
                    <Input id="company" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="industry">{m.industry}</Label>
                    <select
                      id="industry"
                      value={form.industry}
                      onChange={(e) => setForm({ ...form, industry: e.target.value })}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <option value="">{m.select}</option>
                      {INDUSTRY_GROUPS.flatMap((g) => g.values).map((i) => (
                        <option key={i} value={i}>{industryLabel(i, lang)}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="message">{m.solving}</Label>
                  <Textarea id="message" rows={3} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} />
                </div>
                <Button type="submit" disabled={loading} className="w-full">
                  {loading ? m.sending : m.getDemo}
                </Button>
                <p className="text-xs text-muted-foreground text-center">
                  {m.consent}
                </p>
              </form>
            )}
          </Card>
        </div>
      </section>

      {/* Industries */}
      <section className="border-t border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <p className="text-xs uppercase tracking-widest text-muted-foreground text-center">{m.builtFor}</p>
          <div className="mt-6 flex flex-wrap justify-center gap-x-10 gap-y-3 text-muted-foreground">
            {INDUSTRY_GROUPS.filter((g) => g.group !== "Other").map((g) => (
              <span key={g.group} className="text-sm font-medium">{m.sectors[g.group] ?? g.group}</span>
            ))}
          </div>
        </div>
      </section>

      {/* Value props */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="max-w-2xl">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">{m.truthTitle}</h2>
          <p className="mt-4 text-muted-foreground">
            {m.truthBody}
          </p>
        </div>
        <div className="mt-12 grid md:grid-cols-3 gap-6">
          {[ShieldAlert, Activity, Megaphone].map((icon, i) => ({ icon, ...m.features[i] })).map((f) => (
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
            <p className="text-xs uppercase tracking-widest text-primary">{m.commandCenter}</p>
            <h2 className="mt-3 text-3xl sm:text-4xl font-bold tracking-tight">{m.dashboardTitle}</h2>
            <p className="mt-4 text-muted-foreground">
              {m.dashboardBody}
            </p>
          </div>
          <div className="mt-12 max-w-5xl mx-auto pb-12 sm:pb-16">
            <DeviceMockup desktopSrc={dashboardShot} mobileSrc={dashboardMobileShot} alt={m.dashboardAlt} url="app.sevra.ai/dashboard" />
          </div>
        </div>
      </section>



      {/* Stats */}
      <section className="border-t border-border bg-secondary/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 grid sm:grid-cols-3 gap-8">
          {[Clock, Users, ShieldAlert].map((icon, i) => ({ icon, ...m.stats[i] })).map((s) => (
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
        <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">{m.ctaTitle}</h2>
        <p className="mt-4 text-muted-foreground max-w-xl mx-auto">
          {m.ctaBody}
        </p>
        <a
          href="#contact"
          className="mt-8 inline-flex items-center gap-2 rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:opacity-90"
        >
          {m.requestDemo} <ArrowRight className="h-4 w-4" />
        </a>
      </section>
    </div>
  );
}
