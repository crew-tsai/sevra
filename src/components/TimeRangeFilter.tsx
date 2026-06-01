import { useState } from "react";
import { format, startOfDay, startOfWeek } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export type TimeRangePreset = "today" | "this_week" | "custom";

export type TimeRange = {
  preset: TimeRangePreset;
  from: Date | null;
  to: Date | null;
};

export const DEFAULT_TIME_RANGE: TimeRange = presetRange("this_week");

export function presetRange(preset: Exclude<TimeRangePreset, "custom">): TimeRange {
  const to = new Date();
  let from = new Date();
  if (preset === "today") {
    from = startOfDay(to);
  }
  if (preset === "this_week") {
    from = startOfWeek(to, { weekStartsOn: 1 });
  }
  return { preset, from, to };
}

export const isInRange = (iso: string | null | undefined, range: TimeRange) => {
  if (!range.from) return true;
  if (!iso) return false;
  const t = new Date(iso).getTime();
  if (isNaN(t)) return false;
  if (t < range.from.getTime()) return false;
  if (range.to && t > range.to.getTime() + 24 * 60 * 60 * 1000) return false;
  return true;
};

export function TimeRangeFilter({
  value,
  onChange,
  className,
}: {
  value: TimeRange;
  onChange: (next: TimeRange) => void;
  className?: string;
}) {
  const [open, setOpen] = useState(false);

  const presets: { key: TimeRangePreset; label: string }[] = [
    { key: "today", label: "Today" },
    { key: "this_week", label: "This Week" },
  ];

  const customLabel =
    value.preset === "custom" && value.from
      ? `${format(value.from, "MMM d")} – ${value.to ? format(value.to, "MMM d, yyyy") : "…"}`
      : "Custom";

  return (
    <div className={cn("flex items-center gap-1 flex-wrap", className)}>
      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider mr-1">Time:</span>
      {presets.map((p) => {
        const active = value.preset === p.key;
        return (
          <button
            key={p.key}
            onClick={() => onChange(presetRange(p.key))}
            className={cn(
              "rounded-full border px-3 py-1 text-xs transition-colors",
              active
                ? "border-primary bg-primary/10 text-primary"
                : "border-border text-muted-foreground hover:bg-accent",
            )}
          >
            {p.label}
          </button>
        );
      })}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs transition-colors",
              value.preset === "custom"
                ? "border-primary bg-primary/10 text-primary"
                : "border-border text-muted-foreground hover:bg-accent",
            )}
          >
            <CalendarIcon className="h-3 w-3" />
            {customLabel}
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="range"
            selected={{ from: value.from ?? undefined, to: value.to ?? undefined }}
            onSelect={(r) => {
              if (!r?.from) return;
              onChange({ preset: "custom", from: r.from, to: r.to ?? null });
              if (r.from && r.to) setOpen(false);
            }}
            numberOfMonths={2}
            initialFocus
            className={cn("p-3 pointer-events-auto")}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
