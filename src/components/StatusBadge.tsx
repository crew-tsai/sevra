import { cn } from "@/lib/utils";
import type { IncidentStatus } from "@/lib/types";
import { useMessages } from "@/i18n";
import { commonMessages } from "@/i18n/messages/common";

const statusConfig: Record<IncidentStatus, { className: string }> = {
  active: { className: "bg-risk-critical-bg text-risk-critical" },
  monitoring: { className: "bg-risk-high-bg text-risk-high" },
  contained: { className: "bg-risk-medium-bg text-risk-medium" },
  resolved: { className: "bg-risk-low-bg text-risk-low" },
};

export function StatusBadge({ status, className }: { status: IncidentStatus; className?: string }) {
  const config = statusConfig[status];
  const t = useMessages(commonMessages);
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium", config.className, className)}>
      {t.status[status] ?? status}
    </span>
  );
}
