import { cn } from "@/lib/utils";
import { useMessages } from "@/i18n";
import { commonMessages } from "@/i18n/messages/common";

const META: Record<number, { short: string; className: string }> = {
  0: { short: "L0", className: "bg-risk-low-bg text-risk-low" },
  1: { short: "L1", className: "bg-risk-low-bg text-risk-low" },
  2: { short: "L2", className: "bg-risk-medium-bg text-risk-medium" },
  3: { short: "L3", className: "bg-risk-high-bg text-risk-high" },
  4: { short: "L4", className: "bg-risk-critical-bg text-risk-critical" },
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
  const t = useMessages(commonMessages);
  if (level === null || level === undefined || !(level in META)) return null;
  const m = { ...META[level], label: t.level[level] };
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
