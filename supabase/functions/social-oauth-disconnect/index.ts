// Disconnects a company social account (admin-only). Best-effort revokes the
// token with the provider, then clears local state back to 'disconnected'.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { isNetwork, PROVIDERS } from "../_shared/social-providers.ts";

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

    const { data: connection } = await admin
      .from("social_connections")
      .select("id")
      .eq("network", network)
      .maybeSingle();

    if (connection) {
      const { data: tokenRow } = await admin
        .from("social_connection_tokens")
        .select("access_token")
        .eq("connection_id", connection.id)
        .maybeSingle();

      const provider = PROVIDERS[network];
      const clientId = Deno.env.get(provider.clientIdEnv);
      const clientSecret = Deno.env.get(provider.clientSecretEnv);
      if (tokenRow?.access_token && provider.revokeUrl && clientId && clientSecret) {
        try {
          await fetch(provider.revokeUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/x-www-form-urlencoded",
              Authorization: `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
            },
            body: new URLSearchParams({ token: tokenRow.access_token, [provider.clientIdParam]: clientId }),
          });
        } catch (e) {
          // Non-fatal: proceed to clear local state regardless.
          console.error(`social-oauth-disconnect: revoke call failed for ${network}`, e);
        }
      }

      await admin.from("social_connection_tokens").delete().eq("connection_id", connection.id);
    }

    const { error: updErr } = await admin
      .from("social_connections")
      .update({
        status: "disconnected",
        account_id: null,
        account_label: null,
        avatar_url: null,
        scopes: null,
        token_expires_at: null,
        last_error: null,
        connected_by: null,
        connected_at: null,
      })
      .eq("network", network);
    if (updErr) throw updErr;

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("social-oauth-disconnect error:", e);
    return new Response(JSON.stringify({ success: false, error: e?.message ?? String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
