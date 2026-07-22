// OAuth provider configuration for connecting company social accounts.
// Instagram and Facebook share one Meta app (Facebook Login for Business);
// Instagram publishing additionally requires a Business/Creator IG account
// linked to a Facebook Page, configured on Meta's side, not here.

export type Network = "x" | "instagram" | "tiktok" | "facebook";

export const NETWORKS: Network[] = ["x", "instagram", "tiktok", "facebook"];

export function isNetwork(value: unknown): value is Network {
  return typeof value === "string" && (NETWORKS as string[]).includes(value);
}

export type ProviderConfig = {
  authorizeUrl: string;
  tokenUrl: string;
  revokeUrl?: string;
  scope: string;
  // Some providers (TikTok) call the client id param "client_key" instead of
  // "client_id" in both the authorize and token requests.
  clientIdParam: "client_id" | "client_key";
  // X requires HTTP Basic auth (client_id:client_secret) on the token
  // request; the others accept the secret as a plain body/query param.
  tokenAuthStyle: "basic" | "body";
  pkce: boolean;
  // Fetched right after token exchange to populate account_label/avatar_url.
  profileUrl?: string;
};

// Client ID/Secret are NOT configured here — each client's admin enters
// their own via Admin -> Social connections (see social-oauth-credentials),
// stored in the social_app_credentials table.
export const PROVIDERS: Record<Network, ProviderConfig> = {
  x: {
    authorizeUrl: "https://twitter.com/i/oauth2/authorize",
    tokenUrl: "https://api.twitter.com/2/oauth2/token",
    revokeUrl: "https://api.twitter.com/2/oauth2/revoke",
    scope: "tweet.read tweet.write users.read offline.access",
    clientIdParam: "client_id",
    tokenAuthStyle: "basic",
    pkce: true,
    profileUrl: "https://api.twitter.com/2/users/me?user.fields=profile_image_url",
  },
  facebook: {
    authorizeUrl: "https://www.facebook.com/v19.0/dialog/oauth",
    tokenUrl: "https://graph.facebook.com/v19.0/oauth/access_token",
    // pages_read_user_content lets us pull posts that tag the Page (the
    // /tagged edge), in addition to comments on the Page's own posts.
    scope: "pages_show_list,pages_read_engagement,pages_manage_posts,pages_read_user_content",
    clientIdParam: "client_id",
    tokenAuthStyle: "body",
    pkce: false,
    profileUrl: "https://graph.facebook.com/v19.0/me?fields=id,name,picture",
  },
  instagram: {
    // Same Meta app + Facebook Login dialog as `facebook`; the difference is
    // the requested scope. A Page with a linked IG Business account is
    // required for this to resolve to something publishable — resolving the
    // linked IG business account id (via /me/accounts) is left as a
    // follow-up once direct publishing is in scope.
    authorizeUrl: "https://www.facebook.com/v19.0/dialog/oauth",
    tokenUrl: "https://graph.facebook.com/v19.0/oauth/access_token",
    scope: "instagram_basic,pages_show_list,pages_read_engagement",
    clientIdParam: "client_id",
    tokenAuthStyle: "body",
    pkce: false,
    profileUrl: "https://graph.facebook.com/v19.0/me?fields=id,name,picture",
  },
  tiktok: {
    authorizeUrl: "https://www.tiktok.com/v2/auth/authorize",
    tokenUrl: "https://open.tiktokapis.com/v2/oauth/token",
    revokeUrl: "https://open.tiktokapis.com/v2/oauth/revoke",
    scope: "user.info.basic",
    clientIdParam: "client_key",
    tokenAuthStyle: "body",
    pkce: true,
    profileUrl: "https://open.tiktokapis.com/v2/user/info/?fields=display_name,avatar_url",
  },
};

export function callbackRedirectUri(supabaseUrl: string): string {
  return `${supabaseUrl}/functions/v1/social-oauth-callback`;
}

// PKCE helpers (Web Crypto, available in Deno's edge runtime).
export function base64UrlEncode(bytes: Uint8Array): string {
  let str = "";
  for (const b of bytes) str += String.fromCharCode(b);
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function generateCodeVerifier(): string {
  return base64UrlEncode(crypto.getRandomValues(new Uint8Array(32)));
}

export async function codeChallengeFromVerifier(verifier: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
  return base64UrlEncode(new Uint8Array(digest));
}

// X access tokens expire in ~2h; refresh_token (from the offline.access
// scope) exchanges for a new pair. Shared by social-publish (before posting)
// and social-monitor-cron (before searching).
// deno-lint-ignore no-explicit-any
export async function refreshXToken(
  admin: any,
  connectionId: string,
  clientId: string,
  clientSecret: string,
  refreshToken: string,
): Promise<string> {
  const res = await fetch("https://api.twitter.com/2/oauth2/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: clientId,
    }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json.access_token) {
    throw new Error("Failed to refresh X access token — try disconnecting and reconnecting the account.");
  }

  const newAccessToken: string = json.access_token;
  const newRefreshToken: string = json.refresh_token ?? refreshToken;
  const expiresIn: number | null = json.expires_in ?? null;
  const tokenExpiresAt = expiresIn ? new Date(Date.now() + expiresIn * 1000).toISOString() : null;

  await admin
    .from("social_connection_tokens")
    .update({ access_token: newAccessToken, refresh_token: newRefreshToken, updated_at: new Date().toISOString() })
    .eq("connection_id", connectionId);
  await admin.from("social_connections").update({ token_expires_at: tokenExpiresAt }).eq("network", "x");

  return newAccessToken;
}
