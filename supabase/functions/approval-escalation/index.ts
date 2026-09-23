// Tells someone when an approved-by-nobody package has been sitting.
//
// Sevra drafts the communications by itself precisely because a crisis does
// not wait for office hours. Everything after that waited for a person to open
// the Approvals page — and at 03:10, during the L4 the automatic drafting
// exists for, nobody is looking at the Approvals page.
//
// Off unless a workspace sets company_settings.approval_sla_minutes, and only
// at or above approval_sla_min_level. Escalating an L1 at 03:10 teaches people
// to ignore the alert, which costs more than the alert was worth.
//
// Driven by pg_cron every five minutes.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// How many assets one sweep will chase. A package is twelve communications; if
// every one of them is overdue the point is made long before the twelfth mail.
const MAX_PER_RUN = 12;
const MAX_RECIPIENTS = 20;

function parseJwtClaims(token: string): Record<string, unknown> | null {
  const parts = token.split(".");
  if (parts.length < 2) return null;
  try {
    const payload = parts[1]
      .replaceAll("-", "+")
      .replaceAll("_", "/")
      .padEnd(Math.ceil(parts[1].length / 4) * 4, "=");
    return JSON.parse(atob(payload)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  // Cron only. The gateway accepts the publishable key as a valid JWT, so the
  // caller has to be classified here rather than trusted for having got in.
  const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "").trim();
  const claims = token ? parseJwtClaims(token) : null;
  const isService = token === serviceKey || claims?.role === "service_role";
  if (!isService) {
    return new Response(JSON.stringify({ success: false, error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const admin = createClient(supabaseUrl, serviceKey);

    const { data: settings } = await admin
      .from("company_settings")
      .select("company_name, approval_sla_minutes, approval_sla_min_level")
      .maybeSingle();

    const minutes = settings?.approval_sla_minutes ?? null;
    if (!minutes) {
      return new Response(JSON.stringify({ success: true, disabled: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const minLevel = settings?.approval_sla_min_level ?? 3;
    const cutoff = new Date(Date.now() - minutes * 60_000).toISOString();

    // Anything not finally approved counts, whichever of the two stages it is
    // stuck at. A draft nobody sent forward and a draft no administrator
    // signed are the same outcome: it did not go out.
    const { data: overdue, error } = await admin
      .from("incident_assets")
      .select("id, incident_id, asset_type, title, approval_status, created_at, incidents!inner(id, title, crisis_level, risk, description, status)")
      .neq("approval_status", "approved")
      .is("escalated_at", null)
      .lt("created_at", cutoff)
      .order("created_at")
      .limit(MAX_PER_RUN);
    if (error) throw error;

    // deno-lint-ignore no-explicit-any
    const rows = ((overdue ?? []) as any[]).filter((a) => {
      const inc = a.incidents;
      // A resolved incident's leftovers are not an emergency.
      if (!inc || inc.status === "resolved") return false;
      return (inc.crisis_level ?? 0) >= minLevel;
    });

    if (!rows.length) {
      return new Response(JSON.stringify({ success: true, escalated: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Who owns this kind of communication at this level, as the workspace
    // already wrote down in Admin › Responsibilities. Falling back to every
    // administrator, because an overdue L4 with no matrix row still has to
    // reach somebody.
    const [{ data: matrix }, { data: lists }, { data: admins }] = await Promise.all([
      admin.from("responsibility_matrix").select("asset_type, level, list_id"),
      admin.from("email_lists").select("id, name, emails"),
      admin.from("team_members").select("email, user_id"),
    ]);

    // deno-lint-ignore no-explicit-any
    const listById = new Map(((lists ?? []) as any[]).map((l) => [l.id, l]));
    const { data: adminRoles } = await admin.from("user_roles").select("user_id").eq("role", "admin");
    const adminIds = new Set(((adminRoles ?? []) as Array<{ user_id: string }>).map((r) => r.user_id));
    // deno-lint-ignore no-explicit-any
    const adminEmails = ((admins ?? []) as any[])
      .filter((m) => m.user_id && adminIds.has(m.user_id) && typeof m.email === "string" && m.email.includes("@"))
      .map((m) => m.email as string);

    // deno-lint-ignore no-explicit-any
    function recipientsFor(asset: any): string[] {
      const inc = asset.incidents;
      // deno-lint-ignore no-explicit-any
      const row = ((matrix ?? []) as any[]).find(
        (m) => m.asset_type === asset.asset_type && Number(m.level) === Number(inc.crisis_level ?? 0),
      );
      const list = row ? listById.get(row.list_id) : null;
      const fromList: string[] = (list?.emails ?? []).filter(
        (e: unknown): e is string => typeof e === "string" && e.includes("@"),
      );
      const chosen: string[] = fromList.length ? fromList : adminEmails;
      return [...new Set<string>(chosen)].slice(0, MAX_RECIPIENTS);
    }

    let escalated = 0;
    let mailed = 0;

    for (const asset of rows) {
      const inc = asset.incidents;
      const to = recipientsFor(asset);
      const waited = Math.round((Date.now() - new Date(asset.created_at).getTime()) / 60_000);

      for (const recipient of to) {
        const res = await fetch(`${supabaseUrl}/functions/v1/send-transactional-email`, {
          method: "POST",
          headers: { Authorization: `Bearer ${serviceKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            templateName: "crisis-alert",
            recipientEmail: recipient,
            // One per asset per address, ever. The sweep runs every five
            // minutes and the retry path runs on top of that.
            idempotencyKey: `sla-${asset.id}-${recipient}`,
            templateData: {
              incidentTitle: inc.title,
              incidentRef: `INC-${String(inc.id).slice(0, 8).toUpperCase()}`,
              crisisLevel: inc.crisis_level ?? 0,
              risk: inc.risk,
              summary: inc.description ?? "",
              waitingMinutes: waited,
              waitingFor: asset.title,
              companyName: settings?.company_name ?? undefined,
            },
          }),
        }).catch((e) => {
          console.error("approval-escalation: send failed —", e);
          return null;
        });
        if (res?.ok) mailed++;
      }

      // Marked regardless of whether the mail got out. A workspace with no
      // addresses configured would otherwise be swept every five minutes
      // forever, and the thing to fix there is the addresses.
      const { error: markErr } = await admin
        .from("incident_assets")
        .update({ escalated_at: new Date().toISOString() })
        .eq("id", asset.id);
      if (markErr) console.error("approval-escalation: could not mark escalated", markErr.message);
      escalated++;
    }

    return new Response(JSON.stringify({ success: true, escalated, mailed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
    // deno-lint-ignore no-explicit-any
  } catch (e: any) {
    console.error("approval-escalation error:", e);
    return new Response(JSON.stringify({ success: false, error: e?.message ?? String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
