// Generates a four-phase incident response plan and stores it in response_plan.
//
// Recovered from the deployed bundle: this function was running in production
// at version 6 with no source in this repository, so nobody could review it and
// any `supabase functions deploy` sweep would have silently reverted or removed
// it. Three things were wrong with what was live.
//
//   1. No authentication. It read the caller's user id and then never checked
//      it, proceeding with the service-role client regardless. The public anon
//      key is shipped in the frontend bundle, so anyone could POST an
//      incident_id and receive that incident's full detail -- title,
//      description, casualty and regulator flags, and every linked social
//      mention. That is precisely the unpublished crisis content this product
//      exists to protect, and it also let a stranger spend the AI budget.
//
//   2. It was hardcoded to the Aurora Skylines demo airline, naming Spanish
//      aviation regulators. A hospital or a bank would have been handed an
//      aviation response plan citing ENAIRE and AESA.
//
//   3. Alongside the rest of the AI surface it now reads the workspace's own
//      industry so the plan is written for the operator it belongs to.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { chatCompletion, MODELS } from "../_shared/ai.ts";
import { profileFor } from "../_shared/industries.ts";
import { identifyCaller, unauthorized } from "../_shared/caller.ts";
import { loadCommsManual } from "../_shared/comms-manual.ts";
import { linkedMentionContext } from "../_shared/linked-mentions.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Authenticate before reading anything. The gateway accepts the public anon
    // key as a valid JWT, so it proves nothing about who is calling; only this
    // does. The service role is accepted too: the plan is written alongside the
    // package when Sevra detects a crisis, with nobody signed in.
    const caller = await identifyCaller(req);
    if (caller.kind === "anonymous") return unauthorized();
    const userId: string | null = caller.kind === "user" ? caller.userId : null;

    const { incident_id } = await req.json().catch(() => ({}));
    if (!incident_id || typeof incident_id !== "string") {
      return new Response(JSON.stringify({ success: false, error: "incident_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(supabaseUrl, serviceKey);

    const { data: incident, error: incErr } = await admin
      .from("incidents").select("*").eq("id", incident_id).maybeSingle();
    if (incErr) throw incErr;
    if (!incident) throw new Error("Incident not found");

    const mentionContext = await linkedMentionContext(admin, incident_id);

    const { data: settings } = await admin
      .from("company_settings")
      .select(
        "company_name, industry, comms_manual_url, comms_manual_name, comms_manual_text, comms_manual_text_source",
      )
      .maybeSingle();
    const company = settings?.company_name ?? "the organization";
    const profile = profileFor(settings?.industry);

    // Who this workspace has said does what. A plan that says "notify the
    // relevant team" is a worse plan than one that says "Executive Team signs
    // off before the press release goes out", and the workspace has already
    // written that down in Admin - Responsibilities.
    const [{ data: lists }, { data: matrix }] = await Promise.all([
      admin.from("email_lists").select("id, name"),
      admin.from("responsibility_matrix").select("asset_type, level, list_id"),
    ]);
    const listName = new Map((lists ?? []).map((l: any) => [l.id, l.name]));
    const responsibilities = (matrix ?? [])
      .map((r: any) => `- ${r.asset_type}: ${r.level} = ${listName.get(r.list_id) ?? "?"}`)
      .join("\n");

    // The same authority the communications follow: their manual if they have
    // one, recognised practice otherwise.
    const manual = await loadCommsManual(admin, settings);

    const context = `
INCIDENT
Title: ${incident.title}
Type: ${incident.incident_type}${incident.sub_type ? ` / ${incident.sub_type}` : ""}
Risk: ${incident.risk} (${incident.risk_score}/100)  Crisis level: L${incident.crisis_level ?? 0}
${profile.serviceLabel}: ${incident.flight_number ?? "n/a"}  ${profile.routeLabel}: ${incident.route ?? "n/a"}
${profile.locationLabel}: ${incident.airport_code ?? "n/a"}
${profile.peopleLabel}: ${incident.estimated_passengers_impacted ?? "unknown"}
Injury/fatality: ${incident.injury_fatality ? "YES" : "no"}
Regulator involved: ${incident.regulator_involved ? "YES" : "no"}
Description: ${incident.description ?? "n/a"}

${mentionContext}
`.trim();

    // The shared AI provider, like every other AI feature. This one called
    // Anthropic directly, and new workspaces are not given that key -- so
    // generating a plan failed on every client provisioned since.
    const aiResp = await chatCompletion({
      model: MODELS.reasoning,
      messages: [
        {
          role: "system",
          content:
            `You are SEVRA, a crisis-communications strategist for ${company}` +
        `${settings?.industry ? `, an organization in the ${settings.industry} sector` : ""}. Generate a structured, actionable response plan ` +
        `with concrete tasks for each phase. Name the departments, regulatory or ` +
        `oversight bodies, and communication channels that are actually relevant to this ` +
        `industry and to the countries involved. Do not invent regulators; if the ` +
        `relevant body is unclear, describe it by role instead. Write every action in ` +
        `English, and give the same plan in neutral, professional Spanish in the es_ ` +
        `fields — a translation, item for item, in the same order.`,
        },
        {
          role: "user",
          content:
            `Generate a full response plan for the following incident:\n\n${context}` +
            (responsibilities
              ? `\n\nWHO IS RESPONSIBLE, ACCOUNTABLE, CONSULTED AND INFORMED in this organization — name these teams in the actions rather than generic roles:\n${responsibilities}`
              : "") +
            (manual
              ? `\n\nThis organization's crisis communications manual governs the plan. Follow its procedures, escalation levels and named roles, using its own terms.\n\n--- MANUAL${manual.truncated ? " (excerpt)" : ""} ---\n${manual.text}\n--- END OF MANUAL ---`
              : ""),
        },
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "emit_response_plan",
            description: "Return a 4-phase response plan as arrays of action strings.",
            parameters: {
            type: "object",
            properties: {
              phase_immediate: { type: "array", items: { type: "string" }, description: "Actions in the first 0-4 hours" },
              phase_short: { type: "array", items: { type: "string" }, description: "Actions in the first 4-24 hours" },
              phase_medium: { type: "array", items: { type: "string" }, description: "Actions over 1-7 days" },
              phase_long: { type: "array", items: { type: "string" }, description: "Actions over 1-4 weeks" },
              es_phase_immediate: { type: "array", items: { type: "string" }, description: "phase_immediate in Spanish" },
              es_phase_short: { type: "array", items: { type: "string" }, description: "phase_short in Spanish" },
              es_phase_medium: { type: "array", items: { type: "string" }, description: "phase_medium in Spanish" },
              es_phase_long: { type: "array", items: { type: "string" }, description: "phase_long in Spanish" },
            },
            required: [
              "phase_immediate", "phase_short", "phase_medium", "phase_long",
              "es_phase_immediate", "es_phase_short", "es_phase_medium", "es_phase_long",
            ],
          },
          },
        },
      ],
      tool_choice: { type: "function", function: { name: "emit_response_plan" } },
    });
    if (!aiResp.ok) {
      const t = await aiResp.text();
      if (aiResp.status === 429) throw new Error("Rate limit exceeded. Try again shortly.");
      throw new Error(`AI error ${aiResp.status}: ${t.slice(0, 200)}`);
    }
    const aiJson = await aiResp.json();
    const toolCall = aiJson.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("AI did not return a plan");
    const plan = JSON.parse(toolCall.function.arguments) as Record<string, string[]>;

    const { error: upsertErr } = await admin.from("response_plan").upsert(
      {
        incident_id,
        phase_immediate: plan.phase_immediate,
        phase_short: plan.phase_short,
        phase_medium: plan.phase_medium,
        phase_long: plan.phase_long,
        translations: plan.es_phase_immediate
          ? {
              es: {
                phase_immediate: plan.es_phase_immediate,
                phase_short: plan.es_phase_short,
                phase_medium: plan.es_phase_medium,
                phase_long: plan.es_phase_long,
              },
            }
          : null,
        generated_by: manual ? "ai+manual" : "ai",
        created_by: userId,
      },
      { onConflict: "incident_id" },
    );
    if (upsertErr) throw upsertErr;

    return new Response(JSON.stringify({ success: true, plan }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-response-plan error:", e);
    return new Response(
      JSON.stringify({ success: false, error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
