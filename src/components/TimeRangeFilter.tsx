import { useState } from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export type TimeRangePreset = "30d" | "90d" | "custom" | "all";

export type TimeRange = {
  preset: TimeRangePreset;
  from: Date | null;
  to: Date | null;
};

export const ALL_TIME: TimeRange = { preset: "all", from: null, to: null };

export const presetRange = (preset: Exclude<TimeRangePreset, "custom" | "all">): TimeRange => {
  const to = new Date();
  const from = new Date();
  if (preset === "30d") from.setDate(from.getDate() - 30);
  if (preset === "90d") from.setDate(from.getDate() - 90);
  return { preset, from, to };
};

export const isInRange = (iso: string | null | undefined, range: TimeRange) => {
  if (range.preset === "all" || !range.from) return true;
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
    { key: "all", label: "All time" },
    { key: "30d", label: "Last 30 days" },
    { key: "90d", label: "Last 90 days" },
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
            onClick={() => onChange(p.key === "all" ? ALL_TIME : presetRange(p.key as "30d" | "90d"))}
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
