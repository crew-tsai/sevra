// Resolves which developer app to use when talking to a social network.
//
// Originally every client had to register their own Facebook Developer / X
// developer app and paste the Client ID and Secret into Admin. That works, but
// it puts a platform-engineering task in front of a comms team, and most
// clients will never have those accounts.
//
// The reason it was built that way is worth remembering: the Meta scopes this
// product needs (pages_manage_posts, pages_read_engagement,
// pages_read_user_content) are Advanced Access. An unreviewed app can only act
// on Pages belonging to people who hold a role on the app itself -- so a client
// using their own app needs no App Review, while a shared Sevra app does.
//
// So both paths exist, and the client's own app wins when present:
//
//   1. social_app_credentials  -- this client's own app. Their own API quota,
//                                 and their own name on the OAuth consent
//                                 screen, which larger customers insist on.
//   2. PLATFORM_* env secrets  -- Sevra's reviewed app, seeded at provisioning.
//
// Precedence matters: a client who deliberately registered their own app must
// not be silently switched onto the shared one, because the shared app's rate
// limit is pooled across every client.
import type { Network } from "./social-providers.ts";

export type CredentialSource = "client" | "platform";

export type ResolvedCredentials = {
  clientId: string;
  clientSecret: string;
  source: CredentialSource;
};

// Facebook and Instagram are one Meta app (Facebook Login for Business), so
// they read one pair of env vars rather than two identical ones.
const ENV_PREFIX: Record<Network, string> = {
  x: "PLATFORM_X",
  facebook: "PLATFORM_META",
  instagram: "PLATFORM_META",
  tiktok: "PLATFORM_TIKTOK",
};

/** Sevra's own app for this network, or null when none is configured. */
export function platformCredentials(network: Network): ResolvedCredentials | null {
  const prefix = ENV_PREFIX[network];
  const clientId = Deno.env.get(`${prefix}_CLIENT_ID`);
  const clientSecret = Deno.env.get(`${prefix}_CLIENT_SECRET`);
  if (!clientId?.trim() || !clientSecret?.trim()) return null;
  return { clientId: clientId.trim(), clientSecret: clientSecret.trim(), source: "platform" };
}

/** True when this deployment could connect the network with no client setup. */
export function platformNetworks(): Record<Network, boolean> {
  const out = {} as Record<Network, boolean>;
  for (const n of Object.keys(ENV_PREFIX) as Network[]) out[n] = platformCredentials(n) !== null;
  return out;
}

/**
 * The client's own app if they registered one, otherwise Sevra's.
 * Returns null when neither exists -- the network simply can't be connected.
 */
export async function resolveCredentials(
  admin: { from: (t: string) => any },
  network: Network,
): Promise<ResolvedCredentials | null> {
  const { data } = await admin
    .from("social_app_credentials")
    .select("client_id, client_secret")
    .eq("network", network)
    .maybeSingle();

  if (data?.client_id?.trim() && data?.client_secret?.trim()) {
    return {
      clientId: data.client_id.trim(),
      clientSecret: data.client_secret.trim(),
      source: "client",
    };
  }
  return platformCredentials(network);
}

/**
 * Shown to an admin when a network can't be connected at all. Names the one
 * action that actually unblocks them rather than assuming they have a
 * developer account.
 */
export function noCredentialsMessage(networkLabel: string): string {
  return (
    `${networkLabel} isn't available yet. Sevra's ${networkLabel} app is still being ` +
    `approved by the provider. You can connect immediately by registering your own ` +
    `developer app and adding its Client ID and Secret below.`
  );
}
