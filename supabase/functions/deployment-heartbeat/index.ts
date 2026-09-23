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
// The one exception is who may sign in, and that only as keyed hashes: the
// public Sevra site needs to know which workspace to send a person to, and a
// hash lets it match an address someone types without the control plane ever
// holding a list of client users.
//
// If CONTROL_PLANE_URL or HEARTBEAT_SECRET are unset the function no-ops and
// returns skipped: a deployment that doesn't report is a valid setup.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { identifyCaller, unauthorized } from "../_shared/caller.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Everyone who may sign in here: existing accounts, invited team members who
 * have not signed up yet, and the administrator designated at provisioning --
 * who is exactly the person most likely to go looking for the workspace first.
 *
 * HMAC-SHA256(HEARTBEAT_SECRET, lower(trim(email))), matching the control
 * plane's _shared/workspace-link.ts byte for byte.
 */
async function memberHashes(admin: any, secret: string): Promise<string[]> {
  const emails = new Set<string>();
  const add = (e: unknown) => {
    if (typeof e === "string" && e.includes("@")) emails.add(e.trim().toLowerCase());
  };

  for (let page = 1; page <= 20; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    for (const u of data.users) add(u.email);
    if (data.users.length < 1000) break;
  }
  const [team, boot] = await Promise.all([
    admin.from("team_members").select("email"),
    admin.from("bootstrap_config").select("bootstrap_admin_email").maybeSingle(),
  ]);
  for (const r of team.data ?? []) add(r.email);
  add(boot.data?.bootstrap_admin_email);

  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
  );
  return Promise.all([...emails].map(async (e) => {
    const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(e));
    return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
  }));
}

/**
 * Secrets this deployment needs and does not have.
 *
 * Names only, never values. A missing secret does not crash anything — each of
 * these disables one capability quietly, which is the problem: Lessence spent
 * its whole life rejecting Resend's bounce webhooks with a 503 because
 * EMAIL_WEBHOOK_SECRET was never set on it, and nothing anywhere said so. The
 * addresses that bounce keep being mailed, on a sending domain the whole fleet
 * shares.
 *
 * Reported rather than fixed here, because most of these cannot be fixed from
 * inside the client: the webhook secret is issued per endpoint by the email
 * provider, and the platform credentials belong to the control plane.
 */
function missingSecrets(): string[] {
  const needed: Array<[string, string]> = [
    ["GEMINI_API_KEY", "AI analysis, drafting and Agent Stripes"],
    ["RESEND_API_KEY", "all outbound email"],
    ["EMAIL_WEBHOOK_SECRET", "bounce and complaint handling"],
    ["SITE_URL", "the links inside emails"],
    ["PLATFORM_X_BEARER_TOKEN", "monitoring X without a connected account"],
  ];
  return needed.filter(([name]) => !Deno.env.get(name)?.trim()).map(([name]) => name);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  // pg_cron only. verify_jwt is off for this function, and it had no check of
  // its own, so any request at all made the project count its data and call
  // out to the control plane. Harmless in what it reports, but a public
  // trigger for outbound work is not something to leave open.
  const caller = await identifyCaller(req);
  if (caller.kind !== "service") return unauthorized("Forbidden");

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

    const member_hashes = await memberHashes(admin, secret);

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
        // What this deployment cannot do, by name. See missingSecrets().
        secrets_missing: missingSecrets(),
      },
      member_hashes,
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

    return new Response(JSON.stringify({ success: true, reported: payload.metrics, members: member_hashes.length }), {
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
