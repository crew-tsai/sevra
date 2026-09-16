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
import Anthropic from "npm:@anthropic-ai/sdk";
import { profileFor } from "../_shared/industries.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MODEL = "claude-sonnet-4-6";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!anthropicKey) throw new Error("ANTHROPIC_API_KEY is not configured");

    // Authenticate before reading anything. The gateway accepts the public anon
    // key as a valid JWT, so it proves nothing about who is calling; only this
    // check does.
    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData } = await userClient.auth.getUser();
    const userId = userData?.user?.id ?? null;
    if (!userId) {
      return new Response(JSON.stringify({ success: false, error: "Not authenticated" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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

    const { data: mentions } = await admin
      .from("social_mentions")
      .select("channel, author_handle, content, ai_summary")
      .eq("incident_id", incident_id)
      .limit(10);

    const { data: settings } = await admin
      .from("company_settings").select("company_name, industry").maybeSingle();
    const company = settings?.company_name ?? "the organization";
    const profile = profileFor(settings?.industry);

    const context = `
INCIDENT
Title: ${incident.title}
Type: ${incident.incident_type}${incident.sub_type ? ` / ${incident.sub_type}` : ""}
Risk: ${incident.risk} (${incident.risk_score}/100)  Crisis level: L${incident.crisis_level ?? 0}
${profile.serviceLabel}: ${incident.flight_number ?? "n/a"}  Route: ${incident.route ?? "n/a"}
${profile.locationLabel}: ${incident.airport_code ?? "n/a"}
${profile.peopleLabel} impacted: ${incident.estimated_passengers_impacted ?? "unknown"}
Injury/fatality: ${incident.injury_fatality ? "YES" : "no"}
Regulator involved: ${incident.regulator_involved ? "YES" : "no"}
Description: ${incident.description ?? "n/a"}

LINKED SOCIAL MENTIONS (${mentions?.length ?? 0}):
${(mentions ?? []).map((m: any) => `- [${m.channel}] @${m.author_handle}: ${m.content}`).join("\n")}
`.trim();

    const anthropic = new Anthropic({ apiKey: anthropicKey });
    const msg = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 2048,
      system:
        `You are SEVRA, a crisis-communications strategist for ${company}, a ` +
        `${profile.simFlavor} operator. Generate a structured, actionable response plan ` +
        `with concrete tasks for each phase. Name the departments, regulatory or ` +
        `oversight bodies, and communication channels that are actually relevant to this ` +
        `industry and to the countries involved. Do not invent regulators; if the ` +
        `relevant body is unclear, describe it by role instead.`,
      tools: [
        {
          name: "emit_response_plan",
          description: "Return a 4-phase response plan as arrays of action strings.",
          input_schema: {
            type: "object",
            properties: {
              phase_immediate: { type: "array", items: { type: "string" }, description: "Actions in the first 0-4 hours" },
              phase_short: { type: "array", items: { type: "string" }, description: "Actions in the first 4-24 hours" },
              phase_medium: { type: "array", items: { type: "string" }, description: "Actions over 1-7 days" },
              phase_long: { type: "array", items: { type: "string" }, description: "Actions over 1-4 weeks" },
            },
            required: ["phase_immediate", "phase_short", "phase_medium", "phase_long"],
          },
        },
      ],
      tool_choice: { type: "tool", name: "emit_response_plan" },
      messages: [
        { role: "user", content: `Generate a full response plan for the following incident:\n\n${context}` },
      ],
    });

    const toolUse = msg.content.find((b: any) => b.type === "tool_use");
    if (!toolUse || toolUse.type !== "tool_use") throw new Error("AI did not return a plan");
    const plan = toolUse.input as Record<string, string[]>;

    const { error: upsertErr } = await admin.from("response_plan").upsert(
      {
        incident_id,
        phase_immediate: plan.phase_immediate,
        phase_short: plan.phase_short,
        phase_medium: plan.phase_medium,
        phase_long: plan.phase_long,
        generated_by: "ai",
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
