// Pulls real mentions for connected X/Facebook accounts, and simulates
// Instagram/TikTok posts via an LLM (no real connection/publish maturity
// there yet). All new rows run through SEVRA analysis afterward.
// Triggered by pg_cron every 15 minutes (or on-demand).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { refreshXToken, META_GRAPH } from "../_shared/social-providers.ts";
import { resolveCredentials } from "../_shared/social-credentials.ts";
import { profileFor } from "../_shared/industries.ts";
import { chatCompletion, MODELS } from "../_shared/ai.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Instagram is monitored for real now; only TikTok is left to simulate, and
// only where a workspace asked for simulation.
const SIM_CHANNELS = ["tiktok"] as const;

// Accepts two legitimate callers: the pg_cron job (Bearer = service-role
// key) and the "Run monitor now" button (Bearer = a real user session).
function parseJwtClaims(token: string): Record<string, unknown> | null {
  const parts = token.split(".");
  if (parts.length < 2) return null;
  try {
    const payload = parts[1]
      .replaceAll("-", "+")
      .replaceAll("_", "/")
      .padEnd(Math.ceil(parts[1].length / 4) * 4, "=");
    return JSON.parse(atob(payload)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function buildSimPrompt(companyName: string | null, industry: string | null): string {
  const vocab = profileFor(industry);
  const company = companyName ?? "the company";
  return `Generate 2 realistic, DISTINCT social media posts (in Spanish, English, or French — mix languages) about possible incidents happening RIGHT NOW with ${company.toUpperCase()}${industry ? `, an organization in the ${industry} sector` : ""} (think: ${vocab.simFlavor}). All posts MUST mention ${company} by name and use realistic ${vocab.serviceLabel.toLowerCase()}s in the style of "${vocab.serviceExample}". Vary the ${vocab.routeLabel.toLowerCase()} in the style of "${vocab.routeExample}" and location codes like "${vocab.locationExample}". Mix risk levels: include 1 likely real incident (delay, safety, customer treatment, outage, etc.) and 1 lower-risk or noise post (joke, vague complaint, or unrelated). Never mention competitor companies.

Return STRICT JSON only:
{
  "posts": [
    {
      "channel": "tiktok",
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
}

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
async function generateSimulatedMentions(companyName: string | null, industry: string | null): Promise<any[]> {
  const res = await chatCompletion({
    model: MODELS.fast,
    messages: [
      { role: "system", content: "You produce realistic synthetic social media data. Output strict JSON only." },
      { role: "user", content: buildSimPrompt(companyName, industry) },
    ],
    response_format: { type: "json_object" },
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`AI request failed (${res.status}): ${txt}`);
  }
  const json = await res.json();
  const content = json.choices?.[0]?.message?.content ?? "{}";
  const parsed = JSON.parse(content);
  const posts = Array.isArray(parsed.posts) ? parsed.posts : [];
  // deno-lint-ignore no-explicit-any
  return posts.filter((p: any) => p && typeof p.content === "string" && SIM_CHANNELS.includes(p.channel));
}

// deno-lint-ignore no-explicit-any
/**
 * Pull real X mentions.
 *
 * What to search for and what to search *with* are independent, and conflating
 * them is why a client saw nothing until they connected an account. X's search
 * endpoint accepts an app-only bearer token — it authorises nothing on anyone's
 * behalf and reads only public posts — so monitoring never needed the client's
 * consent. It was gated on a connection purely because the handle came off it.
 *
 * Terms: the connected account's handle if there is one, otherwise the handle
 * typed in Admin, plus the company name either way.
 *
 * Credential: the connected user's token when available, since it keeps the
 * existing behaviour intact and carries that account's own context; the
 * app-only bearer otherwise.
 */
/**
 * The X search for this company.
 *
 * A bare company name matches any post containing that word: "Lessence" pulled
 * French posts about petrol prices. Two things narrow it:
 *
 *  - The languages the company is talked about in (lang:), which X filters
 *    reliably. With them set, the name can be searched on its own again, so
 *    posts that name the company without tagging it -- in a crisis usually the
 *    larger half -- are caught alongside those that tag the handle.
 *  - Words to exclude, for whatever noise is left.
 *
 * Without either, the handle alone is searched when there is one, since a
 * common-word name on its own is mostly noise.
 */
export function buildXQuery(o: { companyName: string | null; handle: string; languages: string[]; excludeTerms: string[] }): string {
  const clean = (s: string) => s.replace(/["()]/g, " ").replace(/\s+/g, " ").trim();
  const name = o.companyName ? clean(o.companyName) : "";
  const handle = o.handle.replace(/[^A-Za-z0-9_]/g, "");
  const langs = [...new Set(o.languages.map((l) => l.toLowerCase()).filter((l) => /^[a-z]{2,3}$/.test(l)))];
  const excludes = [...new Set(o.excludeTerms.map(clean).filter(Boolean))];
  const focused = langs.length > 0 || excludes.length > 0;

  const terms: string[] = [];
  if (handle) terms.push(`@${handle}`);
  if (name && (focused || !handle)) terms.push(`"${name}"`);
  if (!terms.length) return "";

  const parts = [terms.length > 1 ? `(${terms.join(" OR ")})` : terms[0]];
  if (langs.length === 1) parts.push(`lang:${langs[0]}`);
  if (langs.length > 1) parts.push(`(${langs.map((l) => `lang:${l}`).join(" OR ")})`);
  for (const e of excludes) parts.push(e.includes(" ") ? `-"${e}"` : `-${e}`);
  parts.push("-is:retweet");

  // X rejects queries over 512 characters; drop exclusions from the end first.
  let q = parts.join(" ");
  while (q.length > 512 && parts.length > 2) {
    parts.splice(parts.length - 2, 1);
    q = parts.join(" ");
  }
  return q;
}

async function pullRealX(admin: any, companyName: string | null): Promise<{ rows: MentionRow[]; error?: string }> {
  const { data: connection } = await admin
    .from("social_connections")
    .select("id, account_label, token_expires_at")
    .eq("network", "x")
    .eq("status", "connected")
    .maybeSingle();

  try {
    const { data: settings } = await admin
      .from("company_settings")
      .select("x_handle, monitor_languages, monitor_exclude_terms")
      .maybeSingle();

    const handle = String(connection?.account_label ?? settings?.x_handle ?? "")
      .replace(/^@/, "")
      .trim();
    const query = buildXQuery({
      companyName,
      handle,
      languages: settings?.monitor_languages ?? [],
      excludeTerms: settings?.monitor_exclude_terms ?? [],
    });

    // Nothing to look for is not a failure — it is a workspace that has not
    // said who it is yet, and saying so on every tick would be noise.
    const handleTerm = handle ? `@${handle}` : null;
    const nameTerm = companyName ? `"${companyName}"` : null;
    if (!handleTerm && !nameTerm) return { rows: [] };

    let accessToken: string | null = null;

    if (connection) {
      const { data: tokenRow } = await admin
        .from("social_connection_tokens")
        .select("access_token, refresh_token")
        .eq("connection_id", connection.id)
        .maybeSingle();
      accessToken = tokenRow?.access_token ?? null;

      const expiresAt = connection.token_expires_at ? new Date(connection.token_expires_at).getTime() : null;
      if (accessToken && expiresAt !== null && expiresAt - Date.now() < 60_000 && tokenRow?.refresh_token) {
        // Must be the same app the token was minted under, so this goes through
        // the shared resolver rather than reading the table directly.
        const creds = await resolveCredentials(admin, "x");
        if (creds) {
          accessToken = await refreshXToken(admin, connection.id, creds.clientId, creds.clientSecret, tokenRow.refresh_token);
        }
      }
    }

    // Sevra's own app-only token. Reads public posts, acts for nobody.
    if (!accessToken) accessToken = Deno.env.get("PLATFORM_X_BEARER_TOKEN")?.trim() || null;

    if (!accessToken) {
      return {
        rows: [],
        error: connection
          ? "X connected but no stored access token — try reconnecting."
          : "X monitoring needs either a connected account or Sevra's app-only token.",
      };
    }

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

/**
 * Instagram: comments on the account's own posts, and posts by other people
 * that tag or mention it. Instagram allows nothing wider — a post naming the
 * company without tagging it cannot be found through any API — so this is the
 * whole of what monitoring can see there.
 *
 * Reached through the Facebook Page the Instagram Business account is linked
 * to, with that Page's token.
 */
// deno-lint-ignore no-explicit-any
async function pullRealInstagram(admin: any): Promise<{ rows: MentionRow[]; error?: string }> {
  const { data: connection } = await admin
    .from("social_connections")
    .select("id, account_id, account_label")
    .eq("network", "instagram")
    .eq("status", "connected")
    .maybeSingle();
  if (!connection || !connection.account_id) return { rows: [] };

  try {
    const { data: tokenRow } = await admin
      .from("social_connection_tokens")
      .select("access_token")
      .eq("connection_id", connection.id)
      .maybeSingle();
    if (!tokenRow?.access_token) {
      return { rows: [], error: "Instagram connected but no stored token — try reconnecting." };
    }

    const igId = connection.account_id;
    const accessToken = tokenRow.access_token;
    const rows: MentionRow[] = [];

    // Comments on the account's own recent posts.
    const mediaParams = new URLSearchParams({
      fields: "id,permalink,caption,timestamp,comments.limit(50){id,text,username,timestamp,like_count}",
      limit: "25",
      access_token: accessToken,
    });
    const mediaRes = await fetch(`${META_GRAPH}/${igId}/media?${mediaParams}`);
    const mediaJson = await mediaRes.json().catch(() => ({}));
    if (!mediaRes.ok) {
      return { rows: [], error: mediaJson?.error?.message ?? `Instagram media pull failed (${mediaRes.status})` };
    }
    for (const media of mediaJson.data ?? []) {
      for (const comment of media.comments?.data ?? []) {
        if (!comment.text) continue;
        rows.push({
          channel: "instagram",
          external_id: comment.id,
          author_name: comment.username ?? null,
          author_handle: comment.username ?? null,
          content: comment.text,
          post_url: media.permalink ?? null,
          likes: comment.like_count ?? 0,
          shares: 0,
          reach: 0,
          is_verified: false,
          is_influencer: false,
          posted_at: comment.timestamp ?? new Date().toISOString(),
          status: "pending",
          created_by: null,
        });
      }
    }

    // Posts by other people that tag the account.
    const tagParams = new URLSearchParams({
      fields: "id,caption,username,permalink,timestamp,like_count,comments_count",
      limit: "25",
      access_token: accessToken,
    });
    const tagsRes = await fetch(`${META_GRAPH}/${igId}/tags?${tagParams}`);
    const tagsJson = await tagsRes.json().catch(() => ({}));
    if (tagsRes.ok) {
      for (const media of tagsJson.data ?? []) {
        if (!media.caption) continue;
        rows.push({
          channel: "instagram",
          external_id: media.id,
          author_name: media.username ?? null,
          author_handle: media.username ?? null,
          content: media.caption,
          post_url: media.permalink ?? null,
          likes: media.like_count ?? 0,
          shares: media.comments_count ?? 0,
          reach: 0,
          is_verified: false,
          is_influencer: false,
          posted_at: media.timestamp ?? new Date().toISOString(),
          status: "pending",
          created_by: null,
        });
      }
    }

    return { rows };
  } catch (e) {
    return { rows: [], error: e instanceof Error ? e.message : String(e) };
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
    const feedRes = await fetch(`${META_GRAPH}/${pageId}/feed?${feedParams}`);
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
    const taggedRes = await fetch(`${META_GRAPH}/${pageId}/tagged?${taggedParams}`);
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

    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace(/^Bearer\s+/i, "");
    const claims = parseJwtClaims(token);
    const isServiceRole = claims?.role === "service_role";

    if (!isServiceRole) {
      let userId: string | null = null;
      try {
        const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? serviceKey;
        const userClient = createClient(supabaseUrl, anonKey, {
          global: { headers: { Authorization: authHeader } },
        });
        const { data: userData } = await userClient.auth.getUser();
        userId = userData?.user?.id ?? null;
      } catch { /* non-fatal, checked below */ }

      if (!userId) {
        return new Response(JSON.stringify({ success: false, error: "Not authenticated" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const { data: settings } = await admin.from("company_settings").select("company_name, industry, simulation_enabled").maybeSingle();
    const companyName = settings?.company_name ?? null;
    const industry = settings?.industry ?? null;

    const networkErrors: Record<string, string> = {};

    // Only fabricate mentions where a workspace has explicitly asked for it.
    // These become incident rows indistinguishable from real ones, and a
    // client who connected nothing should see an empty board, not invented
    // emergencies.
    const simulate = settings?.simulation_enabled === true;

    const [simPosts, xResult, fbResult, igResult] = await Promise.all([
      simulate
        ? generateSimulatedMentions(companyName, industry).catch((e) => {
            networkErrors.simulation = e?.message ?? String(e);
            return [];
          })
        : Promise.resolve([] as any[]),
      pullRealX(admin, companyName),
      pullRealFacebook(admin),
      pullRealInstagram(admin),
    ]);
    if (xResult.error) networkErrors.x = xResult.error;
    if (fbResult.error) networkErrors.facebook = fbResult.error;
    if (igResult.error) networkErrors.instagram = igResult.error;

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

    const realRows = [...xResult.rows, ...fbResult.rows, ...igResult.rows];
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

    // What Social Intel shows as "last run". Written on every run, cron or
    // manual, so it cannot drift from what actually happened.
    const { error: runErr } = await admin
      .from("company_settings")
      .update({
        monitor_last_run_at: new Date().toISOString(),
        monitor_last_result: {
          generated: insertedIds.length,
          analyzed,
          ...(Object.keys(networkErrors).length ? { network_errors: networkErrors } : {}),
        },
      })
      .not("id", "is", null);
    if (runErr) console.error("social-monitor-cron: recording last run failed", runErr.message);

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
