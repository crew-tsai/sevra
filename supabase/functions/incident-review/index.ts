// The after-action report for one incident.
//
// Every fact it needs was already in the database and spread across five
// tables, which is why writing one was a week of somebody's evenings rather
// than a button. The sequence, the timings and the numbers are measured here
// — never asked of the model — and the model is given them to narrate.
//
// If the model cannot be reached the report is still produced, as the measured
// sequence alone, and says so. A post-mortem that fails to exist because a
// provider was busy is the least defensible failure in this product.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { identifyCaller, unauthorized } from "../_shared/caller.ts";
import { chatCompletion, MODELS } from "../_shared/ai.ts";
import { profileFor } from "../_shared/industries.ts";
import { CRISIS_RULES } from "../_shared/crisis-level.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const minutesBetween = (a: string, b: string) =>
  Math.max(0, Math.round((new Date(b).getTime() - new Date(a).getTime()) / 60_000));

const human = (minutes: number | null, lang: string) => {
  if (minutes === null) return lang === "es" ? "no ocurrió" : "did not happen";
  if (minutes < 90) return `${minutes} min`;
  return `${Math.round((minutes / 60) * 10) / 10} h`;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey);

    // Classified rather than trusted for having got in: the gateway accepts
    // the publishable key as a valid JWT, so a request reaching this code
    // proves nothing about who sent it.
    const caller = await identifyCaller(req);
    if (caller.kind !== "user") return unauthorized();
    const userId = caller.userId;

    const { incident_id, lang: rawLang } = await req.json().catch(() => ({}));
    if (!incident_id) throw new Error("incident_id is required");
    const lang = rawLang === "es" ? "es" : "en";

    const { data: incident } = await admin
      .from("incidents").select("*").eq("id", incident_id).maybeSingle();
    if (!incident) throw new Error("Incident not found");

    const [{ data: settings }, { data: mentions }, { data: audit }, { data: assets }, { data: sends }] =
      await Promise.all([
        admin.from("company_settings").select("company_name, industry").maybeSingle(),
        admin
          .from("social_mentions")
          .select("channel, author_handle, content, ai_risk, posted_at, created_at, is_influencer, human_risk, monitor_sources(name, role)")
          .eq("incident_id", incident_id)
          .order("created_at"),
        admin
          .from("incident_audit_log")
          .select("changed_at, field_name, old_value, new_value, change_source")
          .eq("incident_id", incident_id)
          .order("changed_at"),
        admin
          .from("incident_assets")
          .select("asset_type, title, created_at, approval_status, approved_at")
          .eq("incident_id", incident_id)
          .order("created_at"),
        admin
          .from("communication_sends")
          .select("channel, method, status, recipients, asset_title, sent_at")
          .eq("incident_id", incident_id)
          .order("sent_at"),
      ]);

    const vocab = profileFor(settings?.industry);
    const openedAt = incident.created_at as string;

    // Measured, never asked of the model. A post-mortem whose numbers were
    // guessed by a language model is worse than no post-mortem: it reads
    // exactly as authoritative and is not.
    const sentRows = (sends ?? []).filter((s) => s.status === "sent");
    const firstDraft = assets?.[0]?.created_at ?? null;
    const firstApproval = (assets ?? []).map((a) => a.approved_at).filter(Boolean).sort()[0] ?? null;
    const firstSend = sentRows[0]?.sent_at ?? null;
    const levelChanges = (audit ?? []).filter((e) => e.field_name === "crisis_level");

    const metrics = {
      opened_at: openedAt,
      final_level: incident.crisis_level ?? 0,
      peak_level: Math.max(
        Number(incident.crisis_level ?? 0),
        ...levelChanges.map((e) => Number(e.new_value ?? 0)),
      ),
      mentions: mentions?.length ?? 0,
      amplified_mentions: (mentions ?? []).filter((m) => m.is_influencer).length,
      assets_drafted: assets?.length ?? 0,
      assets_approved: (assets ?? []).filter((a) => a.approval_status === "approved").length,
      sends: sentRows.length,
      failed_sends: (sends ?? []).filter((s) => s.status === "failed").length,
      minutes_to_first_draft: firstDraft ? minutesBetween(openedAt, firstDraft) : null,
      minutes_to_first_approval: firstApproval ? minutesBetween(openedAt, firstApproval) : null,
      minutes_to_first_send: firstSend ? minutesBetween(openedAt, firstSend) : null,
      status: incident.status,
    };

    const timeline = [
      `${openedAt} — incident opened at L${incident.crisis_level ?? 0} (${incident.risk})`,
      ...(mentions ?? []).map((m) => {
        // The embed comes back as an object here, but the generated types
        // describe the general case as an array; normalised rather than cast
        // away, so a shape change is caught instead of ignored.
        // deno-lint-ignore no-explicit-any
        const raw = (m as any).monitor_sources;
        const src = (Array.isArray(raw) ? raw[0] : raw) as { name?: string; role?: string } | null;
        return `${m.posted_at ?? m.created_at} — mention on ${m.channel} from @${m.author_handle}${
          src?.name ? ` (watched source: ${src.name}, ${src.role})` : ""
        }${m.is_influencer ? " [amplified]" : ""}: ${String(m.content ?? "").slice(0, 200)}`;
      }),
      ...(audit ?? []).map(
        (e) =>
          `${e.changed_at} — ${e.field_name}: ${e.old_value ?? "—"} → ${e.new_value ?? "—"} (${
            e.change_source && e.change_source !== "manual" ? "by Sevra" : "by a person"
          })`,
      ),
      ...(assets ?? []).map((a) => `${a.created_at} — drafted: ${a.title}`),
      ...(assets ?? []).filter((a) => a.approved_at).map((a) => `${a.approved_at} — approved: ${a.title}`),
      ...(sends ?? []).map(
        (s) =>
          `${s.sent_at} — ${s.status === "sent" ? "sent" : "FAILED to send"}: ${s.asset_title ?? "a communication"} on ${s.channel}${
            s.recipients ? ` to ${s.recipients} people` : ""
          }${s.method === "manual" ? " (posted by hand, reported by the sender)" : ""}`,
      ),
    ]
      .sort()
      .join("\n");

    const measured = [
      `Opened: ${openedAt}`,
      `Level: reached L${metrics.peak_level}, closed at L${metrics.final_level} (${CRISIS_RULES.labels[metrics.final_level] ?? ""})`,
      `Mentions collected: ${metrics.mentions} (${metrics.amplified_mentions} amplified)`,
      `Time to first draft: ${human(metrics.minutes_to_first_draft, lang)}`,
      `Time to first approval: ${human(metrics.minutes_to_first_approval, lang)}`,
      `Time to first communication leaving: ${human(metrics.minutes_to_first_send, lang)}`,
      `Communications: ${metrics.assets_drafted} drafted, ${metrics.assets_approved} approved, ${metrics.sends} sent${
        metrics.failed_sends ? `, ${metrics.failed_sends} failed` : ""
      }`,
    ].join("\n");

    const company = settings?.company_name ?? "the organization";
    let content: string;
    let generatedBy: "ai" | "facts" = "ai";

    const aiResp = await chatCompletion({
      model: MODELS.reasoning,
      messages: [
        {
          role: "system",
          content:
            `You are SEVRA, writing the after-action review of a crisis for ${company}${
              settings?.industry ? ` (${settings.industry})` : ""
            }. ` +
            `Write it for the communications director to take to their board. Sections: What happened; How we responded; What the numbers say; What went well; What to change. ` +
            `Every number and time is given to you below — use those exactly and invent none. Where the record shows a gap, say so plainly rather than filling it. ` +
            `Do not praise the tool. Judge the response, including where it was slow. ` +
            (lang === "es"
              ? "Escribe en español neutro y profesional."
              : "Write in clear professional English.") +
            ` Use the term "${vocab.peopleLabel}" for affected people. Markdown, no preamble.`,
        },
        {
          role: "user",
          content:
            `INCIDENT\nTitle: ${incident.title}\nType: ${incident.incident_type}${
              incident.sub_type ? ` / ${incident.sub_type}` : ""
            }\nDescription: ${incident.description ?? "n/a"}\nInjury or fatality: ${
              incident.injury_fatality ? "yes" : "no"
            }\nRegulator involved: ${incident.regulator_involved ? "yes" : "no"}\n\nMEASURED\n${measured}\n\nTIMELINE\n${timeline}`,
        },
      ],
    });

    if (aiResp.ok) {
      const json = await aiResp.json();
      content = json.choices?.[0]?.message?.content ?? "";
      if (!content.trim()) generatedBy = "facts";
    } else {
      generatedBy = "facts";
      content = "";
    }

    if (generatedBy === "facts") {
      // The provider was unreachable. The sequence and the numbers are the
      // valuable half anyway, and they are measured rather than written, so
      // the report still exists — labelled as what it is.
      const heading = lang === "es" ? "Revisión posterior" : "After-action review";
      const note =
        lang === "es"
          ? "_Generado a partir del registro del incidente, sin IA: no se pudo contactar con el proveedor. Los hechos y los tiempos son medidos, no redactados._"
          : "_Assembled from the incident record without AI: the provider could not be reached. The facts and timings are measured, not written._";
      content = `# ${heading}: ${incident.title}\n\n${note}\n\n## ${
        lang === "es" ? "Lo medido" : "What the record says"
      }\n\n${measured}\n\n## ${lang === "es" ? "Secuencia" : "Sequence"}\n\n${timeline}`;
    }

    const { error: upsertErr } = await admin
      .from("incident_reviews")
      .upsert(
        {
          incident_id,
          content,
          metrics,
          generated_by: generatedBy,
          language: lang,
          created_by: userId,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "incident_id" },
      );
    if (upsertErr) throw upsertErr;

    return new Response(JSON.stringify({ success: true, generated_by: generatedBy, metrics }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
    // deno-lint-ignore no-explicit-any
  } catch (e: any) {
    console.error("incident-review error:", e);
    return new Response(JSON.stringify({ success: false, error: e?.message ?? String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
