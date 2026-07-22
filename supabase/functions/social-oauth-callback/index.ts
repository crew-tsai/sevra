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
    const clientId = Deno.env.get(provider.clientIdEnv);
    const clientSecret = Deno.env.get(provider.clientSecretEnv);
    if (!clientId || !clientSecret) {
      return redirect(siteUrl, { network, error: `${provider.clientIdEnv}/${provider.clientSecretEnv} not configured` });
    }

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

    const accessToken: string = tokenJson.access_token;
    const refreshToken: string | null = tokenJson.refresh_token ?? null;
    const expiresIn: number | null = tokenJson.expires_in ?? null;
    const tokenExpiresAt = expiresIn ? new Date(Date.now() + expiresIn * 1000).toISOString() : null;

    const profile = await fetchProfile(network, provider.profileUrl, accessToken);

    const { data: connection, error: connErr } = await admin
      .from("social_connections")
      .update({
        status: "connected",
        account_id: profile.account_id,
        account_label: profile.account_label,
        avatar_url: profile.avatar_url,
        scopes: provider.scope.split(/[ ,]+/),
        token_expires_at: tokenExpiresAt,
        last_error: null,
        connected_by: stateRow.created_by,
        connected_at: new Date().toISOString(),
      })
      .eq("network", network)
      .select("id")
      .maybeSingle();
    if (connErr) throw connErr;
    if (!connection) throw new Error(`No social_connections row seeded for network '${network}'`);

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
