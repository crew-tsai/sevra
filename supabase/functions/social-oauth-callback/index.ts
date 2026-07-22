// Provider redirects here after the user approves (or denies) the OAuth
// consent screen. No user JWT is present — the request comes straight from
// the provider's browser redirect, authenticated only by the one-time
// `state` value we minted in social-oauth-start.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { callbackRedirectUri, isNetwork, PROVIDERS } from "../_shared/social-providers.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function redirect(siteUrl: string, params: Record<string, string>) {
  const url = new URL(`${siteUrl}/admin`);
  url.searchParams.set("tab", "social");
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return new Response(null, { status: 302, headers: { ...corsHeaders, Location: url.toString() } });
}

// Facebook posts must go through a Page (POST /{page-id}/feed) using that
// Page's own access token — the personal user token fetchProfile() would
// otherwise use cannot post to a Page's feed. This exchanges the short-lived
// user token for a long-lived one first, so the derived Page token doesn't
// die in ~2 hours, then resolves the first Page the user manages.
async function resolveFacebookPage(
  clientId: string,
  clientSecret: string,
  shortLivedUserToken: string,
): Promise<
  | { error: string }
  | { page: { id: string; name: string; access_token: string }; tokenExpiresAt: string | null }
> {
  try {
    const exchangeParams = new URLSearchParams({
      grant_type: "fb_exchange_token",
      client_id: clientId,
      client_secret: clientSecret,
      fb_exchange_token: shortLivedUserToken,
    });
    const exchangeRes = await fetch(`https://graph.facebook.com/v19.0/oauth/access_token?${exchangeParams}`);
    const exchangeJson = await exchangeRes.json().catch(() => ({}));
    const longLivedToken: string | null = exchangeRes.ok ? exchangeJson.access_token ?? null : null;
    const userToken = longLivedToken ?? shortLivedUserToken;

    const pagesRes = await fetch(
      `https://graph.facebook.com/v19.0/me/accounts?access_token=${encodeURIComponent(userToken)}`,
    );
    const pagesJson = await pagesRes.json().catch(() => ({}));
    const page = pagesJson?.data?.[0];
    if (!pagesRes.ok || !page) {
      return { error: "No Facebook Page found — your Facebook account needs to manage at least one Page to connect." };
    }

    const tokenExpiresAt =
      longLivedToken && exchangeJson.expires_in
        ? new Date(Date.now() + exchangeJson.expires_in * 1000).toISOString()
        : null;

    return { page: { id: page.id, name: page.name, access_token: page.access_token }, tokenExpiresAt };
  } catch (e) {
    console.error("resolveFacebookPage error:", e);
    return { error: "Failed to resolve a Facebook Page for this account." };
  }
}

async function fetchProfile(network: string, profileUrl: string | undefined, accessToken: string) {
  if (!profileUrl) return { account_id: null as string | null, account_label: null as string | null, avatar_url: null as string | null };
  try {
    const res = await fetch(profileUrl, { headers: { Authorization: `Bearer ${accessToken}` } });
    if (!res.ok) return { account_id: null, account_label: null, avatar_url: null };
    const json = await res.json();
    if (network === "x") {
      const u = json?.data ?? {};
      return { account_id: u.id ?? null, account_label: u.username ? `@${u.username}` : null, avatar_url: u.profile_image_url ?? null };
    }
    if (network === "facebook" || network === "instagram") {
      return { account_id: json?.id ?? null, account_label: json?.name ?? null, avatar_url: json?.picture?.data?.url ?? null };
    }
    if (network === "tiktok") {
      const u = json?.data?.user ?? {};
      return { account_id: u.open_id ?? null, account_label: u.display_name ?? null, avatar_url: u.avatar_url ?? null };
    }
    return { account_id: null, account_label: null, avatar_url: null };
  } catch {
    return { account_id: null, account_label: null, avatar_url: null };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const siteUrl = Deno.env.get("SITE_URL") ?? supabaseUrl;
  const admin = createClient(supabaseUrl, serviceKey);

  try {
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const providerError = url.searchParams.get("error");

    if (providerError) {
      return redirect(siteUrl, { error: providerError });
    }
    if (!code || !state) {
      return redirect(siteUrl, { error: "Missing code or state from provider" });
    }

    const { data: stateRow, error: stateErr } = await admin
      .from("oauth_states")
      .select("*")
      .eq("state", state)
      .maybeSingle();
    if (stateErr) throw stateErr;
    if (!stateRow || new Date(stateRow.expires_at) < new Date()) {
      return redirect(siteUrl, { error: "OAuth session expired, please try connecting again" });
    }
    // One-time use.
    await admin.from("oauth_states").delete().eq("state", state);

    const network = stateRow.network;
    if (!isNetwork(network)) {
      return redirect(siteUrl, { error: "Unknown network" });
    }
    const provider = PROVIDERS[network];
    const { data: creds } = await admin
      .from("social_app_credentials")
      .select("client_id, client_secret")
      .eq("network", network)
      .maybeSingle();
    if (!creds) {
      return redirect(siteUrl, { network, error: "Developer app credentials not configured for this network" });
    }
    const clientId = creds.client_id;
    const clientSecret = creds.client_secret;

    const redirectUri = callbackRedirectUri(supabaseUrl);
    const body = new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
      [provider.clientIdParam]: clientId,
    });
    if (stateRow.code_verifier) body.set("code_verifier", stateRow.code_verifier);

    const tokenHeaders: Record<string, string> = { "Content-Type": "application/x-www-form-urlencoded" };
    if (provider.tokenAuthStyle === "basic") {
      tokenHeaders.Authorization = `Basic ${btoa(`${clientId}:${clientSecret}`)}`;
    } else {
      body.set("client_secret", clientSecret);
    }

    const tokenRes = await fetch(provider.tokenUrl, { method: "POST", headers: tokenHeaders, body });
    const tokenJson = await tokenRes.json().catch(() => ({}));
    if (!tokenRes.ok || !tokenJson.access_token) {
      console.error(`social-oauth-callback: ${network} token exchange failed`, tokenJson);
      return redirect(siteUrl, { network, error: "Token exchange failed" });
    }

    let accessToken: string = tokenJson.access_token;
    let refreshToken: string | null = tokenJson.refresh_token ?? null;
    let expiresIn: number | null = tokenJson.expires_in ?? null;
    let tokenExpiresAt = expiresIn ? new Date(Date.now() + expiresIn * 1000).toISOString() : null;

    let profile: { account_id: string | null; account_label: string | null; avatar_url: string | null };
    let connectError: string | null = null;

    if (network === "facebook") {
      // Facebook posts go to a Page, not the personal profile — swap the
      // user token out for that Page's own access token before storing.
      const pageResult = await resolveFacebookPage(clientId, clientSecret, accessToken);
      if ("error" in pageResult) {
        connectError = pageResult.error;
        profile = { account_id: null, account_label: null, avatar_url: null };
      } else {
        accessToken = pageResult.page.access_token;
        refreshToken = null;
        tokenExpiresAt = pageResult.tokenExpiresAt;
        profile = {
          account_id: pageResult.page.id,
          account_label: pageResult.page.name,
          avatar_url: `https://graph.facebook.com/${pageResult.page.id}/picture?type=large`,
        };
      }
    } else {
      profile = await fetchProfile(network, provider.profileUrl, accessToken);
    }

    const { data: connection, error: connErr } = await admin
      .from("social_connections")
      .update({
        status: connectError ? "error" : "connected",
        account_id: profile.account_id,
        account_label: profile.account_label,
        avatar_url: profile.avatar_url,
        scopes: provider.scope.split(/[ ,]+/),
        token_expires_at: tokenExpiresAt,
        last_error: connectError,
        connected_by: connectError ? null : stateRow.created_by,
        connected_at: connectError ? null : new Date().toISOString(),
      })
      .eq("network", network)
      .select("id")
      .maybeSingle();
    if (connErr) throw connErr;
    if (!connection) throw new Error(`No social_connections row seeded for network '${network}'`);

    if (connectError) {
      return redirect(siteUrl, { network, error: connectError });
    }

    const { error: tokErr } = await admin
      .from("social_connection_tokens")
      .upsert({ connection_id: connection.id, access_token: accessToken, refresh_token: refreshToken, updated_at: new Date().toISOString() });
    if (tokErr) throw tokErr;

    return redirect(siteUrl, { connected: network });
  } catch (e: any) {
    console.error("social-oauth-callback error:", e);
    return redirect(siteUrl, { error: e?.message ?? String(e) });
  }
});
