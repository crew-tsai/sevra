// Read & toggle the social-monitor cron job state.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { identifyCaller, unauthorized } from "../_shared/caller.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const JOB_NAME = "sevra-social-monitor-15min";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(url, key);

    // This rolled its own caller check, and did it with getUser() and no
    // argument -- which on supabase-js 2.45 only resolves a user from a stored
    // session, not from the Authorization header the browser sent. So a
    // signed-in person could be told "Not authenticated", the page swallowed
    // the 401, and the card then reported monitoring as paused while its cron
    // ran every fifteen minutes. identifyCaller passes the token explicitly,
    // which is the whole reason it exists.
    const caller = await identifyCaller(req);
    if (caller.kind === "anonymous") return unauthorized();
    const userId = caller.kind === "user" ? caller.userId : null;

    let action: "status" | "enable" | "disable" = "status";
    if (req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      if (body?.action === "enable" || body?.action === "disable") action = body.action;
    }

    if (action !== "status") {
      // A service-role caller is the cron, not a person, and needs no role
      // lookup. Only a user has to prove they may change the schedule.
      const { data: isAdmin } = userId
        ? await admin.rpc("is_admin", { _user_id: userId })
        : { data: caller.kind === "service" };
      if (!isAdmin) {
        return new Response(JSON.stringify({ success: false, error: "Admin access required" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { error: updErr } = await admin.rpc("set_social_monitor_active", {
        p_active: action === "enable",
      });
      if (updErr) throw updErr;
    }

    const { data, error } = await admin.rpc("get_social_monitor_status");
    if (error) throw error;

    const row = Array.isArray(data) ? data[0] : data;
    return new Response(
      JSON.stringify({
        success: true,
        active: !!row?.active,
        schedule: row?.schedule ?? null,
        last_run_at: row?.last_run_at ?? null,
        last_status: row?.last_status ?? null,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e: any) {
    return new Response(
      JSON.stringify({ success: false, error: e?.message ?? String(e) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
