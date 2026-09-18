import { cn } from "@/lib/utils";
import type { RiskLevel } from "@/lib/types";
import { useMessages } from "@/i18n";
import { commonMessages } from "@/i18n/messages/common";

const riskConfig: Record<RiskLevel, { className: string }> = {
  critical: { className: "bg-risk-critical-bg text-risk-critical" },
  high: { className: "bg-risk-high-bg text-risk-high" },
  medium: { className: "bg-risk-medium-bg text-risk-medium" },
  low: { className: "bg-risk-low-bg text-risk-low" },
};

export function RiskBadge({ level, className }: { level: RiskLevel; className?: string }) {
  const config = riskConfig[level];
  const t = useMessages(commonMessages);
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium", config.className, className)}>
      <span className={cn("h-1.5 w-1.5 rounded-full", {
        "bg-risk-critical": level === "critical",
        "bg-risk-high": level === "high",
        "bg-risk-medium": level === "medium",
        "bg-risk-low": level === "low",
      })} />
      {t.risk[level] ?? level}
    </span>
  );
}
