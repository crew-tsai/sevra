import { cn } from "@/lib/utils";

const META: Record<number, { label: string; short: string; className: string }> = {
  0: { label: "L0 · Routine", short: "L0", className: "bg-risk-low-bg text-risk-low" },
  1: { label: "L1 · Localized", short: "L1", className: "bg-risk-low-bg text-risk-low" },
  2: { label: "L2 · Significant", short: "L2", className: "bg-risk-medium-bg text-risk-medium" },
  3: { label: "L3 · Major", short: "L3", className: "bg-risk-high-bg text-risk-high" },
  4: { label: "L4 · Catastrophic", short: "L4", className: "bg-risk-critical-bg text-risk-critical" },
};

export function CrisisLevelBadge({
  level,
  compact = false,
  className,
}: {
  level: number | null | undefined;
  compact?: boolean;
  className?: string;
}) {
  if (level === null || level === undefined || !(level in META)) return null;
  const m = META[level];
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        m.className,
        className,
      )}
      title={m.label}
    >
      {compact ? m.short : m.label}
    </span>
  );
}
