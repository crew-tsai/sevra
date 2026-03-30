import { Shield, Clock, Users, AlertTriangle } from "lucide-react";

const strategies = [
  {
    phase: "Immediate (0-4 hours)",
    icon: AlertTriangle,
    actions: [
      "Activate incident response team and assign incident commander",
      "Isolate affected systems and revoke compromised credentials",
      "Begin forensic evidence preservation",
      "Notify legal counsel and engage external forensics firm",
    ],
  },
  {
    phase: "Short-term (4-24 hours)",
    icon: Clock,
    actions: [
      "Complete initial scope assessment and affected records count",
      "Draft regulatory notification (GDPR Article 33 — 72h deadline)",
      "Prepare internal communications for all-hands briefing",
      "Identify affected customers and segment for notification priority",
    ],
  },
  {
    phase: "Medium-term (1-7 days)",
    icon: Users,
    actions: [
      "Send customer notification emails in priority batches",
      "Issue press release and coordinate media responses",
      "Implement additional security controls and monitoring",
      "Engage credit monitoring service for affected individuals",
    ],
  },
  {
    phase: "Long-term (1-4 weeks)",
    icon: Shield,
    actions: [
      "Complete full forensic investigation and root cause analysis",
      "Implement permanent remediation measures",
      "Conduct post-incident review and update response playbooks",
      "Report to board and update risk register",
    ],
  },
];

export default function Strategy() {
  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Response Strategy</h1>
        <p className="text-sm text-muted-foreground mt-1">AI-recommended response plan for INC-001 — Data breach in EU customer database</p>
      </div>

      <div className="space-y-4">
        {strategies.map((strategy) => (
          <div key={strategy.phase} className="rounded-lg border border-border bg-card p-5">
            <div className="flex items-center gap-2 mb-3">
              <strategy.icon className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-semibold text-foreground">{strategy.phase}</h2>
            </div>
            <ul className="space-y-2">
              {strategy.actions.map((action, idx) => (
                <li key={idx} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <span className="mt-1.5 h-1 w-1 rounded-full bg-muted-foreground/40 shrink-0" />
                  {action}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
