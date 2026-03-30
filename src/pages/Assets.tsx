import { statements, type Statement, type ApprovalStatus } from "@/lib/mock-data";
import { FileText, Globe, Users, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";

const typeIcons = {
  press: Globe,
  internal: Users,
  social: MessageSquare,
  stakeholder: FileText,
};

const typeLabels = {
  press: "Press Release",
  internal: "Internal Memo",
  social: "Social Media",
  stakeholder: "Stakeholder",
};

const approvalColors: Record<ApprovalStatus, string> = {
  pending: "bg-risk-medium-bg text-risk-medium",
  approved: "bg-risk-low-bg text-risk-low",
  rejected: "bg-risk-critical-bg text-risk-critical",
};

export default function Assets() {
  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Generated Statements</h1>
        <p className="text-sm text-muted-foreground mt-1">AI-drafted communications for review and approval</p>
      </div>

      <div className="space-y-4">
        {statements.map((statement) => {
          const Icon = typeIcons[statement.type];
          return (
            <div key={statement.id} className="rounded-lg border border-border bg-card p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xs font-medium text-muted-foreground">{typeLabels[statement.type]}</span>
                  <span className="text-xs font-mono text-muted-foreground/60">{statement.id}</span>
                </div>
                <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize", approvalColors[statement.status])}>
                  {statement.status}
                </span>
              </div>
              <h3 className="text-sm font-semibold text-foreground mb-2">{statement.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{statement.content}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
