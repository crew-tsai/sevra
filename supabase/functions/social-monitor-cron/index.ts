// Pulls real mentions for connected X/Facebook accounts, and simulates
// Instagram/TikTok posts via an LLM (no real connection/publish maturity
// there yet). All new rows run through SEVRA analysis afterward.
// Triggered by pg_cron every 15 minutes (or on-demand).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { refreshXToken } from "../_shared/social-providers.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SIM_CHANNELS = ["instagram", "tiktok"] as const;

const GEN_PROMPT = `Generate 2 realistic, DISTINCT social media posts (in Spanish, English, or French — mix languages) about possible incidents happening RIGHT NOW with AURORA SKYLINES, a Madrid-hubbed hybrid network airline (primary hub MAD Barajas T4, secondary hub LIS Lisbon). All posts MUST mention Aurora Skylines (handle @auroraskylines) and use Aurora flight numbers with the AS prefix (e.g. AS118, AS220, AS340, AS412, AS512, AS705). Vary routes from Aurora's network: MAD-BCN, MAD-LIS, MAD-CDG, MAD-LHR, MAD-FCO, MAD-BOG, MAD-LIM, MAD-EZE, MAD-GRU, MAD-MEX, MAD-JFK, MAD-MIA, LIS-GRU, LIS-JFK, CDG-MAD. Mix risk levels: include 1 likely real incident (delay, safety, customer treatment, outage, etc.) and 1 lower-risk or noise post (joke, vague complaint, or unrelated). Never mention competitor airlines.

Return STRICT JSON only:
{
  "posts": [
    {
      "channel": "instagram" | "tiktok",
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

type MentionRow = {
  channel: string;
  external_id?: string | null;
  author_name?: string | null;
  author_handle?: string | null;
  author_avatar_url?: string | null;
  content: string;
  post_url?: string | null;
  likes?: number;
  shares?: number;
  reach?: number;
  is_verified?: boolean;
  is_influencer?: boolean;
  posted_at: string;
  status: string;
  created_by: null;
};

// deno-lint-ignore no-explicit-any
async function generateSimulatedMentions(): Promise<any[]> {
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
  // deno-lint-ignore no-explicit-any
  return posts.filter((p: any) => p && typeof p.content === "string" && SIM_CHANNELS.includes(p.channel));
}

// deno-lint-ignore no-explicit-any
async function pullRealX(admin: any, companyName: string | null): Promise<{ rows: MentionRow[]; error?: string }> {
  const { data: connection } = await admin
    .from("social_connections")
    .select("id, account_label, token_expires_at")
    .eq("network", "x")
    .eq("status", "connected")
    .maybeSingle();
  if (!connection) return { rows: [] };

  try {
    const { data: tokenRow } = await admin
      .from("social_connection_tokens")
      .select("access_token, refresh_token")
      .eq("connection_id", connection.id)
      .maybeSingle();
    if (!tokenRow?.access_token) return { rows: [], error: "X connected but no stored access token — try reconnecting." };

    let accessToken = tokenRow.access_token;
    const expiresAt = connection.token_expires_at ? new Date(connection.token_expires_at).getTime() : null;
    if (expiresAt !== null && expiresAt - Date.now() < 60_000 && tokenRow.refresh_token) {
      const { data: creds } = await admin
        .from("social_app_credentials")
        .select("client_id, client_secret")
        .eq("network", "x")
        .maybeSingle();
      if (creds) {
        accessToken = await refreshXToken(admin, connection.id, creds.client_id, creds.client_secret, tokenRow.refresh_token);
      }
    }

    const handle = (connection.account_label ?? "").replace(/^@/, "");
    const queryParts = [handle ? `@${handle}` : null, companyName ? `"${companyName}"` : null].filter(Boolean);
    if (!queryParts.length) return { rows: [], error: "No handle or company name to search for." };
    const query = `(${queryParts.join(" OR ")}) -is:retweet`;

    const params = new URLSearchParams({
      query,
      max_results: "10",
      "tweet.fields": "created_at,public_metrics",
      expansions: "author_id",
      "user.fields": "username,name,profile_image_url,verified",
    });
    const res = await fetch(`https://api.twitter.com/2/tweets/search/recent?${params}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = json?.detail || json?.title || `X search failed (${res.status})`;
      return { rows: [], error: msg };
    }

    const users = new Map((json.includes?.users ?? []).map((u: any) => [u.id, u]));
    const tweets = Array.isArray(json.data) ? json.data : [];
    const rows: MentionRow[] = tweets.map((t: any) => {
      const author = users.get(t.author_id) as any;
      return {
        channel: "twitter",
        external_id: t.id,
        author_name: author?.name ?? null,
        author_handle: author?.username ?? null,
        author_avatar_url: author?.profile_image_url ?? null,
        content: t.text,
        post_url: author?.username ? `https://twitter.com/${author.username}/status/${t.id}` : null,
        likes: t.public_metrics?.like_count ?? 0,
        shares: t.public_metrics?.retweet_count ?? 0,
        reach: t.public_metrics?.impression_count ?? 0,
        is_verified: !!author?.verified,
        is_influencer: false,
        posted_at: t.created_at ?? new Date().toISOString(),
        status: "pending",
        created_by: null,
      };
    });
    return { rows };
  } catch (e: any) {
    return { rows: [], error: e?.message ?? String(e) };
  }
}

// deno-lint-ignore no-explicit-any
async function pullRealFacebook(admin: any): Promise<{ rows: MentionRow[]; error?: string }> {
  const { data: connection } = await admin
    .from("social_connections")
    .select("id, account_id")
    .eq("network", "facebook")
    .eq("status", "connected")
    .maybeSingle();
  if (!connection || !connection.account_id) return { rows: [] };

  try {
    const { data: tokenRow } = await admin
      .from("social_connection_tokens")
      .select("access_token")
      .eq("connection_id", connection.id)
      .maybeSingle();
    if (!tokenRow?.access_token) return { rows: [], error: "Facebook connected but no stored Page token — try reconnecting." };

    const pageId = connection.account_id;
    const accessToken = tokenRow.access_token;
    const rows: MentionRow[] = [];

    // Comments on the Page's own recent posts.
    const feedParams = new URLSearchParams({
      fields: "id,permalink_url,comments.limit(50){id,message,from,created_time,like_count}",
      access_token: accessToken,
    });
    const feedRes = await fetch(`https://graph.facebook.com/v19.0/${pageId}/feed?${feedParams}`);
    const feedJson = await feedRes.json().catch(() => ({}));
    if (!feedRes.ok) {
      return { rows: [], error: feedJson?.error?.message ?? `Facebook feed pull failed (${feedRes.status})` };
    }
    for (const post of feedJson.data ?? []) {
      for (const comment of post.comments?.data ?? []) {
        rows.push({
          channel: "facebook",
          external_id: comment.id,
          author_name: comment.from?.name ?? null,
          author_handle: null,
          content: comment.message ?? "",
          post_url: post.permalink_url ?? null,
          likes: comment.like_count ?? 0,
          shares: 0,
          reach: 0,
          is_verified: false,
          is_influencer: false,
          posted_at: comment.created_time ?? new Date().toISOString(),
          status: "pending",
          created_by: null,
        });
      }
    }

    // Posts other people make that tag the Page.
    const taggedParams = new URLSearchParams({
      fields: "id,message,created_time,from,permalink_url",
      access_token: accessToken,
    });
    const taggedRes = await fetch(`https://graph.facebook.com/v19.0/${pageId}/tagged?${taggedParams}`);
    const taggedJson = await taggedRes.json().catch(() => ({}));
    if (taggedRes.ok) {
      for (const post of taggedJson.data ?? []) {
        if (!post.message) continue;
        rows.push({
          channel: "facebook",
          external_id: post.id,
          author_name: post.from?.name ?? null,
          author_handle: null,
          content: post.message,
          post_url: post.permalink_url ?? null,
          likes: 0,
          shares: 0,
          reach: 0,
          is_verified: false,
          is_influencer: false,
          posted_at: post.created_time ?? new Date().toISOString(),
          status: "pending",
          created_by: null,
        });
      }
    }

    return { rows };
  } catch (e: any) {
    return { rows: [], error: e?.message ?? String(e) };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey);

    const { data: settings } = await admin.from("company_settings").select("company_name").maybeSingle();
    const companyName = settings?.company_name ?? null;

    const networkErrors: Record<string, string> = {};

    const [simPosts, xResult, fbResult] = await Promise.all([
      generateSimulatedMentions().catch((e) => {
        networkErrors.simulation = e?.message ?? String(e);
        return [];
      }),
      pullRealX(admin, companyName),
      pullRealFacebook(admin),
    ]);
    if (xResult.error) networkErrors.x = xResult.error;
    if (fbResult.error) networkErrors.facebook = fbResult.error;

    // deno-lint-ignore no-explicit-any
    const simRows: MentionRow[] = simPosts.map((p: any) => ({
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

    let insertedIds: string[] = [];

    if (simRows.length) {
      const { data, error } = await admin.from("social_mentions").insert(simRows).select("id");
      if (error) throw error;
      insertedIds = insertedIds.concat((data ?? []).map((r: any) => r.id));
    }

    const realRows = [...xResult.rows, ...fbResult.rows];
    if (realRows.length) {
      const { data, error } = await admin
        .from("social_mentions")
        .upsert(realRows, { onConflict: "channel,external_id", ignoreDuplicates: true })
        .select("id");
      if (error) throw error;
      insertedIds = insertedIds.concat((data ?? []).map((r: any) => r.id));
    }

    // Auto-analyze each new mention (sevra-analyze auto-creates incidents on high risk)
    let analyzed = 0;
    for (const id of insertedIds) {
      try {
        const r = await fetch(`${supabaseUrl}/functions/v1/sevra-analyze`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${serviceKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ mention_id: id }),
        });
        if (r.ok) analyzed++;
      } catch (_) {
        // continue with other mentions
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        generated: insertedIds.length,
        analyzed,
        network_errors: Object.keys(networkErrors).length ? networkErrors : undefined,
      }),
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
