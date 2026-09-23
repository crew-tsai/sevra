import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * A timestamp as a person reads it, in their own locale.
 *
 * Lived twice, identically, in Sevra.tsx and IncidentDetail.tsx. Two copies of
 * a date format is how two screens end up disagreeing about when something
 * happened, which in a crisis log is not a cosmetic problem.
 */
export const formatDateTime = (iso: string | null | undefined, locale?: string) => {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  return d.toLocaleString(locale, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};
