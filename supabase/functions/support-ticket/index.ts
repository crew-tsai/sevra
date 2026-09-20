// A client asking Sevra for help.
//
// The ticket is recorded in this workspace so the team can see what they sent,
// and forwarded to the control plane, which is where Sevra's staff read every
// client's requests in one place. Forwarding is what can fail, so it is the
// last thing that happens: a ticket that did not reach us still exists here,
// marked undelivered, rather than vanishing into a failed fetch.
//
// It travels with the context that otherwise costs an email round trip — which
// workspace, which company, who asked and what page they were on — because the
// first reply to "it isn't working" should not be "which client are you?".
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { identifyCaller, unauthorized } from "../_shared/caller.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const CATEGORIES = ["question", "problem", "request"];

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // A signed-in person only. Support is a channel into Sevra's staff, and an
    // anonymous one is a spam queue.
    const caller = await identifyCaller(req);
    if (caller.kind !== "user") return unauthorized();

    const body = await req.json().catch(() => ({}));
    const subject = String(body.subject ?? "").trim().slice(0, 200);
    const message = String(body.message ?? "").trim().slice(0, 5000);
    const category = CATEGORIES.includes(body.category) ? body.category : "question";
    const page = typeof body.page === "string" ? body.page.slice(0, 200) : null;

    if (!subject || !message) {
      return json({ success: false, error: "A subject and a message are required" }, 400);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey);

    const [{ data: settings }, { data: member }, { data: userRow }] = await Promise.all([
      admin.from("company_settings").select("company_name").maybeSingle(),
      admin.from("team_members").select("full_name, role").eq("user_id", caller.userId).maybeSingle(),
      admin.auth.admin.getUserById(caller.userId),
    ]);

    const email = userRow?.user?.email ?? null;

    const { data: ticket, error: insErr } = await admin
      .from("support_tickets")
      .insert({
        subject,
        message,
        category,
        page,
        created_by: caller.userId,
        created_email: email,
      })
      .select("id, created_at")
      .single();
    if (insErr) throw insErr;

    // Forward to Sevra. The shared secret is the same one the heartbeat uses:
    // this is a deployment identifying itself, not a person logging in.
    const controlPlane = Deno.env.get("CONTROL_PLANE_URL")?.replace(/\/+$/, "");
    const secret = Deno.env.get("HEARTBEAT_SECRET");
    let delivered = false;
    let deliveryError: string | null = null;

    if (!controlPlane || !secret) {
      deliveryError = "This workspace is not linked to Sevra support.";
    } else {
      try {
        const res = await fetch(`${controlPlane}/functions/v1/support-ingest`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-heartbeat-secret": secret },
          body: JSON.stringify({
            project_ref: new URL(supabaseUrl).hostname.split(".")[0],
            company_name: settings?.company_name ?? null,
            workspace_url: Deno.env.get("SITE_URL") ?? null,
            ticket_id: ticket.id,
            subject,
            message,
            category,
            page,
            user_email: email,
            user_name: member?.full_name ?? null,
            user_role: member?.role ?? null,
          }),
          signal: AbortSignal.timeout(15_000),
        });
        delivered = res.ok;
        if (!res.ok) deliveryError = `Sevra support returned ${res.status}`;
      } catch (e) {
        deliveryError = e instanceof Error ? e.message : "Could not reach Sevra support";
      }
    }

    if (delivered) {
      await admin.from("support_tickets").update({ delivered: true }).eq("id", ticket.id);
    } else {
      console.error("support-ticket: not delivered —", deliveryError);
    }

    // The ticket exists either way; the flag is what the page reports.
    return json({ success: true, id: ticket.id, delivered });
  } catch (e) {
    console.error("support-ticket error", e);
    return json({ success: false, error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
