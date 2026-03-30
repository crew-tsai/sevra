import { cn } from "@/lib/utils";
import type { IncidentStatus } from "@/lib/mock-data";

const statusConfig: Record<IncidentStatus, { label: string; className: string }> = {
  active: { label: "Active", className: "bg-risk-critical-bg text-risk-critical" },
  monitoring: { label: "Monitoring", className: "bg-risk-high-bg text-risk-high" },
  contained: { label: "Contained", className: "bg-risk-medium-bg text-risk-medium" },
  resolved: { label: "Resolved", className: "bg-risk-low-bg text-risk-low" },
};

export function StatusBadge({ status, className }: { status: IncidentStatus; className?: string }) {
  const config = statusConfig[status];
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium", config.className, className)}>
      {config.label}
    </span>
  );
}
