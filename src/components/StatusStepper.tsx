import { cn } from "@/lib/utils";
import type { IncidentStatus } from "@/lib/mock-data";
import { AlertCircle, Eye, ShieldCheck, CheckCircle2 } from "lucide-react";

const STAGES: { key: IncidentStatus; label: string; icon: typeof AlertCircle }[] = [
  { key: "active", label: "Active", icon: AlertCircle },
  { key: "monitoring", label: "Monitoring", icon: Eye },
  { key: "contained", label: "Contained", icon: ShieldCheck },
  { key: "resolved", label: "Resolved", icon: CheckCircle2 },
];

export function StatusStepper({ status, className }: { status: IncidentStatus; className?: string }) {
  const currentIdx = STAGES.findIndex((s) => s.key === status);

  return (
    <div className={cn("w-full", className)}>
      <div className="flex items-center">
        {STAGES.map((stage, idx) => {
          const isDone = idx < currentIdx;
          const isCurrent = idx === currentIdx;
          const Icon = stage.icon;
          return (
            <div key={stage.key} className="flex items-center flex-1 last:flex-none">
              <div className="flex flex-col items-center gap-1.5 shrink-0">
                <div
                  className={cn(
                    "h-8 w-8 rounded-full flex items-center justify-center border-2 transition-colors",
                    isCurrent && "border-primary bg-primary text-primary-foreground",
                    isDone && "border-primary bg-primary/10 text-primary",
                    !isCurrent && !isDone && "border-border bg-background text-muted-foreground",
                  )}
                >
                  <Icon className="h-4 w-4" />
                </div>
                <span
                  className={cn(
                    "text-[11px] font-medium",
                    isCurrent && "text-foreground",
                    isDone && "text-primary",
                    !isCurrent && !isDone && "text-muted-foreground",
                  )}
                >
                  {stage.label}
                </span>
              </div>
              {idx < STAGES.length - 1 && (
                <div
                  className={cn(
                    "h-0.5 flex-1 mx-2 -mt-5 transition-colors",
                    idx < currentIdx ? "bg-primary" : "bg-border",
                  )}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
