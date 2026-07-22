// Publishes approved content directly to a connected X or Facebook account.
// Any authenticated user can call this (publishing an already-approved asset
// is a day-to-day Approvals-page action, same as the existing copy+open-tab
// flow it replaces) — only the account *connection* itself is admin-gated.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type PublishableNetwork = "x" | "facebook";

function isPublishableNetwork(value: unknown): value is PublishableNetwork {
  return value === "x" || value === "facebook";
}

async function refreshXToken(
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

    const { network, content } = await req.json().catch(() => ({}));
    if (!isPublishableNetwork(network)) {
      return new Response(
        JSON.stringify({ success: false, error: "Direct publishing is only available for X and Facebook right now." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    if (typeof content !== "string" || !content.trim()) {
      return new Response(JSON.stringify({ success: false, error: "content is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: connection } = await admin
      .from("social_connections")
      .select("id, account_id, account_label, status, token_expires_at")
      .eq("network", network)
      .maybeSingle();
    if (!connection || connection.status !== "connected") {
      return new Response(
        JSON.stringify({
          success: false,
          error: `Connect your ${network === "x" ? "X" : "Facebook"} account in Admin → Social connections first.`,
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { data: tokenRow } = await admin
      .from("social_connection_tokens")
      .select("access_token, refresh_token")
      .eq("connection_id", connection.id)
      .maybeSingle();
    if (!tokenRow?.access_token) {
      return new Response(
        JSON.stringify({ success: false, error: "No stored access token for this connection — try reconnecting." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (network === "x") {
      let accessToken = tokenRow.access_token;
      const expiresAt = connection.token_expires_at ? new Date(connection.token_expires_at).getTime() : null;
      const nearExpiry = expiresAt !== null && expiresAt - Date.now() < 60_000;

      if (nearExpiry && tokenRow.refresh_token) {
        const { data: creds } = await admin
          .from("social_app_credentials")
          .select("client_id, client_secret")
          .eq("network", "x")
          .maybeSingle();
        if (!creds) {
          return new Response(
            JSON.stringify({ success: false, error: "X developer app credentials not configured." }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }
        try {
          accessToken = await refreshXToken(admin, connection.id, creds.client_id, creds.client_secret, tokenRow.refresh_token);
        } catch (e: any) {
          return new Response(JSON.stringify({ success: false, error: e?.message ?? String(e) }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }

      const tweetRes = await fetch("https://api.twitter.com/2/tweets", {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ text: content }),
      });
      const tweetJson = await tweetRes.json().catch(() => ({}));
      if (!tweetRes.ok || !tweetJson?.data?.id) {
        console.error("social-publish: X post failed", tweetJson);
        return new Response(
          JSON.stringify({ success: false, error: tweetJson?.detail ?? "Failed to post to X" }),
          { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const handle = (connection.account_label ?? "").replace(/^@/, "");
      const url = handle
        ? `https://twitter.com/${handle}/status/${tweetJson.data.id}`
        : `https://twitter.com/i/web/status/${tweetJson.data.id}`;

      return new Response(JSON.stringify({ success: true, url, post_id: tweetJson.data.id }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // network === "facebook"
    const pageId = connection.account_id;
    if (!pageId) {
      return new Response(
        JSON.stringify({ success: false, error: "No Facebook Page linked to this connection — try reconnecting." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const fbRes = await fetch(`https://graph.facebook.com/v19.0/${pageId}/feed`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ message: content, access_token: tokenRow.access_token }),
    });
    const fbJson = await fbRes.json().catch(() => ({}));
    if (!fbRes.ok || !fbJson?.id) {
      console.error("social-publish: Facebook post failed", fbJson);
      return new Response(
        JSON.stringify({ success: false, error: fbJson?.error?.message ?? "Failed to post to Facebook" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({ success: true, url: `https://www.facebook.com/${fbJson.id}`, post_id: fbJson.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e: any) {
    console.error("social-publish error:", e);
    return new Response(JSON.stringify({ success: false, error: e?.message ?? String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
