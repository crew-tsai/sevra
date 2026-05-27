// Auto-generates simulated social mentions and runs them through SEVRA analysis.
// Triggered by pg_cron every 15 minutes (or on-demand).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const CHANNELS = ["twitter", "instagram", "tiktok", "facebook"] as const;

const GEN_PROMPT = `Generate 2 realistic, DISTINCT social media posts (in Spanish, English, or French — mix languages) about possible incidents happening RIGHT NOW with AURORA SKYLINES, a Madrid-hubbed hybrid network airline (primary hub MAD Barajas T4, secondary hub LIS Lisbon). All posts MUST mention Aurora Skylines (handle @auroraskylines) and use Aurora flight numbers with the AS prefix (e.g. AS118, AS220, AS340, AS412, AS512, AS705). Vary routes from Aurora's network: MAD-BCN, MAD-LIS, MAD-CDG, MAD-LHR, MAD-FCO, MAD-BOG, MAD-LIM, MAD-EZE, MAD-GRU, MAD-MEX, MAD-JFK, MAD-MIA, LIS-GRU, LIS-JFK, CDG-MAD. Mix risk levels: include 1 likely real incident (delay, safety, customer treatment, outage, etc.) and 1 lower-risk or noise post (joke, vague complaint, or unrelated). Never mention competitor airlines.

Return STRICT JSON only:
{
  "posts": [
    {
      "channel": "twitter" | "instagram" | "tiktok",
      "author_name": "Realistic full name",
      "author_handle": "handle_no_at",
      "content": "The post text (1-3 sentences, can include emojis & mentions)",
      "likes": number,
      "shares": number,
      "reach": number,
      "is_verified": boolean,
      "is_influencer": boolean
    }
  ]
}`;

async function generateMentions(): Promise<any[]> {
  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) throw new Error("LOVABLE_API_KEY missing");

  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: "You produce realistic synthetic social media data. Output strict JSON only." },
        { role: "user", content: GEN_PROMPT },
      ],
      response_format: { type: "json_object" },
    }),
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`AI gateway ${res.status}: ${txt}`);
  }
  const json = await res.json();
  const content = json.choices?.[0]?.message?.content ?? "{}";
  const parsed = JSON.parse(content);
  const posts = Array.isArray(parsed.posts) ? parsed.posts : [];
  return posts.filter((p: any) => p && typeof p.content === "string" && CHANNELS.includes(p.channel));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey);

    const posts = await generateMentions();
    if (!posts.length) {
      return new Response(JSON.stringify({ success: true, generated: 0, analyzed: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const rows = posts.map((p: any) => ({
      channel: p.channel,
      author_name: p.author_name ?? null,
      author_handle: p.author_handle ?? null,
      content: p.content,
      likes: p.likes ?? 0,
      shares: p.shares ?? 0,
      reach: p.reach ?? 0,
      is_verified: !!p.is_verified,
      is_influencer: !!p.is_influencer,
      posted_at: new Date().toISOString(),
      status: "pending",
      created_by: null,
    }));

    const { data: inserted, error } = await admin
      .from("social_mentions")
      .insert(rows)
      .select("id");

    if (error) throw error;

    // Auto-analyze each new mention (sevra-analyze auto-creates incidents on high risk)
    let analyzed = 0;
    for (const row of inserted ?? []) {
      try {
        const r = await fetch(`${supabaseUrl}/functions/v1/sevra-analyze`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${serviceKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ mention_id: row.id }),
        });
        if (r.ok) analyzed++;
      } catch (_) {
        // continue with other mentions
      }
    }

    return new Response(
      JSON.stringify({ success: true, generated: inserted?.length ?? 0, analyzed }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e: any) {
    console.error("social-monitor-cron error:", e);
    return new Response(
      JSON.stringify({ success: false, error: e?.message ?? String(e) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
