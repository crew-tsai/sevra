// Starts an OAuth connection for a company social account (admin-only).
// Returns the provider's authorize URL; the frontend does a full-page
// redirect to it. The provider then redirects to social-oauth-callback.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import {
  NETWORK_LABELS,
  PROVIDERS,
  callbackRedirectUri,
  codeChallengeFromVerifier,
  generateCodeVerifier,
  isNetwork,
} from "../_shared/social-providers.ts";
import { noCredentialsMessage, resolveCredentials } from "../_shared/social-credentials.ts";

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
    // This client's own developer app if they registered one, otherwise
    // Sevra's shared app.
    const creds = await resolveCredentials(admin, network);
    if (!creds) {
      return new Response(
        JSON.stringify({ success: false, error: noCredentialsMessage(NETWORK_LABELS[network]) }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    const clientId = creds.clientId;

    // The state carries this project's ref as a prefix so the central relay
    // can route the provider's redirect back here without holding any state
    // of its own. The random half is still what makes it unguessable.
    const projectRef = new URL(supabaseUrl).hostname.split(".")[0];
    const state = `${projectRef}.${crypto.randomUUID()}`;

    // Sevra's shared apps register ONE redirect URI — the control plane relay —
    // rather than every client project's callback. A client's own app has this
    // project's URL registered directly, so it keeps the direct path.
    const controlPlane = Deno.env.get("CONTROL_PLANE_URL")?.replace(/\/+$/, "");
    const redirectUri =
      creds.source === "platform" && controlPlane
        ? `${controlPlane}/functions/v1/oauth-relay`
        : callbackRedirectUri(supabaseUrl);
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
      // The exchange must echo exactly this, so it is recorded rather than
      // recomputed at callback time.
      redirect_uri: redirectUri,
    });
    if (insErr) throw insErr;

    const params = new URLSearchParams({
      [provider.clientIdParam]: clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: provider.scope,
      state,
    });
    // Sevra's shared Meta app uses Facebook Login for Business, which takes a
    // configuration (the permissions, set up once in Meta's dashboard) rather
    // than a scope list. A client's own Meta app keeps the scope list.
    const metaConfigId = Deno.env.get("PLATFORM_META_CONFIG_ID")?.trim();
    if (network === "facebook" && creds.source === "platform" && metaConfigId) {
      params.delete("scope");
      params.set("config_id", metaConfigId);
    }
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
