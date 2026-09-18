// Fills in the missing language of a record, once.
//
// The AI writes new incidents, summaries and plans in both languages as it
// creates them. Everything else -- records from before that, and incidents
// people type in by hand, in either language -- is translated here the first
// time someone opens it. The result is stored on the record, so each one is
// translated at most once, whoever views it next and in whichever language.
//
// Signed-in users only. Only the listed tables and fields can be touched, and
// only the `translations` column is ever written.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { identifyCaller, unauthorized } from "../_shared/caller.ts";
import { chatCompletion, MODELS } from "../_shared/ai.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const FIELDS: Record<string, string[]> = {
  incidents: ["title", "description"],
  social_mentions: ["ai_summary"],
  response_plan: ["phase_immediate", "phase_short", "phase_medium", "phase_long"],
};

const MAX_IDS = 25;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

/** Both languages already present: nothing to do. */
function complete(tr: unknown): boolean {
  const t = tr as { en?: unknown; es?: unknown } | null;
  return !!t?.es && !!t?.en;
}

async function translate(fields: Record<string, unknown>): Promise<{ en: Record<string, unknown>; es: Record<string, unknown> } | null> {
  // Each field named in the schema. Described only as "an object", the model
  // returned empty objects and nothing was translated.
  const side = {
    type: "object",
    properties: Object.fromEntries(
      Object.entries(fields).map(([k, v]) => [k, Array.isArray(v) ? { type: "array", items: { type: "string" } } : { type: "string" }]),
    ),
    required: Object.keys(fields),
  };
  const res = await chatCompletion({
    model: MODELS.fast,
    messages: [
      {
        role: "system",
        content:
          "You translate crisis-management records between English and Spanish. The input is a JSON object " +
          "whose values are strings or arrays of strings, written in English, Spanish, or a mix. Return the " +
          "same object twice: `en`, entirely in English, and `es`, entirely in neutral professional Spanish. " +
          "Where a value is already in the target language, return it unchanged. Keep every key, keep arrays " +
          "the same length and order, keep line breaks, and leave proper nouns, handles, codes, numbers and " +
          "URLs exactly as they are.",
      },
      { role: "user", content: JSON.stringify(fields) },
    ],
    tools: [
      {
        type: "function",
        function: {
          name: "emit_translations",
          description: "The record in English and in Spanish.",
          parameters: {
            type: "object",
            properties: {
              en: { ...side, description: "Every input key, in English" },
              es: { ...side, description: "Every input key, in Spanish" },
            },
            required: ["en", "es"],
          },
        },
      },
    ],
    tool_choice: { type: "function", function: { name: "emit_translations" } },
  });
  if (!res.ok) {
    console.error("translate-content AI error", res.status, (await res.text()).slice(0, 200));
    return null;
  }
  const out = await res.json();
  const call = out.choices?.[0]?.message?.tool_calls?.[0];
  if (!call) return null;
  const parsed = JSON.parse(call.function.arguments) as { en?: Record<string, unknown>; es?: Record<string, unknown> };
  if (!parsed.en || !parsed.es) return null;

  // Keep only the keys that were sent, with the shape they were sent in, so
  // the model cannot add fields or turn a list into a sentence.
  const shape = (side: Record<string, unknown>) =>
    Object.fromEntries(
      Object.entries(fields).map(([k, orig]) => {
        const v = side[k];
        if (Array.isArray(orig)) {
          return [k, Array.isArray(v) && v.length === orig.length && v.every((x) => typeof x === "string") ? v : orig];
        }
        return [k, typeof v === "string" && v.trim() ? v : orig];
      }),
    );
  const en = shape(parsed.en);
  const es = shape(parsed.es);

  // Identical in both languages means one of them was not translated -- the
  // fallback above keeps the original when the model's answer is unusable.
  // Storing that would mark the record done and never retry it, so give up
  // instead and let the next view try again. Short values (codes, names) can
  // legitimately match, so only prose counts.
  const prose = Object.entries(fields).filter(([, v]) => typeof v === "string" && v.length > 40).map(([k]) => k);
  if (prose.length && prose.every((k) => en[k] === es[k])) return null;

  return { en, es };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const caller = await identifyCaller(req);
  if (caller.kind === "anonymous") return unauthorized();

  try {
    const { table, ids } = await req.json().catch(() => ({}));
    const fields = FIELDS[table as string];
    if (!fields) return json({ error: "Unsupported table" }, 400);
    const wanted = (Array.isArray(ids) ? ids : [])
      .filter((x: unknown): x is string => typeof x === "string" && /^[0-9a-f-]{36}$/i.test(x))
      .slice(0, MAX_IDS);
    if (!wanted.length) return json({ translations: {} });

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: rows, error } = await admin
      .from(table)
      .select(["id", "translations", ...fields].join(","))
      .in("id", wanted);
    if (error) throw error;

    const result: Record<string, unknown> = {};
    await Promise.all(
      (rows ?? []).map(async (row: any) => {
        if (complete(row.translations)) {
          result[row.id] = row.translations;
          return;
        }
        const source = Object.fromEntries(
          fields
            .map((f) => [f, row[f]])
            .filter(([, v]) => (typeof v === "string" && v.trim()) || (Array.isArray(v) && v.length)),
        );
        if (!Object.keys(source).length) return;

        const t = await translate(source);
        if (!t) return;
        // Spanish the AI wrote at creation time is kept over a re-translation.
        const merged = { en: t.en, es: { ...t.es, ...((row.translations?.es as object) ?? {}) } };
        const { error: upErr } = await admin.from(table).update({ translations: merged }).eq("id", row.id);
        if (upErr) console.error("translate-content save failed", upErr.message);
        result[row.id] = merged;
      }),
    );

    return json({ translations: result });
  } catch (e) {
    console.error("translate-content error:", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
