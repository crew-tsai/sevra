import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { identifyCaller, unauthorized } from "../_shared/caller.ts";
import { INCIDENT_TYPES, profileFor } from "../_shared/industries.ts";
import { chatCompletion, MODELS } from "../_shared/ai.ts";
import { crisisLevel } from "../_shared/crisis-level.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/** "CO" → "Colombia (CO)". Names in English, for the model. */
function countryName(code: string): string {
  try {
    const n = new Intl.DisplayNames(["en"], { type: "region" }).of(code.toUpperCase());
    return n && n !== code.toUpperCase() ? `${n} (${code.toUpperCase()})` : code.toUpperCase();
  } catch {
    return code.toUpperCase();
  }
}

/**
 * Which language an automatically drafted package is written in.
 *
 * A package is published as written, so it is produced in one language. Nobody
 * is at the keyboard at 3am to choose it, so it follows the languages the
 * workspace monitors in: a company watched only in Spanish is a company whose
 * audience reads Spanish.
 */
function packageLanguage(languages: string[] | null | undefined): "en" | "es" {
  const langs = (languages ?? []).map((l) => String(l).toLowerCase());
  return langs.includes("es") && !langs.includes("en") ? "es" : "en";
}

/**
 * Ask generate-incident-assets to draft the package for this incident.
 *
 * Deliberately not awaited to completion: twelve communications take the better
 * part of a minute, and the monitor calls this function once per new mention,
 * so holding it open would push the whole run past its budget. The other
 * function is a separate invocation that finishes on its own — all this needs
 * is to be sure the request left the building.
 */
async function requestPackage(
  baseUrl: string,
  serviceKey: string,
  incidentId: string,
  lang: "en" | "es",
): Promise<void> {
  const call = fetch(`${baseUrl}/functions/v1/generate-incident-assets`, {
    method: "POST",
    headers: { Authorization: `Bearer ${serviceKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ incident_id: incidentId, lang, auto: true }),
  }).catch((e) => {
    console.error("sevra-analyze: automatic package request failed —", e);
    return null;
  });
  await Promise.race([call, new Promise((resolve) => setTimeout(resolve, 3000))]);
}

function buildSystemPrompt(companyName: string | null, industry: string | null, countries: string[] = []): string {
  const vocab = profileFor(industry);
  const company = companyName ?? "the company";
  return `You are SEVRA, an AI crisis analyst for ${company}${industry ? ` (${industry})` : ""}. You analyze a single social media mention (which may be in ANY language: Spanish, English, Portuguese, French, etc.) and decide if it represents a real incident that should be tracked.

CRITICAL LANGUAGE RULE: Regardless of the source language of the post, ALL your output fields (title, summary, sub_type, etc.) MUST be written in ENGLISH. Translate as needed. Preserve proper nouns (operator names, locations, service numbers) as-is.

Classify into one of these incident_type values and pick a matching sub_type. The
sub_types below are specific to this organization's industry — use them verbatim:
${INCIDENT_TYPES.map((t) => `- ${t}: ${vocab.subTypes[t].join(", ")}`).join("\n")}

Risk levels: critical, high, medium, low. risk_score 0-100.
First decide relevance:
- "crisis": about this organization and a real or emerging risk (complaint, safety, outage, accusation, misinformation). should_create_incident=true.
- "no_risk": about this organization but not a threat — praise, thanks, questions, neutral news or announcements. should_create_incident=false.
- "unrelated": not about this organization at all (the name used as an ordinary word, another company, spam, jokes). should_create_incident=false.
Give sentiment (positive, neutral, negative) for every post, whatever its relevance.
Only for "crisis": pick incident_type and sub_type. For "no_risk" and "unrelated" leave them out — never label praise as a complaint.
Extract any ${vocab.serviceLabel.toLowerCase()} (e.g. ${vocab.serviceExample}), ${vocab.routeLabel.toLowerCase()} (e.g. ${vocab.routeExample}), ${vocab.locationLabel.toLowerCase()}, country, ${vocab.operatorLabel.toLowerCase()} name, ${vocab.peopleLabel.toLowerCase()} you can infer.
${countries.length ? `
WHERE ${company.toUpperCase()} OPERATES: ${countries.map(countryName).join(", ")}. A post about a different country, or that uses the company's name as an ordinary word (for example a product, a place or a word in another language), is not about this company: set should_create_incident=false and say so in the summary.
` : ""}
Title: short ENGLISH headline (max 80 chars). Summary: 1-2 ENGLISH sentences.
Also give title_es and summary_es: the same headline and summary in neutral, professional Spanish — a translation of the English, not a different text.`;
}

// Check if a recent incident already exists that matches this mention's signature.
// Dedup rules (any one is enough):
//  1. Same service reference, e.g. flight or project number (within 48h)
//  2. Same operator + same incident_type + same sub_type (within 24h)
//  3. Same location code + same incident_type (within 24h)
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

    const authHeader = req.headers.get("Authorization") ?? "";
    const admin = createClient(supabaseUrl, serviceKey);

    // Refuse anonymous callers. This used to resolve the user "best-effort"
    // and carry on without one, so anyone holding the public anon key could
    // run analysis — which can create incidents — with service-role rights.
    // Legitimate callers are a signed-in user (Social Intel) or the monitor
    // cron (service role).
    const caller = await identifyCaller(req);
    if (caller.kind === "anonymous") return unauthorized();
    const userId: string | null = caller.kind === "user" ? caller.userId : null;

    const { data: mention, error: mErr } = await admin
      .from("social_mentions")
      .select("*")
      .eq("id", mention_id)
      .maybeSingle();
    if (mErr) throw new Error(`DB error looking up mention: ${mErr.message}`);
    if (!mention) throw new Error(`Mention ${mention_id} not found`);

    await admin.from("social_mentions").update({ status: "analyzing" }).eq("id", mention_id);

    const { data: settings } = await admin
      .from("company_settings")
      .select("company_name, industry, monitor_countries, monitor_languages, auto_package_level")
      .maybeSingle();
    const systemPrompt = buildSystemPrompt(settings?.company_name ?? null, settings?.industry ?? null, settings?.monitor_countries ?? []);

    const aiResp = await chatCompletion({
      model: MODELS.reasoning,
      messages: [
        { role: "system", content: systemPrompt },
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
            description: "Classify the social mention as a potential incident. All output strings must be in English.",
            parameters: {
              type: "object",
              properties: {
                should_create_incident: { type: "boolean" },
                relevance: { type: "string", enum: ["crisis", "no_risk", "unrelated"] },
                sentiment: { type: "string", enum: ["positive", "neutral", "negative"] },
                title: { type: "string", description: "English headline, max 80 chars" },
                summary: { type: "string", description: "1-2 sentence English summary" },
                title_es: { type: "string", description: "The same headline in Spanish, max 80 chars" },
                summary_es: { type: "string", description: "The same summary in Spanish" },
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
              required: ["should_create_incident", "relevance", "sentiment", "title", "summary", "title_es", "summary_es", "risk", "risk_score"],
            },
          },
        },
      ],
      tool_choice: { type: "function", function: { name: "classify_mention" } },
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
    // Relevance is the source of truth; keep the flag consistent with it, and
    // drop any type the model attached to something that is not an incident.
    const relevance: "crisis" | "no_risk" | "unrelated" =
      ["crisis", "no_risk", "unrelated"].includes(analysis.relevance)
        ? analysis.relevance
        : analysis.should_create_incident ? "crisis" : "unrelated";
    analysis.should_create_incident = relevance === "crisis";
    if (relevance !== "crisis") {
      analysis.incident_type = null;
      analysis.sub_type = null;
    } else if (!INCIDENT_TYPES.includes(analysis.incident_type)) {
      // Incidents require a type; the schema no longer forces one, so a
      // crisis that arrives without it gets the broadest.
      analysis.incident_type = "customer_treatment";
    }
    const sentiment = ["positive", "neutral", "negative"].includes(analysis.sentiment) ? analysis.sentiment : null;

    let incidentId: string | null = null;
    let dedupedTo: string | null = null;

    // The level the rest of the product is ordered by. It was never written —
    // every incident the monitor opened sat at L0 — so it is computed here,
    // from the same evidence the risk came from.
    const level = crisisLevel({
      risk: analysis.risk,
      riskScore: analysis.risk_score,
      injuryFatality: analysis.injury_fatality,
      regulatorInvolved: analysis.regulator_involved,
      amplified: mention.is_influencer || mention.is_verified,
    });

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
          .select("risk_score, risk, crisis_level")
          .eq("id", existing)
          .maybeSingle();
        if (cur && newScore > (cur.risk_score ?? 0)) {
          updates.risk_score = newScore;
          updates.risk = analysis.risk;
        }
        // A crisis escalates, it does not de-escalate because a milder post
        // arrived. The audit log records the change through the trigger.
        if (cur && level > (cur.crisis_level ?? 0)) updates.crisis_level = level;
        await admin.from("incidents").update(updates).eq("id", existing);
      } else {
        const { data: inc, error: incErr } = await admin
          .from("incidents")
          .insert({
            title: analysis.title,
            incident_type: analysis.incident_type,
            sub_type: analysis.sub_type,
            description: `${analysis.summary}\n\n— Detected from ${mention.channel} @${mention.author_handle}\n${mention.post_url ?? ""}`,
            // Spanish written in the same call as the English, so switching
            // language never waits on a translation.
            translations: analysis.title_es || analysis.summary_es
              ? {
                  es: {
                    title: analysis.title_es ?? analysis.title,
                    description: `${analysis.summary_es ?? analysis.summary}\n\n— Detectado en ${mention.channel} @${mention.author_handle}\n${mention.post_url ?? ""}`,
                  },
                }
              : null,
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
            crisis_level: level,
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
          : relevance === "no_risk" ? "no_risk" : "dismissed",
        ai_sentiment: sentiment,
        ai_incident_type: analysis.incident_type,
        ai_sub_type: analysis.sub_type,
        ai_risk: analysis.risk,
        ai_risk_score: Math.round(analysis.risk_score),
        ai_summary: analysis.summary,
        translations: analysis.summary_es ? { es: { ai_summary: analysis.summary_es } } : null,
        ai_should_create_incident: analysis.should_create_incident,
        ai_extracted: analysis,
        incident_id: incidentId,
      })
      .eq("id", mention_id);

    // What Sevra is sold on: a crisis arrives with its communications already
    // drafted. At or above the workspace's level the package is written now,
    // rather than waiting for someone to open the incident and ask — which at
    // 3am is exactly when nobody does. generate-incident-assets refuses to
    // overwrite a package that already exists, so an escalating incident is
    // drafted once.
    const threshold = settings?.auto_package_level ?? null;
    const autoPackage = incidentId !== null && typeof threshold === "number" && level >= threshold;
    if (autoPackage) {
      await requestPackage(
        supabaseUrl,
        serviceKey,
        incidentId!,
        packageLanguage(settings?.monitor_languages),
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        analysis,
        incident_id: incidentId,
        crisis_level: level,
        deduped: !!dedupedTo,
        auto_package: autoPackage,
      }),
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
