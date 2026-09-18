// Shows AI-written (or person-written) content in the current language.
//
// Records carry their Spanish, and sometimes their English, under
// `translations`. When the version for the current language is missing, this
// asks translate-content to fill it in -- once per record, ever, since the
// result is stored -- and shows the original until it arrives.
import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLang } from "@/i18n";

type Table = "incidents" | "social_mentions" | "response_plan";
type Tr = { en?: Record<string, unknown>; es?: Record<string, unknown> } | null | undefined;
type Row = { id: string; translations?: unknown };

export function useTranslations(table: Table, rows: ReadonlyArray<Row | null | undefined>) {
  const { lang } = useLang();
  const [filled, setFilled] = useState<Record<string, Tr>>({});
  const requested = useRef(new Set<string>());

  const current = (row: Row): Tr => filled[row.id] ?? (row.translations as Tr);

  // Missing means: no Spanish when reading in Spanish, or nothing at all when
  // reading in English (a record typed in Spanish has only Spanish).
  const ids = rows
    .filter((r): r is Row => !!r?.id)
    .filter((r) => {
      const t = current(r);
      return lang === "es" ? !t?.es : !t;
    })
    .map((r) => r.id)
    .filter((id) => !requested.current.has(id));
  const key = ids.join(",");

  useEffect(() => {
    if (!ids.length) return;
    ids.forEach((id) => requested.current.add(id));
    let cancelled = false;
    for (let i = 0; i < ids.length; i += 25) {
      const batch = ids.slice(i, i + 25);
      supabase.functions
        .invoke("translate-content", { body: { table, ids: batch } })
        .then(({ data }) => {
          const got = (data as { translations?: Record<string, Tr> } | null)?.translations;
          if (!cancelled && got && Object.keys(got).length) setFilled((prev) => ({ ...prev, ...got }));
        })
        .catch(() => {
          // Showing the original is the fallback; a later view tries again.
          batch.forEach((id) => requested.current.delete(id));
        });
    }
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, table]);

  const text = useCallback(
    (row: Row | null | undefined, field: string): string => {
      if (!row) return "";
      const base = (row as Record<string, unknown>)[field];
      const v = current(row)?.[lang]?.[field];
      return typeof v === "string" && v.trim() ? v : typeof base === "string" ? base : "";
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [filled, lang],
  );

  const list = useCallback(
    (row: Row | null | undefined, field: string): string[] => {
      if (!row) return [];
      const base = (row as Record<string, unknown>)[field];
      const v = current(row)?.[lang]?.[field];
      if (Array.isArray(v) && v.every((x) => typeof x === "string")) return v as string[];
      return Array.isArray(base) ? (base as string[]) : [];
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [filled, lang],
  );

  return { text, list };
}
