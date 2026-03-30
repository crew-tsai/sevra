import { useState } from "react";
import { statements as initialStatements, type Statement } from "@/lib/mock-data";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

export default function Approvals() {
  const [items, setItems] = useState<Statement[]>(initialStatements);

  const updateStatus = (id: string, status: "approved" | "rejected") => {
    setItems((prev) => prev.map((s) => (s.id === id ? { ...s, status } : s)));
  };

  const pending = items.filter((s) => s.status === "pending");
  const completed = items.filter((s) => s.status !== "pending");

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Approval Workflow</h1>
        <p className="text-sm text-muted-foreground mt-1">Review and approve crisis communications before distribution</p>
      </div>

      {/* Pending */}
      {pending.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-foreground">Pending Review ({pending.length})</h2>
          {pending.map((item) => (
            <div key={item.id} className="rounded-lg border border-border bg-card p-5">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs font-mono text-muted-foreground">{item.id}</span>
              </div>
              <h3 className="text-sm font-semibold text-foreground mb-2">{item.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed mb-4">{item.content}</p>
              <div className="flex gap-2">
                <Button size="sm" onClick={() => updateStatus(item.id, "approved")} className="gap-1.5">
                  <CheckCircle className="h-3.5 w-3.5" /> Approve
                </Button>
                <Button size="sm" variant="outline" onClick={() => updateStatus(item.id, "rejected")} className="gap-1.5">
                  <XCircle className="h-3.5 w-3.5" /> Reject
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Completed */}
      {completed.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-foreground">Completed ({completed.length})</h2>
          {completed.map((item) => (
            <div key={item.id} className={cn("rounded-lg border bg-card p-4", item.status === "approved" ? "border-risk-low/30" : "border-risk-critical/30")}>
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-mono text-muted-foreground">{item.id}</span>
                  <p className="text-sm font-medium text-foreground mt-0.5">{item.title}</p>
                </div>
                <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize", item.status === "approved" ? "bg-risk-low-bg text-risk-low" : "bg-risk-critical-bg text-risk-critical")}>
                  {item.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
