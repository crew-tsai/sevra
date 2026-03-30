import { cn } from "@/lib/utils";
import type { RiskLevel } from "@/lib/mock-data";

const riskConfig: Record<RiskLevel, { label: string; className: string }> = {
  critical: { label: "Critical", className: "bg-risk-critical-bg text-risk-critical" },
  high: { label: "High", className: "bg-risk-high-bg text-risk-high" },
  medium: { label: "Medium", className: "bg-risk-medium-bg text-risk-medium" },
  low: { label: "Low", className: "bg-risk-low-bg text-risk-low" },
};

export function RiskBadge({ level, className }: { level: RiskLevel; className?: string }) {
  const config = riskConfig[level];
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium", config.className, className)}>
      <span className={cn("h-1.5 w-1.5 rounded-full", {
        "bg-risk-critical": level === "critical",
        "bg-risk-high": level === "high",
        "bg-risk-medium": level === "medium",
        "bg-risk-low": level === "low",
      })} />
      {config.label}
    </span>
  );
}
