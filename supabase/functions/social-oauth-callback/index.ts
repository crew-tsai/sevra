// Provider redirects here after the user approves (or denies) the OAuth
// consent screen. No user JWT is present — the request comes straight from
// the provider's browser redirect, authenticated only by the one-time
// `state` value we minted in social-oauth-start.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { callbackRedirectUri, isNetwork, PROVIDERS, META_GRAPH } from "../_shared/social-providers.ts";
import { resolveCredentials } from "../_shared/social-credentials.ts";

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
    const exchangeRes = await fetch(`${META_GRAPH}/oauth/access_token?${exchangeParams}`);
    const exchangeJson = await exchangeRes.json().catch(() => ({}));
    const longLivedToken: string | null = exchangeRes.ok ? exchangeJson.access_token ?? null : null;
    const userToken = longLivedToken ?? shortLivedUserToken;

    const pagesRes = await fetch(
      `${META_GRAPH}/me/accounts?access_token=${encodeURIComponent(userToken)}`,
    );
    const pagesJson = await pagesRes.json().catch(() => ({}));
    let page = pagesJson?.data?.[0];

    // Facebook Login for Business grants the Pages the person ticked as
    // "granular scopes" on the token itself, and /me/accounts can come back
    // empty even so (it did, with all four permissions granted). The token's
    // own record names the Page: ask Meta which ids it covers, then fetch that
    // Page and its token directly.
    if (!page) {
      const dbgRes = await fetch(
        `${META_GRAPH}/debug_token?input_token=${encodeURIComponent(userToken)}` +
          `&access_token=${encodeURIComponent(`${clientId}|${clientSecret}`)}`,
      );
      const dbgJson = await dbgRes.json().catch(() => ({}));
      const ids: string[] = [
        ...new Set(
          ((dbgJson?.data?.granular_scopes ?? []) as Array<{ scope: string; target_ids?: string[] }>)
            .filter((g) => g.scope?.startsWith("pages_"))
            .flatMap((g) => g.target_ids ?? []),
        ),
      ];
      for (const id of ids) {
        const res = await fetch(
          `${META_GRAPH}/${id}?fields=id,name,access_token&access_token=${encodeURIComponent(userToken)}`,
        );
        const json = await res.json().catch(() => ({}));
        if (json?.id && json?.access_token) {
          page = json;
          break;
        }
        console.error("resolveFacebookPage: granular scope id did not resolve", { id, error: json?.error ?? null });
      }
      if (!page && !ids.length) {
        console.error("resolveFacebookPage: token names no Pages", { debugError: dbgJson?.error ?? null });
      }
    }

    // A Page owned by a business portfolio is often absent from /me/accounts,
    // which lists Pages the person holds directly. Ask the businesses this
    // person belongs to for their Pages, then fetch that Page's own token.
    if (!page) {
      const bizRes = await fetch(`${META_GRAPH}/me/businesses?access_token=${encodeURIComponent(userToken)}`);
      const bizJson = await bizRes.json().catch(() => ({}));
      for (const biz of bizJson?.data ?? []) {
        for (const edge of ["owned_pages", "client_pages"]) {
          const res = await fetch(
            `${META_GRAPH}/${biz.id}/${edge}?fields=id,name,access_token&access_token=${encodeURIComponent(userToken)}`,
          );
          const json = await res.json().catch(() => ({}));
          const found = json?.data?.[0];
          if (found) {
            page = found.access_token
              ? found
              : await fetch(`${META_GRAPH}/${found.id}?fields=id,name,access_token&access_token=${encodeURIComponent(userToken)}`)
                  .then((r) => r.json())
                  .catch(() => found);
            break;
          }
        }
        if (page) break;
      }
      if (!page) {
        // Which permissions the person actually granted: the difference
        // between "no Page" and "the Page list was not shared".
        const permRes = await fetch(`${META_GRAPH}/me/permissions?access_token=${encodeURIComponent(userToken)}`);
        const permJson = await permRes.json().catch(() => ({}));
        console.error("resolveFacebookPage: no page anywhere", {
          accountsStatus: pagesRes.status,
          accountsError: pagesJson?.error ?? null,
          businesses: (bizJson?.data ?? []).map((b: { id: string; name?: string }) => b.id),
          businessesError: bizJson?.error ?? null,
          granted: (permJson?.data ?? []).filter((p: { status: string }) => p.status === "granted").map((p: { permission: string }) => p.permission),
          declined: (permJson?.data ?? []).filter((p: { status: string }) => p.status !== "granted").map((p: { permission: string }) => p.permission),
        });
      }
    }
    if (!page) {
      // Say what Meta said. "No Page found" was shown for every failure here,
      // including a refused permission and an expired token, which is a
      // different problem with a different fix.
      const detail = pagesJson?.error?.message ?? (pagesRes.ok ? null : `HTTP ${pagesRes.status}`);
      console.error("resolveFacebookPage: no page", {
        status: pagesRes.status,
        error: pagesJson?.error ?? null,
        count: Array.isArray(pagesJson?.data) ? pagesJson.data.length : null,
        exchangeOk: exchangeRes.ok,
        exchangeError: exchangeRes.ok ? null : exchangeJson?.error ?? null,
      });
      return {
        error: detail
          ? `Facebook refused the Page list: ${String(detail).slice(0, 180)}`
          : "No Facebook Page found — the account you authorized manages no Pages, or none was selected on the Meta screen.",
      };
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
    // Must resolve to the same app social-oauth-start sent the user to, so the
    // precedence rule in resolveCredentials has to be identical on both sides.
    const creds = await resolveCredentials(admin, network);
    if (!creds) {
      return redirect(siteUrl, { network, error: "Developer app credentials not configured for this network" });
    }
    const clientId = creds.clientId;
    const clientSecret = creds.clientSecret;

    // The exchange must echo the redirect_uri the authorize request used. There
    // are only two it can be -- this project's own callback, or the control
    // plane relay that Sevra's shared apps redirect to -- and the recorded one
    // is authoritative when present. Older rows predate the column, so both are
    // tried rather than failing on a value we cannot confirm.
    const controlPlane = Deno.env.get("CONTROL_PLANE_URL")?.replace(/\/+$/, "");
    const relayUri = controlPlane ? `${controlPlane}/functions/v1/oauth-relay` : null;
    const candidates = [
      stateRow.redirect_uri,
      creds.source === "platform" ? relayUri : null,
      callbackRedirectUri(supabaseUrl),
      relayUri,
    ].filter((v, i, a): v is string => !!v && a.indexOf(v) === i);

    let tokenJson: Record<string, any> = {};
    let ok = false;
    let lastDetail = "";

    for (const redirectUri of candidates) {
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
      tokenJson = await tokenRes.json().catch(() => ({}));
      if (tokenRes.ok && tokenJson.access_token) {
        ok = true;
        break;
      }
      // The provider's own words. "Token exchange failed" told nobody anything
      // and cost an afternoon of guessing.
      lastDetail = String(
        tokenJson?.error_description ?? tokenJson?.error ?? tokenJson?.detail ?? `HTTP ${tokenRes.status}`,
      );
      console.error(
        `social-oauth-callback: ${network} exchange rejected with redirect_uri=${redirectUri}:`,
        JSON.stringify(tokenJson).slice(0, 400),
      );
    }

    if (!ok) {
      return redirect(siteUrl, { network, error: `Token exchange failed — ${lastDetail}`.slice(0, 190) });
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
