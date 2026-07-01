import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `You are SEVRA, an AI crisis analyst for an airline. You analyze a single social media mention (which may be in ANY language: Spanish, English, Portuguese, French, etc.) and decide if it represents a real incident that should be tracked.

CRITICAL LANGUAGE RULE: Regardless of the source language of the post, ALL your output fields (title, summary, sub_type, etc.) MUST be written in ENGLISH. Translate as needed. Preserve proper nouns (airline names, airports, flight numbers) as-is.

Classify into one of these incident_type values and pick a matching sub_type:
- safety: injury_report, turbulence_event, medical_emergency, onboard_incident, technical_failure, emergency_landing
- delay: cancellation_wave, flight_delay, missed_connections, crew_shortage, airport_disruption
- customer_treatment: discrimination_claim, staff_behavior_issue, passenger_removal, accessibility_issue, service_complaint
- outage: system_outage, checkin_failure, boarding_system_issue, baggage_system_failure, app_or_website_down
- misinformation: false_rumor, misleading_video, fake_news, manipulated_content, social_media_backlash

Risk levels: critical, high, medium, low. risk_score 0-100.
Set should_create_incident=false only for clear noise (jokes, unrelated, spam). Otherwise true.
Extract any flight_number, route (e.g. MAD-BCN), airport_code, country, airline_name, estimated_passengers_impacted you can infer.
Title: short ENGLISH headline (max 80 chars). Summary: 1-2 ENGLISH sentences.`;

// Check if a recent incident already exists that matches this mention's signature.
// Dedup rules (any one is enough):
//  1. Same flight_number (within 48h)
//  2. Same airline + same incident_type + same sub_type (within 24h)
//  3. Same airport_code + same incident_type (within 24h)
async function findExistingIncident(admin: any, analysis: any) {
  const since48h = new Date(Date.now() - 48 * 3600 * 1000).toISOString();
  const since24h = new Date(Date.now() - 24 * 3600 * 1000).toISOString();

  if (analysis.flight_number) {
    const { data } = await admin
      .from("incidents")
      .select("id")
      .eq("flight_number", analysis.flight_number)
      .gte("created_at", since48h)
      .order("created_at", { ascending: false })
      .limit(1);
    if (data && data.length) return data[0].id as string;
  }

  if (analysis.airline_name && analysis.sub_type) {
    const { data } = await admin
      .from("incidents")
      .select("id")
      .eq("airline_name", analysis.airline_name)
      .eq("incident_type", analysis.incident_type)
      .eq("sub_type", analysis.sub_type)
      .gte("created_at", since24h)
      .order("created_at", { ascending: false })
      .limit(1);
    if (data && data.length) return data[0].id as string;
  }

  if (analysis.airport_code) {
    const { data } = await admin
      .from("incidents")
      .select("id")
      .eq("airport_code", analysis.airport_code)
      .eq("incident_type", analysis.incident_type)
      .gte("created_at", since24h)
      .order("created_at", { ascending: false })
      .limit(1);
    if (data && data.length) return data[0].id as string;
  }

  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { mention_id } = await req.json();
    if (!mention_id) throw new Error("mention_id required");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const authHeader = req.headers.get("Authorization") ?? "";
    const admin = createClient(supabaseUrl, serviceKey);

    // Resolve the calling user's ID from their JWT (best-effort, nullable)
    let userId: string | null = null;
    try {
      const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? serviceKey;
      const userClient = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: userData } = await userClient.auth.getUser();
      userId = userData?.user?.id ?? null;
    } catch { /* non-fatal */ }

    const { data: mention, error: mErr } = await admin
      .from("social_mentions")
      .select("*")
      .eq("id", mention_id)
      .maybeSingle();
    if (mErr) throw new Error(`DB error looking up mention: ${mErr.message}`);
    if (!mention) throw new Error(`Mention ${mention_id} not found`);

    await admin.from("social_mentions").update({ status: "analyzing" }).eq("id", mention_id);

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: `Channel: ${mention.channel}\nAuthor: ${mention.author_name} (@${mention.author_handle}) verified=${mention.is_verified} influencer=${mention.is_influencer}\nReach: ${mention.reach} | Likes: ${mention.likes} | Shares: ${mention.shares}\n\nContent (original language — translate to English in your output):\n${mention.content}`,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "classify_mention",
              description: "Classify the social mention as a potential airline incident. All output strings must be in English.",
              parameters: {
                type: "object",
                properties: {
                  should_create_incident: { type: "boolean" },
                  title: { type: "string", description: "English headline, max 80 chars" },
                  summary: { type: "string", description: "1-2 sentence English summary" },
                  incident_type: {
                    type: "string",
                    enum: ["safety", "delay", "customer_treatment", "outage", "misinformation"],
                  },
                  sub_type: { type: "string" },
                  risk: { type: "string", enum: ["critical", "high", "medium", "low"] },
                  risk_score: { type: "number" },
                  airline_name: { type: "string" },
                  flight_number: { type: "string" },
                  route: { type: "string" },
                  airport_code: { type: "string" },
                  country: { type: "string" },
                  estimated_passengers_impacted: { type: "number" },
                  injury_fatality: { type: "boolean" },
                  regulator_involved: { type: "boolean" },
                },
                required: ["should_create_incident", "title", "summary", "incident_type", "sub_type", "risk", "risk_score"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "classify_mention" } },
      }),
    });

    if (!aiResp.ok) {
      const t = await aiResp.text();
      if (aiResp.status === 429) throw new Error("Rate limit exceeded. Try again shortly.");
      if (aiResp.status === 402) throw new Error("AI credits exhausted. Add funds in Workspace > Usage.");
      throw new Error(`AI gateway error ${aiResp.status}: ${t}`);
    }

    const aiJson = await aiResp.json();
    const toolCall = aiJson.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("AI did not return classification");
    const analysis = JSON.parse(toolCall.function.arguments);

    let incidentId: string | null = null;
    let dedupedTo: string | null = null;

    if (analysis.should_create_incident) {
      // Try to find an existing incident this mention belongs to
      const existing = await findExistingIncident(admin, analysis);

      if (existing) {
        incidentId = existing;
        dedupedTo = existing;

        // Bump risk if this new evidence is higher, and mark influencer involvement
        const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
        if (mention.is_influencer || mention.is_verified) {
          updates.influencer_media_involved = true;
        }
        const newScore = Math.round(analysis.risk_score);
        const { data: cur } = await admin
          .from("incidents")
          .select("risk_score, risk")
          .eq("id", existing)
          .maybeSingle();
        if (cur && newScore > (cur.risk_score ?? 0)) {
          updates.risk_score = newScore;
          updates.risk = analysis.risk;
        }
        await admin.from("incidents").update(updates).eq("id", existing);
      } else {
        const { data: inc, error: incErr } = await admin
          .from("incidents")
          .insert({
            title: analysis.title,
            incident_type: analysis.incident_type,
            sub_type: analysis.sub_type,
            description: `${analysis.summary}\n\n— Detected from ${mention.channel} @${mention.author_handle}\n${mention.post_url ?? ""}`,
            airline_name: analysis.airline_name ?? null,
            flight_number: analysis.flight_number ?? null,
            route: analysis.route ?? null,
            airport_code: analysis.airport_code ?? null,
            country: analysis.country ?? null,
            injury_fatality: analysis.injury_fatality ?? false,
            regulator_involved: analysis.regulator_involved ?? false,
            estimated_passengers_impacted: analysis.estimated_passengers_impacted ?? 0,
            is_public: true,
            influencer_media_involved: mention.is_influencer || mention.is_verified,
            source: "social_media",
            risk: analysis.risk,
            risk_score: Math.round(analysis.risk_score),
            status: "active",
            created_by: userId,
          })
          .select("id")
          .single();
        if (incErr) throw new Error(`Incident creation failed: ${incErr.message}`);
        incidentId = inc.id;
      }
    }

    await admin
      .from("social_mentions")
      .update({
        status: analysis.should_create_incident
          ? (dedupedTo ? "linked_to_incident" : "incident_created")
          : "dismissed",
        ai_incident_type: analysis.incident_type,
        ai_sub_type: analysis.sub_type,
        ai_risk: analysis.risk,
        ai_risk_score: Math.round(analysis.risk_score),
        ai_summary: analysis.summary,
        ai_should_create_incident: analysis.should_create_incident,
        ai_extracted: analysis,
        incident_id: incidentId,
      })
      .eq("id", mention_id);

    return new Response(
      JSON.stringify({ success: true, analysis, incident_id: incidentId, deduped: !!dedupedTo }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("sevra-analyze error:", e);
    return new Response(
      JSON.stringify({ success: false, error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }, },
    );
  }
});
