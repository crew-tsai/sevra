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
    scope: "pages_show_list,pages_read_engagement,pages_manage_posts",
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
