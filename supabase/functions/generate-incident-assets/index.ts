import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

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
  { key: "tiktok_script", title: "TikTok script", channel: "social", description: "30-45 seconds, conversational spoken script. Include scene directions in [brackets]." },
  { key: "internal_memo", title: "Internal memo", channel: "internal", description: "Internal communication for all employees. Explains the situation, what we're doing, what we expect from each team." },
  { key: "customer_faq", title: "Customer FAQ", channel: "support", description: "5-7 anticipated customer questions with clear, empathetic answers, formatted as Q: / A:." },
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { incident_id, asset_key } = await req.json();
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
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace("Bearer ", "");
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData } = await userClient.auth.getUser(token);
    const userId = userData?.user?.id ?? null;

    const admin = createClient(supabaseUrl, serviceKey);

    const { data: incident, error: incErr } = await admin
      .from("incidents")
      .select("*")
      .eq("id", incident_id)
      .maybeSingle();
    if (incErr) throw incErr;
    if (!incident) throw new Error("Incident not found");

    const { data: mentions } = await admin
      .from("social_mentions")
      .select("channel, author_handle, content, ai_summary")
      .eq("incident_id", incident_id)
      .limit(10);

    const context = `
INCIDENT
Title: ${incident.title}
Type: ${incident.incident_type}${incident.sub_type ? ` / ${incident.sub_type}` : ""}
Risk: ${incident.risk} (${incident.risk_score}/100)
Airline: ${incident.airline_name ?? "n/a"}
Flight: ${incident.flight_number ?? "n/a"}
Route: ${incident.route ?? "n/a"} (${incident.country ?? "n/a"})
Pax impacted: ${incident.estimated_passengers_impacted ?? "unknown"}
Injury/fatality: ${incident.injury_fatality ? "yes" : "no"}
Regulator involved: ${incident.regulator_involved ? "yes" : "no"}
Description: ${incident.description ?? "n/a"}

LINKED SOCIAL MENTIONS (${mentions?.length ?? 0}):
${(mentions ?? []).map((m: any) => `- [${m.channel}] @${m.author_handle}: ${m.content}`).join("\n")}
`.trim();

    // Single Lovable AI call returning all assets via tool call
    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content:
              "You are SEVRA, an aviation crisis-communication writer. Produce a complete, ready-to-publish communication package. Be factual, empathetic, and avoid speculation. Match each asset's tone & length brief exactly. Output only via the tool call.",
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
      }),
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
        return new Response(JSON.stringify({ error: "Add credits to your Lovable AI workspace." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI gateway error ${aiResp.status}: ${txt}`);
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
        approval_status: "pending",
        created_by: userId,
      };
    });

    const { error: insErr } = await admin.from("incident_assets").insert(rows);
    if (insErr) throw insErr;

    return new Response(
      JSON.stringify({ success: true, count: rows.length }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("generate-incident-assets error", e);
    return new Response(
      JSON.stringify({ success: false, error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
