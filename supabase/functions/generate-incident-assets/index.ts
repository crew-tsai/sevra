import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { identifyCaller, unauthorized } from "../_shared/caller.ts";
import { profileFor } from "../_shared/industries.ts";
import { chatCompletion, MODELS } from "../_shared/ai.ts";
import { loadCommsManual } from "../_shared/comms-manual.ts";
import { linkedMentionContext } from "../_shared/linked-mentions.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const ASSET_SPEC = [
  { key: "press_release", title: "Press release", channel: "press", description: "Formal press release for media outlets, ~250 words, factual, includes a quote from leadership." },
  { key: "holding_statement", title: "Holding statement", channel: "press", description: "Short 60-80 word holding statement to use while the situation evolves. Acknowledges the issue, expresses care, no speculation." },
  { key: "post_x", title: "Post for X / Twitter", channel: "social", description: "≤280 characters. Empathetic, factual, links to a help page placeholder." },
  { key: "post_instagram", title: "Post for Instagram", channel: "social", description: "Caption ~150 words, warm tone, includes 3-5 relevant hashtags at the end." },
  { key: "post_facebook", title: "Post for Facebook", channel: "social", description: "150-250 words, warm and factual tone, no strict character limit (unlike X)." },
  { key: "tiktok_script", title: "TikTok script", channel: "social", description: "30-45 seconds, conversational spoken script. Include scene directions in [brackets]." },
  { key: "internal_memo", title: "Internal memo", channel: "internal", description: "Internal communication for all employees. Explains the situation, what we're doing, what we expect from each team." },
  { key: "customer_faq", title: "Customer FAQ", channel: "support", description: "5-7 anticipated customer questions with clear, empathetic answers, formatted as Q: / A:." },
  { key: "faq_media", title: "Q&A — Media", channel: "press", description: "6-8 tough questions journalists are likely to ask, with on-message bridging answers. Format Q: / A:. Include difficult/hostile questions with safe responses." },
  { key: "faq_employees", title: "Q&A — Employees", channel: "internal", description: "6-8 questions employees will ask internally (safety, job impact, what to say externally, support resources). Format Q: / A:, empathetic and clear." },
  { key: "faq_authorities", title: "Q&A — Authorities", channel: "regulatory", description: "5-7 questions the relevant regulators and authorities will ask. Format Q: / A:. Factual, compliance-aware, no speculation, reference cooperation and procedures." },
  { key: "faq_partners", title: "Q&A — Partners", channel: "b2b", description: "5-7 questions from commercial partners (partner operators, hubs/stations, suppliers, corporate clients). Format Q: / A:. Reassure on operational continuity and contractual commitments." },
];

/**
 * What the package is written against.
 *
 * The client's own crisis communications manual when they have uploaded one:
 * it is the document their team was trained on, their spokespersons are named
 * in it, and it is what they will be held to afterwards. Recognised practice is
 * the fallback for a workspace that has not uploaded one yet — and, where the
 * manual is silent, for the gaps it leaves.
 */
function writingBasis(
  manual: { name: string | null; text: string; truncated: boolean } | null,
  industry: string | null,
): { basis: "manual" | "industry_standards"; instructions: string } {
  const vocab = profileFor(industry);
  const standards = `Follow recognised crisis-communication practice for ${industry ?? "this industry"}:
- Acknowledge the situation first and fast. Never wait for full facts to say something; a holding statement that admits what is not yet known beats silence.
- Lead with people. Those affected — ${vocab.peopleLabel.toLowerCase()}, staff, families — come before assets, schedules or reputation.
- Say only what is established. No speculation about cause, blame or numbers; attribute facts to their source; correct errors openly.
- Express regret for the impact without assigning liability.
- State what is being done now, by whom, and when the next update will come.
- One consistent set of facts across every channel; the same message internally and externally, with employees told before they read it in the press.
- Name a single spokesperson voice and keep the tone plain, human and unhedged. No jargon, no corporate abstraction, no blaming ${vocab.peopleLabel.toLowerCase()}.
- Where authorities or regulators are involved, say that they have been notified and that the organization is cooperating — never pre-empt their findings.`;

  if (!manual) return { basis: "industry_standards", instructions: standards };

  return {
    basis: "manual",
    instructions: `This organization has its own crisis communications manual${manual.name ? ` (${manual.name})` : ""}. It is the authority for everything you write: follow its tone, its approval and escalation language, its named spokespersons and roles, its required and forbidden wording, and any statement templates it provides. Use its exact terms for teams, levels and procedures. Where the manual is silent, fall back to recognised practice for ${industry ?? "this industry"}.

--- COMMUNICATIONS MANUAL${manual.truncated ? " (excerpt)" : ""} ---
${manual.text}
--- END OF MANUAL ---

Fallback practice for anything the manual does not cover:
${standards}`,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  // Set once the incident is claimed, so a failure can hand the claim back
  // instead of leaving an incident that will never be drafted again.
  let release: (() => Promise<void>) | null = null;

  try {
    const { incident_id, asset_key, lang: rawLang, auto } = await req.json();
    // Communications are published as written, so they are produced in one
    // language -- the one the person asked for -- rather than in both.
    const lang: "en" | "es" = rawLang === "es" ? "es" : "en";
    if (!incident_id || typeof incident_id !== "string") {
      return new Response(JSON.stringify({ error: "incident_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const singleKey: string | null =
      typeof asset_key === "string" && ASSET_SPEC.some((s) => s.key === asset_key)
        ? asset_key
        : null;
    const targetSpecs = singleKey ? ASSET_SPEC.filter((s) => s.key === singleKey) : ASSET_SPEC;

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Refuse anonymous callers. The user used to be looked up and then ignored
    // when absent, leaving asset generation — AI spend and writes into a
    // client's workspace — open to anyone holding the public anon key. Only
    // the Approvals and Incident pages call this, as a signed-in user.
    const caller = await identifyCaller(req);
    if (caller.kind === "anonymous") return unauthorized();
    const userId: string | null = caller.kind === "user" ? caller.userId : null;

    const admin = createClient(supabaseUrl, serviceKey);

    const { data: incident, error: incErr } = await admin
      .from("incidents")
      .select("*")
      .eq("id", incident_id)
      .maybeSingle();
    if (incErr) throw incErr;
    if (!incident) throw new Error("Incident not found");

    // An automatic draft never overwrites work in progress. The monitor asks
    // for the same incident more than once — a second mention of the same
    // crisis, a retried tick — and by then a person may already have approved
    // some of the pieces. Regenerating deletes them.
    //
    // The conditional UPDATE is the lock: two requests racing for the same
    // incident, which is the ordinary case when one crisis produces several
    // posts, both read "no assets yet" but only one of them claims the row.
    let claimed = false;
    if (auto) {
      const { data: claim } = await admin
        .from("incidents")
        .update({ package_requested_at: new Date().toISOString() })
        .eq("id", incident_id)
        .is("package_requested_at", null)
        .select("id");
      claimed = (claim?.length ?? 0) > 0;
      if (claimed) {
        release = async () => {
          await admin
            .from("incidents")
            .update({ package_requested_at: null })
            .eq("id", incident_id);
        };
      }
      if (!claimed) {
        return new Response(
          JSON.stringify({ success: true, skipped: "package already requested", count: 0 }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    }

    const mentionContext = await linkedMentionContext(admin, incident_id);

    const { data: settings } = await admin
      .from("company_settings")
      .select(
        "company_name, industry, comms_manual_url, comms_manual_name, comms_manual_text, comms_manual_text_source",
      )
      .maybeSingle();
    const companyName = settings?.company_name ?? null;
    const industry = settings?.industry ?? null;
    const vocab = profileFor(industry);
    const { basis, instructions } = writingBasis(await loadCommsManual(admin, settings), industry);

    const context = `
INCIDENT
Title: ${incident.title}
Type: ${incident.incident_type}${incident.sub_type ? ` / ${incident.sub_type}` : ""}
Risk: ${incident.risk} (${incident.risk_score}/100)
${vocab.operatorLabel}: ${incident.airline_name ?? "n/a"}
${vocab.serviceLabel}: ${incident.flight_number ?? "n/a"}
${vocab.routeLabel}: ${incident.route ?? "n/a"} (${incident.country ?? "n/a"})
${vocab.peopleLabel}: ${incident.estimated_passengers_impacted ?? "unknown"}
Injury/fatality: ${incident.injury_fatality ? "yes" : "no"}
Regulator involved: ${incident.regulator_involved ? "yes" : "no"}
Description: ${incident.description ?? "n/a"}

${mentionContext}
`.trim();

    // Single AI call returning all assets via tool call
    const aiResp = await chatCompletion({
      model: MODELS.fast,
      messages: [
        {
          role: "system",
          content:
            `You are SEVRA, a crisis-communication writer for ${companyName ?? "the company"}${industry ? ` (${industry})` : ""}. Produce a complete, ready-to-publish communication package. Be factual, empathetic, and avoid speculation. Match each asset's tone & length brief exactly. ${lang === "es" ? "Write every asset — title and content — in neutral, professional Spanish, whatever the language of the incident details." : "Write every asset — title and content — in English, whatever the language of the incident details."} Output only via the tool call.

${instructions}`,
        },
        {
          role: "user",
          content: `Generate ${singleKey ? "ONLY the following asset" : "the full communication package"} for the following incident.\n\n${context}\n\nAsset briefs:\n${targetSpecs.map((a) => `- ${a.key}: ${a.title} — ${a.description}`).join("\n")}`,
        },
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "emit_assets",
            description: "Return all communication assets for the incident.",
            parameters: {
              type: "object",
              properties: {
                assets: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      key: { type: "string", enum: targetSpecs.map((a) => a.key) },
                      title: { type: "string" },
                      content: { type: "string" },
                    },
                    required: ["key", "title", "content"],
                    additionalProperties: false,
                  },
                },
              },
              required: ["assets"],
              additionalProperties: false,
            },
          },
        },
      ],
      tool_choice: { type: "function", function: { name: "emit_assets" } },
    });

    if (!aiResp.ok) {
      const txt = await aiResp.text();
      if (aiResp.status === 429) {
        return new Response(JSON.stringify({ error: "AI rate limit exceeded, try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResp.status === 402) {
        return new Response(JSON.stringify({ error: "The AI provider reports no remaining quota." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI request failed (${aiResp.status}): ${txt}`);
    }

    const aiJson = await aiResp.json();
    const toolCall = aiJson.choices?.[0]?.message?.tool_calls?.[0];
    const args = toolCall ? JSON.parse(toolCall.function.arguments) : null;
    const generated: Array<{ key: string; title: string; content: string }> = args?.assets ?? [];
    if (!generated.length) throw new Error("AI returned no assets");

    // Remove only what we're regenerating, then insert fresh
    if (singleKey) {
      await admin
        .from("incident_assets")
        .delete()
        .eq("incident_id", incident_id)
        .eq("asset_type", singleKey);
    } else {
      await admin.from("incident_assets").delete().eq("incident_id", incident_id);
    }

    const rows = generated.map((g) => {
      const spec = ASSET_SPEC.find((s) => s.key === g.key);
      return {
        incident_id,
        asset_type: g.key,
        channel: spec?.channel ?? null,
        title: g.title || spec?.title || g.key,
        content: g.content,
        language: lang,
        approval_status: "pending",
        created_by: userId,
      };
    });

    const { error: insErr } = await admin.from("incident_assets").insert(rows);
    if (insErr) throw insErr;
    release = null;

    if (!singleKey && !claimed) {
      // Generated on request rather than automatically. Stamp it all the same:
      // from here on this incident has a package, and the monitor must leave
      // it alone.
      await admin
        .from("incidents")
        .update({ package_requested_at: new Date().toISOString() })
        .eq("id", incident_id)
        .is("package_requested_at", null);
    }

    // The audit log is where a client reconstructs what happened and on whose
    // authority. "Sevra drafted twelve communications at 3am from our manual"
    // belongs in it as much as a changed risk level does.
    if (!singleKey) {
      const { error: logErr } = await admin.from("incident_audit_log").insert({
        incident_id,
        incident_title: incident.title,
        changed_by: userId,
        field_name: "media_package",
        old_value: null,
        new_value: basis,
        change_source: auto ? "sevra" : "user",
      });
      if (logErr) console.error("generate-incident-assets: audit log write failed", logErr.message);
    }

    // The plan and the package answer the two halves of the same question —
    // what do we say, and what do we do — so a crisis that gets one gets the
    // other. Dispatched rather than awaited: it is its own invocation and the
    // caller should not wait a second minute for it.
    if (!singleKey) {
      const plan = fetch(`${supabaseUrl}/functions/v1/generate-response-plan`, {
        method: "POST",
        headers: { Authorization: `Bearer ${serviceKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ incident_id }),
      }).catch((e) => {
        console.error("generate-incident-assets: response plan request failed —", e);
        return null;
      });
      await Promise.race([plan, new Promise((resolve) => setTimeout(resolve, 3000))]);
    }

    return new Response(
      JSON.stringify({ success: true, count: rows.length, basis }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("generate-incident-assets error", e);
    if (release) await release().catch(() => {});
    return new Response(
      JSON.stringify({ success: false, error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
