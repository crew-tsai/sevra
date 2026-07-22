// Lets an admin self-serve their own X/Meta/TikTok developer app credentials
// (Client ID/Secret) instead of requiring `supabase secrets set` access.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { isNetwork, NETWORKS } from "../_shared/social-providers.ts";

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

    const body = await req.json().catch(() => ({}));
    const action = body?.action;

    if (action === "status") {
      const { data, error } = await admin
        .from("social_app_credentials")
        .select("network, client_id, updated_at");
      if (error) throw error;

      const byNetwork: Record<string, { configured: boolean; client_id: string | null; updated_at: string | null }> = {};
      for (const network of NETWORKS) byNetwork[network] = { configured: false, client_id: null, updated_at: null };
      for (const row of data ?? []) {
        byNetwork[row.network] = { configured: true, client_id: row.client_id, updated_at: row.updated_at };
      }

      return new Response(JSON.stringify({ success: true, credentials: byNetwork }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "save") {
      const { network, client_id, client_secret } = body;
      if (!isNetwork(network)) {
        return new Response(JSON.stringify({ success: false, error: "Invalid or missing network" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (typeof client_id !== "string" || !client_id.trim() || typeof client_secret !== "string" || !client_secret.trim()) {
        return new Response(JSON.stringify({ success: false, error: "Client ID and Client Secret are required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { error } = await admin.from("social_app_credentials").upsert({
        network,
        client_id: client_id.trim(),
        client_secret: client_secret.trim(),
        updated_at: new Date().toISOString(),
        updated_by: userId,
      });
      if (error) throw error;

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "clear") {
      const { network } = body;
      if (!isNetwork(network)) {
        return new Response(JSON.stringify({ success: false, error: "Invalid or missing network" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { error } = await admin.from("social_app_credentials").delete().eq("network", network);
      if (error) throw error;

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: false, error: "Unknown action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("social-oauth-credentials error:", e);
    return new Response(JSON.stringify({ success: false, error: e?.message ?? String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
