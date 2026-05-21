import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Activity, Megaphone, ShieldAlert, FileCheck2, Radar, Bot, History, Layers, ArrowRight } from "lucide-react";

const MODULES = [
  {
    icon: Radar,
    title: "Signal Monitor",
    body: "Continuous monitoring across social, news and internal feeds with smart triage and noise reduction.",
    bullets: ["Multi-source ingestion", "Topic clustering", "Severity scoring"],
  },
  {
    icon: ShieldAlert,
    title: "Crisis Levels (L0–L4)",
    body: "Structured framework to classify incidents and trigger the right playbook automatically.",
    bullets: ["Configurable thresholds", "Risk score 0–100", "Playbook routing"],
  },
  {
    icon: Bot,
    title: "Sevra AI Assistant",
    body: "AI co-pilot that drafts statements, FAQs and internal memos aligned to your brand voice.",
    bullets: ["Press releases", "Holding statements", "Social posts & FAQs"],
  },
  {
    icon: FileCheck2,
    title: "Approvals & Workflow",
    body: "Multi-stakeholder approval flows with full traceability — from legal to comms to leadership.",
    bullets: ["Role-based reviewers", "Versioning", "Real-time comments"],
  },
  {
    icon: Megaphone,
    title: "Distribution",
    body: "Publish approved messages to email, social and internal channels in one click.",
    bullets: ["Multi-channel delivery", "Audience segmentation", "Performance tracking"],
  },
  {
    icon: Activity,
    title: "Live Dashboard",
    body: "A real-time command center showing active incidents, crisis levels and team status.",
    bullets: ["Priority queue", "KPIs", "Geographic view"],
  },
  {
    icon: History,
    title: "Audit Log",
    body: "Immutable record of every change, approval and publication for compliance and post-mortems.",
    bullets: ["Field-level history", "Actor & timestamp", "Exportable reports"],
  },
  {
    icon: Layers,
    title: "Reports & Insights",
    body: "Post-incident reports and trend analytics to continuously improve your crisis readiness.",
    bullets: ["Incident timelines", "Response benchmarks", "Improvement actions"],
  },
];

export default function Product() {
  return (
    <div>
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-12 text-center">
        <p className="text-xs uppercase tracking-widest text-primary">Our Product</p>
        <h1 className="mt-3 text-4xl sm:text-5xl font-bold tracking-tight">One platform. Every phase of the crisis.</h1>
        <p className="mt-5 text-muted-foreground max-w-2xl mx-auto">
          Sevra brings together monitoring, decisioning, drafting, approvals and distribution — so your team
          moves as one when it matters most.
        </p>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {MODULES.map((m) => (
            <Card key={m.title} className="bg-card border-border p-6 flex flex-col">
              <div className="h-10 w-10 rounded-md bg-primary/15 flex items-center justify-center text-primary mb-4">
                <m.icon className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-semibold">{m.title}</h3>
              <p className="text-sm text-muted-foreground mt-2 flex-1">{m.body}</p>
              <ul className="mt-4 space-y-1.5 text-sm text-muted-foreground">
                {m.bullets.map((b) => (
                  <li key={b} className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary" /> {b}
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </div>
      </section>

      <section className="border-t border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">See Sevra in action.</h2>
          <p className="mt-4 text-muted-foreground max-w-xl mx-auto">
            Get a guided tour of the product, mapped to your team's playbooks and industry.
          </p>
          <Link
            to="/#contact"
            className="mt-8 inline-flex items-center gap-2 rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            Request a demo <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </div>
  );
}
