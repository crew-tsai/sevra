// What monitoring can reach, and the kinds of actor worth watching.
//
// Mirrored into supabase/functions/_shared/watched-sources.ts — same module,
// two toolchains, checked byte-for-byte by scripts/check-shared-sync.mjs. It
// imports nothing so the two copies can stay identical.
//
// The first version of this feature was one flat list of accounts, hashtags
// and words, with a network column the client had to fill in themselves. That
// asked the client to know what each platform permits — and to create the BBC
// twice, once for X and once for Facebook, as two rows that knew nothing of
// each other. The model here is the one the client already has in their head:
//
//   a SOURCE is an actor — a newspaper, a regulator, a campaigner — who has
//   accounts on whichever networks they happen to use;
//   a TOPIC is a hashtag or a phrase, which belongs to no one.
//
// The client says who to watch. This table says what that turns into.

export type Network = "x" | "instagram" | "tiktok" | "facebook";

export const NETWORKS: Network[] = ["x", "instagram", "tiktok", "facebook"];

export function isNetwork(value: unknown): value is Network {
  return typeof value === "string" && (NETWORKS as string[]).includes(value);
}

// How each network is named in anything an admin reads. Kept beside the reach
// table so the UI and the edge functions cannot drift on what to call X.
export const NETWORK_LABELS: Record<Network, string> = {
  x: "X (Twitter)",
  instagram: "Instagram",
  tiktok: "TikTok",
  facebook: "Facebook",
};

/**
 * What monitoring can actually reach on each network.
 *
 * Load-bearing, not documentation. social-monitor-cron consults `search` to
 * decide whether a watched source becomes a query or a rule applied to what
 * arrives; the UI generates each source's coverage from it; and the assistant
 * generates its explanation of monitoring from the same table. A platform that
 * opens up is changed here, once.
 */
export const MONITOR_REACH: Record<Network, { search: boolean; ownAccount: boolean; why: string }> = {
  x: {
    search: true,
    ownAccount: true,
    why: "searched across the whole platform with Sevra's own application token, so the client needs no connection and no credentials — only their handle",
  },
  facebook: {
    search: false,
    ownAccount: true,
    why: "comments, tags and mentions on the client's own Pages only; Facebook serves no post search without a session",
  },
  instagram: {
    search: false,
    ownAccount: true,
    why: "comments, tags and mentions on the client's own account only; the official hashtag search needs permissions still in review with Meta",
  },
  tiktok: {
    search: false,
    ownAccount: false,
    why: "cannot be monitored at all — TikTok offers no way to search for mentions outside its academic research programme. An account is connected so Sevra can act on it, never to listen",
  },
};

export type SourceRole = "press" | "regulator" | "activist" | "competitor" | "partner" | "community";

/**
 * One list for every industry.
 *
 * Decided with the partners on 2026-09-23, against a per-industry vocabulary:
 * the regulator of an airline and the regulator of a hospital are different
 * bodies but the same role, and what changes between sectors is the examples,
 * not the roles. Incident subtypes are per-industry because a communications
 * team classifies an event differently by sector; they do not classify a
 * newspaper differently.
 *
 * `speaks` is the phrase handed to the AI when this source raised an incident.
 * It is context, never an instruction: knowing a supervisory body is speaking
 * changes how a statement is written, and changes nothing about what still
 * needs two approvals before it leaves the building.
 *
 * `watchesEverything` and `amplifies` are the defaults a new source of this
 * role gets. Both are stored per source and the admin can overrule either —
 * the role sets the sensible starting point, it does not lock anything.
 */
export const SOURCE_ROLES: Array<{
  id: SourceRole;
  speaks: string;
  watchesEverything: boolean;
  amplifies: boolean;
}> = [
  {
    id: "press",
    speaks: "a news organisation or a journalist",
    // A newsroom publishes all day and almost none of it concerns any one
    // company. Watching the whole feed means analysing hundreds of posts to
    // find nothing.
    watchesEverything: false,
    amplifies: true,
  },
  {
    id: "regulator",
    speaks: "a supervisory body with authority over the company",
    // Worth reading whole: a regulator circling the sector matters before it
    // names anybody, and by the time it names you it is no longer early.
    watchesEverything: true,
    amplifies: true,
  },
  {
    id: "activist",
    speaks: "a campaigner or an advocacy group",
    watchesEverything: true,
    amplifies: true,
  },
  {
    id: "competitor",
    speaks: "a competitor in the same market",
    watchesEverything: false,
    amplifies: false,
  },
  {
    id: "partner",
    speaks: "a partner, supplier or distributor",
    watchesEverything: false,
    amplifies: false,
  },
  {
    id: "community",
    speaks: "a customer community or a local voice",
    watchesEverything: false,
    amplifies: false,
  },
];

export const SOURCE_ROLE_IDS: SourceRole[] = SOURCE_ROLES.map((r) => r.id);

export function roleDefaults(role: string) {
  return SOURCE_ROLES.find((r) => r.id === role) ?? SOURCE_ROLES[SOURCE_ROLES.length - 1];
}

export type Coverage = "searched" | "own_accounts" | "none";

export function coverageOf(network: Network): Coverage {
  const reach = MONITOR_REACH[network];
  if (reach.search) return "searched";
  if (reach.ownAccount) return "own_accounts";
  return "none";
}

/**
 * What a source actually watches, given the networks it has an account on and
 * the networks this workspace has connected.
 *
 * The point of returning the empty cases separately is that the UI has to say
 * them out loud. A source with one TikTok handle is configured and inert; a
 * source with a Facebook Page and no Facebook connection is configured and
 * inert until someone connects it. Both used to look exactly like a source
 * that was working.
 */
export function sourceCoverage(
  networks: Network[],
  connected: Network[] = [],
): {
  searched: Network[];
  ownAccounts: Network[];
  needsConnection: Network[];
  unreachable: Network[];
  watchesNothing: boolean;
} {
  const searched: Network[] = [];
  const ownAccounts: Network[] = [];
  const needsConnection: Network[] = [];
  const unreachable: Network[] = [];

  for (const n of networks) {
    const cover = coverageOf(n);
    if (cover === "searched") searched.push(n);
    else if (cover === "none") unreachable.push(n);
    else if (connected.includes(n)) ownAccounts.push(n);
    else needsConnection.push(n);
  }

  return {
    searched,
    ownAccounts,
    needsConnection,
    unreachable,
    watchesNothing: searched.length === 0 && ownAccounts.length === 0,
  };
}
