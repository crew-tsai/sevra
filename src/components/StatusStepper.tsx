import { cn } from "@/lib/utils";
import type { IncidentStatus } from "@/lib/types";
import { AlertCircle, Eye, ShieldCheck, CheckCircle2 } from "lucide-react";
import { useMessages } from "@/i18n";
import { commonMessages } from "@/i18n/messages/common";

const STAGES: { key: IncidentStatus; icon: typeof AlertCircle }[] = [
  { key: "active", icon: AlertCircle },
  { key: "monitoring", icon: Eye },
  { key: "contained", icon: ShieldCheck },
  { key: "resolved", icon: CheckCircle2 },
];

/**
 * Where an incident is in its life, and — when the caller passes onChange —
 * how it is moved.
 *
 * It was presentational only. Nothing anywhere in the app could write
 * incidents.status, so every incident opened as Active and stayed Active
 * forever: the four stages were a picture. That is not a cosmetic gap. A
 * crisis that never ends keeps appearing in Critical Top 3, keeps counting
 * towards "active now", and can never reach the after-action review, which
 * only offers itself once the thing is over.
 *
 * Without onChange it stays exactly as it was, so any read-only use is
 * unaffected.
 */
export function StatusStepper({
  status,
  className,
  onChange,
  busy,
}: {
  status: IncidentStatus;
  className?: string;
  onChange?: (next: IncidentStatus) => void;
  busy?: boolean;
}) {
  const currentIdx = STAGES.findIndex((s) => s.key === status);
  const t = useMessages(commonMessages);
  const interactive = !!onChange;

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
                <button
                  type="button"
                  disabled={!interactive || busy || isCurrent}
                  onClick={() => onChange?.(stage.key)}
                  // Reads as a label when it cannot be used, and as a control
                  // when it can, rather than looking clickable either way.
                  aria-current={isCurrent ? "step" : undefined}
                  aria-label={t.status[stage.key]}
                  className={cn(
                    "h-8 w-8 rounded-full flex items-center justify-center border-2 transition-colors",
                    isCurrent && "border-primary bg-primary text-primary-foreground",
                    isDone && "border-primary bg-primary/10 text-primary",
                    !isCurrent && !isDone && "border-border bg-background text-muted-foreground",
                    interactive && !isCurrent && !busy &&
                      "cursor-pointer hover:border-primary hover:text-primary",
                    (!interactive || isCurrent) && "cursor-default",
                    busy && "opacity-60",
                  )}
                >
                  <Icon className="h-4 w-4" />
                </button>
                <span
                  className={cn(
                    "text-[11px] font-medium",
                    isCurrent && "text-foreground",
                    isDone && "text-primary",
                    !isCurrent && !isDone && "text-muted-foreground",
                  )}
                >
                  {t.status[stage.key]}
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
