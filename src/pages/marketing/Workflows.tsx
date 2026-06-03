import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AlertTriangle,
  Tag,
  Filter,
  Zap,
  CircleDot,
  ArrowRight,
  Plus,
  Mail,
  Megaphone,
  Bot,
  Users,
  ShieldAlert,
  CheckCircle2,
} from "lucide-react";

const STAGES = [
  {
    icon: AlertTriangle,
    title: "Incident",
    body: "The trigger — a signal detected by SEVRA, a manual report, or an API event.",
    examples: ["Operational disruption", "Safety event", "Reputational signal", "Regulatory notice"],
  },
  {
    icon: Tag,
    title: "Classification",
    body: "How the incident is categorized — type, sub-type and crisis level (L0–L4).",
    examples: ["Type & sub-type", "Crisis level L0–L4", "Risk score 0–100", "Affected region"],
  },
  {
    icon: Filter,
    title: "Criteria",
    body: "Conditional rules that decide whether the workflow fires.",
    examples: ["Risk score ≥ 70", "Influencer involved", "Regulator involved", "Pax impacted > 100"],
  },
  {
    icon: Zap,
    title: "Actions",
    body: "What the platform does automatically — draft, notify, route, publish.",
    examples: ["Generate assets with AI", "Notify on-call team", "Open approval flow", "Publish to channels"],
  },
  {
    icon: CircleDot,
    title: "Incident Status",
    body: "Where the incident moves next — keeping the lifecycle clean and auditable.",
    examples: ["Triage → Active", "Active → Containment", "Containment → Resolved", "Closed & archived"],
  },
];

const TEMPLATES = [
  {
    icon: ShieldAlert,
    name: "Auto-escalate L3+ safety events",
    trigger: "Incident type: Safety · Crisis level ≥ L3",
    actions: ["Notify CEO + Head of Comms", "Generate holding statement", "Open priority approval"],
    status: "Active → Containment",
  },
  {
    icon: Megaphone,
    name: "Viral social signal response",
    trigger: "Source: SEVRA · Influencer involved · Risk ≥ 70",
    actions: ["Draft social reply + press note", "Alert Social Lead", "Queue for legal review"],
    status: "Triage → Active",
  },
  {
    icon: Mail,
    name: "Regulator-involved comms",
    trigger: "Regulator involved = true",
    actions: ["Notify Legal & Compliance", "Generate regulator-facing memo", "Lock public publishing"],
    status: "Active → Under review",
  },
  {
    icon: CheckCircle2,
    name: "Auto-close low-risk noise",
    trigger: "Risk score < 25 · No injury · Not public",
    actions: ["Log to audit trail", "Skip approvals", "Notify owner only"],
    status: "Triage → Closed",
  },
];

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-1 text-xs text-muted-foreground">
      {children}
    </span>
  );
}

export default function Workflows() {
  return (
    <div>
      {/* Hero */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-12 text-center">
        <p className="text-xs uppercase tracking-widest text-primary">Workflows</p>
        <h1 className="mt-3 text-4xl sm:text-5xl font-bold tracking-tight">
          Build the crisis response that fits your playbook.
        </h1>
        <p className="mt-5 text-muted-foreground max-w-2xl mx-auto">
          Admins design custom workflows that route every incident through your team's exact logic —
          from classification to criteria, automated actions and the next incident status.
        </p>
      </section>

      {/* Flow diagram */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        <div className="grid gap-4 lg:grid-cols-5">
          {STAGES.map((s, i) => (
            <div key={s.title} className="relative">
              <Card className="h-full bg-card border-border p-5 flex flex-col">
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-9 w-9 rounded-md bg-primary/15 flex items-center justify-center text-primary">
                    <s.icon className="h-5 w-5" />
                  </div>
                  <span className="text-[11px] uppercase tracking-wider text-muted-foreground/70">
                    Step {i + 1}
                  </span>
                </div>
                <h3 className="text-base font-semibold">{s.title}</h3>
                <p className="text-sm text-muted-foreground mt-2 flex-1">{s.body}</p>
                <ul className="mt-4 space-y-1.5 text-xs text-muted-foreground">
                  {s.examples.map((e) => (
                    <li key={e} className="flex items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-primary" /> {e}
                    </li>
                  ))}
                </ul>
              </Card>
              {i < STAGES.length - 1 && (
                <ArrowRight className="hidden lg:block absolute -right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground/50" />
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Builder mockup */}
      <section className="border-t border-border">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <p className="text-xs uppercase tracking-widest text-primary">Workflow Builder</p>
            <h2 className="mt-3 text-3xl sm:text-4xl font-bold tracking-tight">
              A no-code canvas for your crisis logic.
            </h2>
            <p className="mt-4 text-muted-foreground">
              Drag conditions, chain actions and define the next status — without writing code or waiting on engineering.
            </p>
          </div>

          <Card className="bg-card border-border p-6 sm:p-8">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <Bot className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">Workflow · Aurora Skylines · Operational Disruption</span>
              </div>
              <Badge variant="secondary" className="text-[11px]">Draft</Badge>
            </div>

            <div className="space-y-3">
              {/* When */}
              <div className="rounded-md border border-border p-4">
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground/70 mb-2">When</div>
                <div className="flex flex-wrap gap-2">
                  <Pill><Tag className="h-3 w-3" /> Type: Operational</Pill>
                  <Pill><ShieldAlert className="h-3 w-3" /> Crisis level ≥ L2</Pill>
                </div>
              </div>

              {/* And criteria */}
              <div className="rounded-md border border-border p-4">
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground/70 mb-2">And criteria</div>
                <div className="flex flex-wrap gap-2">
                  <Pill><Filter className="h-3 w-3" /> Pax impacted &gt; 150</Pill>
                  <Pill><Filter className="h-3 w-3" /> Influencer involved = true</Pill>
                  <button className="inline-flex items-center gap-1 rounded-full border border-dashed border-border px-2.5 py-1 text-xs text-muted-foreground/70 hover:text-foreground">
                    <Plus className="h-3 w-3" /> Add criterion
                  </button>
                </div>
              </div>

              {/* Then actions */}
              <div className="rounded-md border border-border p-4">
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground/70 mb-2">Then do</div>
                <div className="flex flex-wrap gap-2">
                  <Pill><Bot className="h-3 w-3" /> Generate press release + social</Pill>
                  <Pill><Users className="h-3 w-3" /> Notify Comms + Ops on-call</Pill>
                  <Pill><CheckCircle2 className="h-3 w-3" /> Open 2-step approval</Pill>
                  <Pill><Megaphone className="h-3 w-3" /> Auto-publish on approval</Pill>
                </div>
              </div>

              {/* Move to */}
              <div className="rounded-md border border-border p-4">
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground/70 mb-2">Move incident to</div>
                <div className="flex flex-wrap gap-2">
                  <Pill><CircleDot className="h-3 w-3" /> Status: Active → Containment</Pill>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </section>

      {/* Templates */}
      <section className="border-t border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <p className="text-xs uppercase tracking-widest text-primary">Templates</p>
            <h2 className="mt-3 text-3xl sm:text-4xl font-bold tracking-tight">
              Start from a proven playbook.
            </h2>
            <p className="mt-4 text-muted-foreground">
              Common workflows your team can adopt in minutes and tune to your reality.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {TEMPLATES.map((t) => (
              <Card key={t.name} className="bg-card border-border p-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-9 w-9 rounded-md bg-primary/15 flex items-center justify-center text-primary">
                    <t.icon className="h-5 w-5" />
                  </div>
                  <h3 className="text-base font-semibold">{t.name}</h3>
                </div>
                <div className="text-xs uppercase tracking-wider text-muted-foreground/70 mt-4">Trigger</div>
                <p className="text-sm text-muted-foreground mt-1">{t.trigger}</p>
                <div className="text-xs uppercase tracking-wider text-muted-foreground/70 mt-4">Actions</div>
                <ul className="mt-1 space-y-1 text-sm text-muted-foreground">
                  {t.actions.map((a) => (
                    <li key={a} className="flex items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-primary" /> {a}
                    </li>
                  ))}
                </ul>
                <div className="text-xs uppercase tracking-wider text-muted-foreground/70 mt-4">Next status</div>
                <p className="text-sm text-muted-foreground mt-1">{t.status}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">Design your first workflow with us.</h2>
          <p className="mt-4 text-muted-foreground max-w-xl mx-auto">
            We'll map your existing playbooks into Sevra so your team's response is automatic from day one.
          </p>
          <Link
            to="/#contact"
            className="mt-8 inline-flex items-center gap-2 rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            Talk to us <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </div>
  );
}
