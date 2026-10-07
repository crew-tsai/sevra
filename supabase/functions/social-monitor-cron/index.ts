// Pulls real mentions for connected X/Facebook accounts, and simulates
// Instagram/TikTok posts via an LLM (no real connection/publish maturity
// there yet). All new rows run through SEVRA analysis afterward.
// Triggered by pg_cron every 15 minutes (or on-demand).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { refreshXToken, META_GRAPH, MONITOR_REACH } from "../_shared/social-providers.ts";
import { resolveCredentials } from "../_shared/social-credentials.ts";
import { profileFor } from "../_shared/industries.ts";
import { chatCompletion, MODELS } from "../_shared/ai.ts";
import { crisisLevel } from "../_shared/crisis-level.ts";

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
  // The author's audience, kept separately from reach so that "who said it"
  // stays legible after reach falls back to it.
  author_followers?: number;
  is_verified?: boolean;
  is_influencer?: boolean;
  // Which watched source or topic brought this in. Null for a post the brand
  // search found on the company's own name, which is its own answer to "why
  // do I have this".
  matched_source_id?: string | null;
  matched_topic_id?: string | null;
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
  // X guesses a language and returns "und" when a post is too short to guess
  // from -- which is the shape of exactly the posts that matter most, a
  // three-word complaint. Filtering those out loses them, so "und" always
  // rides along with whatever languages were asked for.
  if (langs.length) {
    const group = [...langs, "und"].map((l) => `lang:${l}`).join(" OR ");
    parts.push(`(${group})`);
  }
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

/**
 * The X searches for this company's watched sources and topics.
 *
 * Plural, and that is the point. X caps a query at 512 characters, which is
 * about seventeen `from:` terms — and an airline watching its regulators, the
 * aviation trade press and the newsrooms along its route network has well over
 * a hundred. The previous version packed what it could into one query and
 * dropped the rest, so a carefully built watchlist of 138 entries was searched
 * 24 at a time and the other 114 were never looked at. Nothing said so: the
 * screen reported what each source *could* reach, not whether it survived
 * being packed.
 *
 * So the list is split across as many queries as it needs. The monitor runs
 * every fifteen minutes and X allows hundreds of searches in that window, so
 * nine requests instead of one costs nothing that matters.
 *
 * Deliberately a separate set of queries from the brand one. The brand search
 * narrows by language, because a bare company name otherwise matches half the
 * internet; a watched source posts in whatever language it posts in, and
 * filtering that out would defeat the reason for watching it.
 *
 * Sources are searched as `from:` — posts *by* them. "Watch this journalist"
 * means what they say, not who mentions them; the latter is already covered
 * when they mention the company.
 */
export function buildSourceQueries(
  sources: Array<{ handle: string; watchEverything: boolean }>,
  topics: Array<{ kind: string; value: string; onlyWithBrand?: boolean }>,
  brand?: { companyName?: string | null; handle?: string | null },
  maxQueries = 12,
): { queries: string[]; dropped: string[] } {
  const cleanPhrase = (s: string) => s.replace(/["()]/g, " ").replace(/\s+/g, " ").trim();
  const cleanHandle = (s: string) => s.replace(/^@/, "").replace(/[^A-Za-z0-9_]/g, "");

  const name = brand?.companyName ? cleanPhrase(brand.companyName) : "";
  const brandHandle = brand?.handle ? cleanHandle(brand.handle) : "";
  const brandTerms = [brandHandle ? `@${brandHandle}` : "", name ? `"${name}"` : ""].filter(Boolean);
  const brandClause = brandTerms.length > 1 ? `(${brandTerms.join(" OR ")})` : brandTerms[0] ?? "";

  // Terms that only count when the company is named alongside them, and terms
  // that stand on their own.
  const narrowed: string[] = [];
  const open: string[] = [];

  for (const source of sources) {
    const handle = cleanHandle(source.handle ?? "");
    if (!handle) continue;
    if (source.watchEverything) open.push(`from:${handle}`);
    // With nothing to match against, "only when they mention us" cannot be
    // expressed, and collecting everything instead would be the opposite of
    // what was asked for.
    else if (brandClause) narrowed.push(`from:${handle}`);
  }

  for (const topic of topics) {
    const raw = (topic.value ?? "").trim();
    if (!raw) continue;
    let term: string | null = null;
    if (topic.kind === "hashtag") {
      // A hashtag cannot hold a space or an accent, so one written with either
      // is silently mangled into something that matches nothing. Those belong
      // in the product as phrases; this keeps the damage visible rather than
      // inventing a tag nobody uses.
      const tag = raw.replace(/^#/, "").replace(/[^A-Za-z0-9_]/g, "");
      if (tag) term = `#${tag}`;
    } else {
      const phrase = cleanPhrase(raw);
      if (phrase) term = phrase.includes(" ") ? `"${phrase}"` : phrase;
    }
    if (!term) continue;
    // "fire", "smoke", "mayday" are the earliest signals an airline gets and
    // the most useless to search for on their own — every fire on earth comes
    // back. Flagged topics are searched only where the company is also named.
    if (topic.onlyWithBrand && brandClause) narrowed.push(term);
    else open.push(term);
  }

  const SUFFIX = " -is:retweet";
  const LIMIT = 512;
  const queries: string[] = [];
  const dropped: string[] = [];

  /** Pack terms into as few queries as will hold them. */
  const pack = (terms: string[], wrap: (group: string) => string) => {
    let batch: string[] = [];
    const flush = () => {
      if (!batch.length) return;
      queries.push(wrap(batch.join(" OR ")) + SUFFIX);
      batch = [];
    };
    for (const term of terms) {
      const next = [...batch, term];
      if (wrap(next.join(" OR ")).length + SUFFIX.length > LIMIT) {
        // A single term that cannot fit even alone is unsearchable, not a
        // reason to stop.
        if (!batch.length) {
          dropped.push(term);
          continue;
        }
        flush();
      }
      batch.push(term);
    }
    flush();
  };

  pack(narrowed, (group) => `((${group}) ${brandClause})`);
  pack(open, (group) => (group.includes(" OR ") ? `(${group})` : group));

  // A ceiling, so a runaway list cannot turn one tick into hundreds of
  // requests. Whatever does not fit is named rather than quietly discarded.
  if (queries.length > maxQueries) {
    const cut = queries.splice(maxQueries);
    dropped.push(`${cut.length} further ${cut.length === 1 ? "query" : "queries"} beyond the per-run limit`);
  }

  return { queries, dropped };
}

/**
 * The watched sources and topics, loaded once per run.
 *
 * Sources arrive flattened per network — one row per handle — because that is
 * how both callers use them: the X query wants this network's handles, and the
 * rule applied to Facebook and Instagram wants that network's. The source id
 * rides along so whatever matches can say which entry brought it in.
 */
// deno-lint-ignore no-explicit-any
async function loadWatched(admin: any, network: string) {
  const [{ data: accounts }, { data: topics }] = await Promise.all([
    admin
      .from("monitor_source_accounts")
      .select("handle, network, monitor_sources!inner(id, name, role, amplifies, watch_everything, active)")
      .eq("network", network),
    admin.from("monitor_topics").select("id, kind, value, amplifies, only_with_brand").eq("active", true),
  ]);

  const sources = ((accounts ?? []) as any[])
    .map((a) => ({
      id: a.monitor_sources?.id as string,
      name: a.monitor_sources?.name as string,
      role: a.monitor_sources?.role as string,
      handle: String(a.handle ?? ""),
      amplifies: !!a.monitor_sources?.amplifies,
      watchEverything: !!a.monitor_sources?.watch_everything,
      active: !!a.monitor_sources?.active,
    }))
    .filter((s) => s.active && s.handle);

  return {
    sources,
    topics: ((topics ?? []) as any[]).map((t) => ({
      id: t.id as string,
      kind: String(t.kind),
      value: String(t.value ?? ""),
      amplifies: !!t.amplifies,
      // Searched only where the company is also named. See the comment in
      // buildSourceQueries: "fire" on its own returns every fire on earth.
      onlyWithBrand: !!t.only_with_brand,
    })),
  };
}

type Watched = Awaited<ReturnType<typeof loadWatched>>;

/**
 * Stamp each row with what brought it in.
 *
 * Provenance was the thing this feature was missing: once a post arrived,
 * nothing recorded that the product had gone looking for it on someone's
 * instruction, so a team reading a mention could not tell why they had it.
 * Both columns can end up set — a watched journalist using a watched hashtag
 * matched twice, and saying so is more useful than picking one.
 *
 * Amplification is the same decision it always was, now carried by the source
 * or the topic that matched: it is what raises the crisis level for the same
 * words said by someone with an audience.
 */
function attribute(rows: MentionRow[], watched: Watched): MentionRow[] {
  const byHandle = new Map(watched.sources.map((s) => [s.handle.replace(/^@/, "").toLowerCase(), s]));
  const topics = watched.topics
    .map((t) => ({
      ...t,
      needle: (t.kind === "hashtag" ? `#${t.value.replace(/^#/, "")}` : t.value).toLowerCase(),
    }))
    .filter((t) => t.needle.length > 1);

  return rows.map((row) => {
    const handle = row.author_handle?.replace(/^@/, "").toLowerCase() ?? "";
    const source = handle ? byHandle.get(handle) : undefined;
    const content = (row.content ?? "").toLowerCase();
    const topic = topics.find((t) => content.includes(t.needle));
    if (!source && !topic) return row;
    return {
      ...row,
      matched_source_id: source?.id ?? row.matched_source_id ?? null,
      matched_topic_id: topic?.id ?? row.matched_topic_id ?? null,
      is_influencer: row.is_influencer || !!source?.amplifies || !!topic?.amplifies,
    };
  });
}

/**
 * Apply the watched sources to mentions we did not go looking for.
 *
 * Facebook and Instagram cannot be searched: what arrives is comments, tags
 * and mentions on the client's own accounts, and no watched source can widen
 * that. What a source can do is change what happens when its name turns up in
 * what did arrive — the local MP commenting on your post is a different event
 * from a stranger doing the same, and is_influencer is what carries that into
 * the crisis level.
 *
 * So on X a source is a search. Everywhere else it is a rule applied to what
 * already came in. The UI says which, per source, rather than implying the two
 * are the same.
 */
// deno-lint-ignore no-explicit-any
async function applyWatchedSources(admin: any, rows: MentionRow[], network: string): Promise<MentionRow[]> {
  if (!rows.length) return rows;
  const watched = await loadWatched(admin, network);
  if (!watched.sources.length && !watched.topics.length) return rows;
  return attribute(rows, watched);
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
    // said who it is yet, and saying so on every tick would be noise. A
    // watched source or topic counts as something to look for: a company can
    // be watching an industry hashtag before it has finished filling in its
    // own name.
    const handleTerm = handle ? `@${handle}` : null;
    const nameTerm = companyName ? `"${companyName}"` : null;
    const [{ count: sourcesOnX }, { count: topicsWatched }] = await Promise.all([
      admin
        .from("monitor_source_accounts")
        .select("id", { count: "exact", head: true })
        .eq("network", "x"),
      admin.from("monitor_topics").select("id", { count: "exact", head: true }).eq("active", true),
    ]);
    const watching = (sourcesOnX ?? 0) + (topicsWatched ?? 0);
    if (!handleTerm && !nameTerm && !watching) return { rows: [] };

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

    // Two searches, merged: what is said about the company, and what the
    // sources and topics they asked us to watch are saying. Kept apart
    // because the brand query narrows by language and the watch query must
    // not — see buildSourceQueries.
    const brandCursor = query ? await readCursor(admin, "x", query) : null;
    const brand = query
      ? await searchX(accessToken, query, brandCursor)
      : { rows: [] as MentionRow[], newestId: null as string | null };
    if (query) await writeCursor(admin, "x", query, brand.newestId);
    const watched = await pullWatchedX(admin, accessToken, { companyName, handle });

    // A post can match both. The first copy wins, and the watched search runs
    // second, so a merge must not lose the amplified flag it set.
    const byId = new Map<string, MentionRow>();
    const unkeyed: MentionRow[] = [];
    for (const row of [...brand.rows, ...watched.rows]) {
      const id = row.external_id;
      if (!id) {
        unkeyed.push(row);
        continue;
      }
      const existing = byId.get(id);
      if (existing) {
        // The brand search runs first and knows nothing about who posted, so a
        // post found twice keeps whichever copy carries the amplification and
        // the provenance.
        if (row.is_influencer) existing.is_influencer = true;
        if (row.matched_source_id) existing.matched_source_id = row.matched_source_id;
        if (row.matched_topic_id) existing.matched_topic_id = row.matched_topic_id;
        continue;
      }
      byId.set(id, row);
    }

    return {
      rows: [...byId.values(), ...unkeyed],
      error: brand.error ?? watched.error,
    };
  } catch (e: any) {
    return { rows: [], error: e?.message ?? String(e) };
  }
}

/**
 * Where each query stopped reading last time.
 *
 * Per query, not per channel: the brand search moves far faster than
 * `from:faa`, and one shared cursor would let the busy query's position
 * suppress the quiet one's unread results.
 */
// deno-lint-ignore no-explicit-any
async function readCursor(admin: any, channel: string, query: string): Promise<string | null> {
  const { data } = await admin
    .from("monitor_cursors")
    .select("since_id")
    .eq("channel", channel)
    .eq("query", query)
    .maybeSingle();
  return (data?.since_id as string | null) ?? null;
}

/** Advance a cursor. A tick that found nothing new leaves it where it was. */
// deno-lint-ignore no-explicit-any
async function writeCursor(admin: any, channel: string, query: string, sinceId?: string | null) {
  if (!sinceId) return;
  const { error } = await admin
    .from("monitor_cursors")
    .upsert({ channel, query, since_id: sinceId, updated_at: new Date().toISOString() }, {
      onConflict: "channel,query",
    });
  // A cursor that fails to save costs a re-read, not a lost post, so this is
  // worth a line in the log and nothing more.
  if (error) console.warn(`social-monitor-cron: cursor not saved — ${error.message}`);
}

/**
 * How many followers make a voice an amplifier rather than one more person.
 * Crisis comms cares about this directly: the same sentence from an account
 * people listen to is a different event.
 */
const INFLUENCER_FOLLOWERS = 10_000;

/** X caps a page at 100. Asking for 10 means a surge is invisible. */
const X_PAGE_SIZE = 100;

/**
 * A ceiling on how far one query walks back in a single tick. Only reached
 * when a cursor exists, so a first run collects a page and stops rather than
 * dragging in a week of history.
 */
const X_MAX_PAGES = 5;

/**
 * One X search, mapped to mention rows. Shared by the brand and watch queries.
 *
 * Pages forward from `sinceId` so that volume above one page is collected
 * rather than silently truncated -- the old single page of 10 meant that the
 * busier the hour, the smaller the share of it Sevra saw, which is backwards.
 * Returns the newest id it saw so the caller can advance the cursor.
 */
// deno-lint-ignore no-explicit-any
async function searchX(
  accessToken: string,
  query: string,
  sinceId?: string | null,
): Promise<{ rows: MentionRow[]; error?: string; newestId?: string | null }> {
  const rows: MentionRow[] = [];
  let newestId: string | null = null;
  let nextToken: string | undefined;
  // Without a cursor there is nothing to page towards, and paging would mean
  // backfilling the whole retention window on the first tick.
  const maxPages = sinceId ? X_MAX_PAGES : 1;

  for (let page = 0; page < maxPages; page++) {
    const params = new URLSearchParams({
      query,
      max_results: String(X_PAGE_SIZE),
      "tweet.fields": "created_at,public_metrics,lang",
      expansions: "author_id",
      // public_metrics carries follower_count, and verified_type is the live
      // field -- plain `verified` is the pre-Blue flag and reads false for
      // almost every account, which is why nothing was ever marked verified.
      "user.fields": "username,name,profile_image_url,verified,verified_type,public_metrics",
    });
    if (sinceId) params.set("since_id", sinceId);
    if (nextToken) params.set("next_token", nextToken);

    const res = await fetch(`https://api.twitter.com/2/tweets/search/recent?${params}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = json?.detail || json?.title || `X search failed (${res.status})`;
      // Pages already collected are real findings; a failure partway through
      // reports the error without throwing them away.
      return { rows, error: msg, newestId };
    }

    const users = new Map((json.includes?.users ?? []).map((u: any) => [u.id, u]));
    const tweets = Array.isArray(json.data) ? json.data : [];
    for (const t of tweets) {
      const author = users.get(t.author_id) as any;
      const metrics = author?.public_metrics ?? {};
      const followers = Number(metrics.followers_count ?? 0) || 0;
      const verifiedType = String(author?.verified_type ?? "").toLowerCase();
      // A media outlet or an agency carries an audience whether or not a person
      // behind it is "verified" in the consumer sense.
      const institutional = verifiedType === "business" || verifiedType === "government";
      const impressions = Number(t.public_metrics?.impression_count ?? 0) || 0;

      rows.push({
        channel: "twitter",
        external_id: t.id,
        author_name: author?.name ?? null,
        author_handle: author?.username ?? null,
        author_avatar_url: author?.profile_image_url ?? null,
        content: t.text,
        post_url: author?.username ? `https://twitter.com/${author.username}/status/${t.id}` : null,
        likes: t.public_metrics?.like_count ?? 0,
        shares: t.public_metrics?.retweet_count ?? 0,
        // X returns impressions for very few posts. Follower count is the
        // honest stand-in for "how many people could have seen this".
        reach: impressions > 0 ? impressions : followers,
        author_followers: followers,
        is_verified: !!author?.verified || (verifiedType !== "" && verifiedType !== "none"),
        is_influencer: followers >= INFLUENCER_FOLLOWERS || institutional,
        posted_at: t.created_at ?? new Date().toISOString(),
        status: "pending",
        created_by: null,
      });
      // Tweet ids are monotonic, so the largest is the newest. Compared as
      // numbers of different lengths would misorder; same length compares fine
      // lexicographically, so compare by length first.
      const id = String(t.id);
      if (!newestId || id.length > newestId.length || (id.length === newestId.length && id > newestId)) {
        newestId = id;
      }
    }

    nextToken = json.meta?.next_token;
    if (!nextToken || tweets.length === 0) break;
  }

  return { rows, newestId };
}

/**
 * The sources and topics this company asked to be watched, on X.
 *
 * Runs whether or not the brand query found anything. Every row comes back
 * knowing which source or topic brought it in, and amplified when that entry
 * carries an audience — which is what raises the crisis level for the same
 * words said by someone people listen to.
 */
// deno-lint-ignore no-explicit-any
async function pullWatchedX(
  admin: any,
  accessToken: string,
  brand: { companyName: string | null; handle: string },
): Promise<{ rows: MentionRow[]; error?: string }> {
  const watched = await loadWatched(admin, "x");
  if (!watched.sources.length && !watched.topics.length) return { rows: [] };

  const { queries, dropped } = buildSourceQueries(watched.sources, watched.topics, brand);
  if (!queries.length) return { rows: [] };
  if (dropped.length) {
    // Recorded rather than swallowed: somebody has to be able to find out
    // that part of the watchlist is not being looked at.
    console.warn(
      `social-monitor-cron: ${dropped.length} watched entries left out: ${dropped.join(", ")}`,
    );
  }

  // One request per query, in order. A post can match more than one — a
  // watched journalist using a watched hashtag — so they are merged on the
  // post id before anything is attributed.
  const byId = new Map<string, MentionRow>();
  const unkeyed: MentionRow[] = [];
  let firstError: string | undefined;

  for (const query of queries) {
    const cursor = await readCursor(admin, "x", query);
    const { rows, error, newestId } = await searchX(accessToken, query, cursor);
    await writeCursor(admin, "x", query, newestId);
    if (error) {
      // One failed query does not discard the others. A rate limit partway
      // through a list of nine is a partial collection, not a dead run.
      firstError ??= error;
      console.error(`social-monitor-cron: watch query failed — ${error}`);
      continue;
    }
    for (const row of rows) {
      const id = row.external_id;
      if (!id) {
        unkeyed.push(row);
        continue;
      }
      if (!byId.has(id)) byId.set(id, row);
    }
  }

  const merged = [...byId.values(), ...unkeyed];
  // Reported only when nothing at all came back; a partial result is worth
  // more than an error message.
  return { rows: attribute(merged, watched), error: merged.length ? undefined : firstError };
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

    // Which treatment a network gets is read from MONITOR_REACH, not hardcoded
    // here: a network that can be searched has already had its watched
    // sources applied by the query that found the rows, and one that cannot
    // gets them applied to whatever its own account received. The day a platform
    // opens up, that table is the only thing that changes.
    const byNetwork: Array<{ network: string; rows: MentionRow[] }> = [
      { network: "x", rows: xResult.rows },
      { network: "facebook", rows: fbResult.rows },
      { network: "instagram", rows: igResult.rows },
    ];

    const realRows: MentionRow[] = [];
    for (const { network, rows } of byNetwork) {
      const reach = MONITOR_REACH[network as keyof typeof MONITOR_REACH];
      realRows.push(...(reach?.search ? rows : await applyWatchedSources(admin, rows, network)));
    }
    if (realRows.length) {
      const { data, error } = await admin
        .from("social_mentions")
        .upsert(realRows, { onConflict: "channel,external_id", ignoreDuplicates: true })
        .select("id");
      if (error) throw error;
      insertedIds = insertedIds.concat((data ?? []).map((r: any) => r.id));
    }

    // A mention sevra-analyze started but never finished -- the function was
    // redeployed mid-flight, or it threw somewhere without a handler -- sits
    // at "analyzing" forever and is invisible to the queue below. Old ones go
    // back in line.
    const staleAnalyzing = new Date(Date.now() - 15 * 60 * 1000).toISOString();
    await admin
      .from("social_mentions")
      .update({ status: "pending" })
      .eq("status", "analyzing")
      .lt("updated_at", staleAnalyzing);

    // Analysis is the slow half of a tick: one AI call per mention, against a
    // wall clock. While the collector could only ever return ten rows this
    // loop always finished; now that it pages, a busy tick can produce
    // hundreds, and running out of time mid-loop strands the rest at
    // "pending" forever -- taking the surge check and the retention sweep
    // behind it down too.
    //
    // So the queue is drained in bounded batches, oldest first, and drawn
    // from everything still pending rather than only what this tick inserted.
    // A backlog costs a few minutes of latency instead of being lost, and
    // sevra-analyze flips a row to "analyzing" before it starts, so a batch
    // cannot pick up work already in flight.
    const ANALYSIS_BATCH = 24;
    const ANALYSIS_CONCURRENCY = 4;

    const { data: queued } = await admin
      .from("social_mentions")
      .select("id")
      .eq("status", "pending")
      .order("created_at", { ascending: true })
      .limit(ANALYSIS_BATCH);
    const toAnalyze = ((queued ?? []) as Array<{ id: string }>).map((r) => r.id);

    const analyzeOne = async (id: string): Promise<boolean> => {
      try {
        const r = await fetch(`${supabaseUrl}/functions/v1/sevra-analyze`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${serviceKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ mention_id: id }),
        });
        return r.ok;
      } catch (_) {
        // One mention failing is not a reason to abandon the rest.
        return false;
      }
    };

    let analyzed = 0;
    for (let i = 0; i < toAnalyze.length; i += ANALYSIS_CONCURRENCY) {
      const slice = toAnalyze.slice(i, i + ANALYSIS_CONCURRENCY);
      const results = await Promise.all(slice.map(analyzeOne));
      analyzed += results.filter(Boolean).length;
    }

    // What is still waiting after this tick. Reported so a backlog that never
    // drains is visible instead of being something you notice months later.
    const { count: backlog } = await admin
      .from("social_mentions")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending");

    // Volume is its own signal. Each mention is scored alone, so a crowd all
    // reporting the same thing scores low thirty times over and nothing
    // happens. This runs after analysis so the sub-types it clusters on are
    // already filled in, and it raises an alert rather than an incident: the
    // thresholds are guesses until they have seen real traffic.
    // Any mention analysed before crisis_level existed, or whose write lost a
    // race, has it NULL -- and NULL filters as "not that level", which would
    // quietly hide it from the view somebody watches. This is arithmetic over
    // columns already on the row, so it costs no AI call, and it runs through
    // the same crisisLevel() the analyser and the incident use. There is
    // deliberately no SQL version of these rules to drift from.
    try {
      const { data: unlevelled } = await admin
        .from("social_mentions")
        .select("id, ai_risk, ai_risk_score, is_verified, is_influencer")
        .is("crisis_level", null)
        .not("status", "in", '("pending","analyzing")')
        .limit(500);
      for (const m of (unlevelled ?? []) as Array<Record<string, unknown>>) {
        const level = crisisLevel({
          risk: m.ai_risk as string | null,
          riskScore: m.ai_risk_score as number | null,
          amplified: Boolean(m.is_verified) || Boolean(m.is_influencer),
        });
        await admin.from("social_mentions").update({ crisis_level: level }).eq("id", m.id as string);
      }
      if (unlevelled?.length) {
        console.log(`social-monitor-cron: backfilled crisis_level on ${unlevelled.length} mentions`);
      }
    } catch (e) {
      console.error("social-monitor-cron: crisis_level backfill failed", e);
    }

    let surges = 0;
    try {
      const { data: alerts, error: surgeErr } = await admin.rpc("detect_mention_surge");
      if (surgeErr) console.error("social-monitor-cron: surge check failed", surgeErr.message);
      else {
        surges = (alerts ?? []).length;
        for (const a of alerts ?? []) {
          console.warn(`social-monitor-cron: ${a.kind} — ${a.summary}`);
        }
      }
    } catch (e) {
      // Never allowed to fail the run: a missed alert is worse than a failed
      // one, but a failed collection is worse than both.
      console.error("social-monitor-cron: surge check threw", e);
    }

    // Retention runs on the monitor's own schedule rather than a cron job of
    // its own, so the thing that deletes personal data cannot quietly stop
    // running while everything else looks healthy. Never allowed to fail the
    // run: not collecting mentions is a worse outcome than keeping some for
    // an extra fifteen minutes.
    let expired = 0;
    try {
      const { data: expiredCount, error: expErr } = await admin.rpc("expire_old_mentions");
      if (expErr) console.error("social-monitor-cron: retention sweep failed", expErr.message);
      else expired = Number(expiredCount ?? 0);
    } catch (e) {
      console.error("social-monitor-cron: retention sweep threw", e);
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
          ...(backlog ? { pending_backlog: backlog } : {}),
          ...(surges ? { surges } : {}),
          ...(expired ? { expired } : {}),
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
        pending_backlog: backlog ?? 0,
        surges,
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
