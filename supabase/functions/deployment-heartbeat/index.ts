// Reports this deployment's metadata to the Sevra control plane.
//
// Sevra deploys one database per client, so there is nowhere to see the
// portfolio. This function sends a periodic heartbeat (pg_cron, every 15 min)
// with this deployment's pulse.
//
// PRIVACY LINE, NON-NEGOTIABLE: only counts and the company name are sent.
// Never incident titles, descriptions, communication content or mentions.
// That is what makes portfolio visibility possible without breaking the
// isolation between clients.
//
// If CONTROL_PLANE_URL or HEARTBEAT_SECRET are unset the function no-ops and
// returns skipped: a deployment that doesn't report is a valid setup.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const controlPlaneUrl = Deno.env.get("CONTROL_PLANE_URL");
    const secret = Deno.env.get("HEARTBEAT_SECRET");

    if (!controlPlaneUrl || !secret) {
      return new Response(
        JSON.stringify({ success: true, skipped: "control plane not configured" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const admin = createClient(supabaseUrl, serviceKey);

    // project_ref comes from the URL itself: https://<ref>.supabase.co
    const projectRef = new URL(supabaseUrl).hostname.split(".")[0];

    const [settings, incidentsTotal, incidentsOpen, assets, mentions, users, social] =
      await Promise.all([
        admin.from("company_settings").select("company_name, industry").maybeSingle(),
        admin.from("incidents").select("id", { count: "exact", head: true }),
        admin.from("incidents").select("id", { count: "exact", head: true }).eq("status", "active"),
        admin.from("incident_assets").select("id", { count: "exact", head: true }),
        admin.from("social_mentions").select("id", { count: "exact", head: true }),
        admin.from("user_roles").select("id", { count: "exact", head: true }),
        // Names, not just a count: "0 networks" and "2 networks" read the same
        // when you are trying to work out why a client's monitoring is quiet.
        admin.from("social_connections").select("network, account_label").eq("status", "connected"),
      ]);

    // The handle, not just the network. A network name says monitoring is on;
    // the handle says *whose* account it is watching -- which is how you catch
    // a client wired to the wrong account. Public handles only, never content.
    const connectedNetworks = ((social.data ?? []) as Array<{ network: string; account_label: string | null }>)
      .map((r) => (r.account_label ? `${r.network}:${r.account_label}` : r.network))
      .sort();

    const payload = {
      project_ref: projectRef,
      company_name: settings.data?.company_name ?? null,
      industry: settings.data?.industry ?? null,
      app_url: Deno.env.get("SITE_URL") ?? null,
      metrics: {
        incidents_total: incidentsTotal.count ?? 0,
        incidents_open: incidentsOpen.count ?? 0,
        assets_total: assets.count ?? 0,
        mentions_total: mentions.count ?? 0,
        users_total: users.count ?? 0,
        social_connected: connectedNetworks.length,
        // Which networks, not just how many. A count of 0 and a count of 2 read
        // the same when you are trying to work out why a client's monitoring is
        // quiet; the names say whether anything was ever connected.
        social_networks: connectedNetworks,
      },
    };

    const res = await fetch(`${controlPlaneUrl}/functions/v1/heartbeat-ingest`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-heartbeat-secret": secret,
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`control plane ${res.status}: ${txt.slice(0, 200)}`);
    }

    return new Response(JSON.stringify({ success: true, reported: payload.metrics }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("deployment-heartbeat error:", e);
    return new Response(JSON.stringify({ success: false, error: e?.message ?? String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
