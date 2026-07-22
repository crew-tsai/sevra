// Starts an OAuth connection for a company social account (admin-only).
// Returns the provider's authorize URL; the frontend does a full-page
// redirect to it. The provider then redirects to social-oauth-callback.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import {
  PROVIDERS,
  callbackRedirectUri,
  codeChallengeFromVerifier,
  generateCodeVerifier,
  isNetwork,
} from "../_shared/social-providers.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey);

    const authHeader = req.headers.get("Authorization") ?? "";
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

    const { data: isAdmin } = await admin.rpc("is_admin", { _user_id: userId });
    if (!isAdmin) {
      return new Response(JSON.stringify({ success: false, error: "Admin access required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { network } = await req.json().catch(() => ({}));
    if (!isNetwork(network)) {
      return new Response(JSON.stringify({ success: false, error: "Invalid or missing network" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const provider = PROVIDERS[network];
    const { data: creds } = await admin
      .from("social_app_credentials")
      .select("client_id")
      .eq("network", network)
      .maybeSingle();
    if (!creds) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `No developer app credentials saved for this network yet. Add your Client ID/Secret above before connecting.`,
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    const clientId = creds.client_id;

    const state = crypto.randomUUID();
    let codeVerifier: string | null = null;
    let codeChallenge: string | null = null;
    if (provider.pkce) {
      codeVerifier = generateCodeVerifier();
      codeChallenge = await codeChallengeFromVerifier(codeVerifier);
    }

    const { error: insErr } = await admin.from("oauth_states").insert({
      state,
      network,
      code_verifier: codeVerifier,
      created_by: userId,
    });
    if (insErr) throw insErr;

    const redirectUri = callbackRedirectUri(supabaseUrl);
    const params = new URLSearchParams({
      [provider.clientIdParam]: clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: provider.scope,
      state,
    });
    if (provider.pkce && codeChallenge) {
      params.set("code_challenge", codeChallenge);
      params.set("code_challenge_method", "S256");
    }

    const url = `${provider.authorizeUrl}?${params.toString()}`;

    return new Response(JSON.stringify({ success: true, url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("social-oauth-start error:", e);
    return new Response(JSON.stringify({ success: false, error: e?.message ?? String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
