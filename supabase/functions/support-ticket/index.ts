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

/**
 * A further message on an existing thread.
 *
 * Recorded here first and forwarded second, exactly like the ticket that
 * started it, so a follow-up that could not be delivered still exists and can
 * be sent again rather than being lost in a failed fetch.
 */
async function addFollowUp(
  admin: any,
  args: {
    ticketId: string;
    text: string;
    userId: string;
    attachments: Array<Record<string, unknown>>;
    supabaseUrl: string;
  },
): Promise<Response> {
  if (!args.text && !args.attachments.length) {
    return json({ success: false, error: "A message is required" }, 400);
  }

  const { data: ticket } = await admin
    .from("support_tickets")
    .select("id, subject, category, page, created_email")
    .eq("id", args.ticketId)
    .maybeSingle();
  if (!ticket) return json({ success: false, error: "No such ticket" }, 404);

  const [{ data: settings }, { data: member }, { data: userRow }] = await Promise.all([
    admin.from("company_settings").select("company_name").maybeSingle(),
    admin.from("team_members").select("full_name, role").eq("user_id", args.userId).maybeSingle(),
    admin.auth.admin.getUserById(args.userId),
  ]);
  const email = userRow?.user?.email ?? null;

  const { data: message, error: msgErr } = await admin
    .from("support_messages")
    .insert({
      ticket_id: ticket.id,
      body: args.text || "(see attachment)",
      created_by: args.userId,
      created_email: email,
    })
    .select("id")
    .single();
  if (msgErr) throw msgErr;

  // The rows are selected back because the control plane stores our id for
  // each file, not a copy of it — that id is what its staff hand back to
  // support-attachment-url when they want to open one.
  let attachmentRows: Array<Record<string, unknown>> = [];
  if (args.attachments.length) {
    const { data: saved } = await admin
      .from("support_attachments")
      .insert(
        args.attachments.map((a) => ({
          ticket_id: ticket.id,
          message_id: message.id,
          path: String(a.path ?? ""),
          filename: String(a.filename ?? "file"),
          mime_type: a.mime_type ? String(a.mime_type) : null,
          size_bytes: typeof a.size_bytes === "number" ? a.size_bytes : null,
          uploaded_by: args.userId,
        })).filter((a) => a.path),
      )
      .select("id, filename, mime_type, size_bytes");
    attachmentRows = saved ?? [];
  }

  // Writing puts the thread back to waiting: an answer that prompted another
  // question was not the end of it.
  await admin
    .from("support_tickets")
    .update({ state: "waiting", last_activity_at: new Date().toISOString() })
    .eq("id", ticket.id);

  const controlPlane = Deno.env.get("CONTROL_PLANE_URL")?.replace(/\/+$/, "");
  const secret = Deno.env.get("HEARTBEAT_SECRET");
  let delivered = false;
  if (controlPlane && secret) {
    try {
      const res = await fetch(`${controlPlane}/functions/v1/support-ingest`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-heartbeat-secret": secret },
        body: JSON.stringify({
          kind: "message",
          project_ref: new URL(args.supabaseUrl).hostname.split(".")[0],
          company_name: settings?.company_name ?? null,
          workspace_url: Deno.env.get("SITE_URL") ?? null,
          ticket_id: ticket.id,
          message_id: message.id,
          subject: ticket.subject,
          message: args.text,
          category: ticket.category,
          page: ticket.page,
          user_email: email,
          user_name: member?.full_name ?? null,
          user_role: member?.role ?? null,
          attachments: attachmentRows,
        }),
        signal: AbortSignal.timeout(15_000),
      });
      delivered = res.ok;
      if (!res.ok) console.error("support-ticket: follow-up returned", res.status);
    } catch (e) {
      console.error("support-ticket: follow-up not delivered —", e);
    }
  }

  if (delivered) {
    await admin.from("support_messages").update({ delivered: true }).eq("id", message.id);
  }

  return json({ success: true, id: message.id, delivered });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // A signed-in person only. Support is a channel into Sevra's staff, and an
    // anonymous one is a spam queue.
    const caller = await identifyCaller(req);
    if (caller.kind !== "user") return unauthorized();

    const body = await req.json().catch(() => ({}));
    const retryId = typeof body.retry_id === "string" ? body.retry_id : null;
    // A follow-up on a thread that already exists. The first answer is often
    // not the last word, and a client with nowhere to say "that isn't it" says
    // it by email instead, where the next person to open the ticket cannot
    // see it.
    const followUpTo = typeof body.ticket_id === "string" ? body.ticket_id : null;
    const attachments: Array<Record<string, unknown>> = Array.isArray(body.attachments)
      ? body.attachments.slice(0, 5)
      : [];

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey);

    // A retry sends the ticket that is already here rather than writing a new
    // one. "Undelivered" is a state this function can produce, so recovering
    // from it belongs in the product, not in an email to us.
    let existing: Record<string, any> | null = null;
    if (retryId) {
      const { data } = await admin
        .from("support_tickets")
        .select("id, subject, message, category, page, created_email, delivered")
        .eq("id", retryId)
        .maybeSingle();
      if (!data) return json({ success: false, error: "No such ticket" }, 404);
      if (data.delivered) return json({ success: true, id: data.id, delivered: true });
      existing = data;
    }

    if (followUpTo && !retryId) {
      return await addFollowUp(admin, {
        ticketId: followUpTo,
        text: String(body.message ?? "").trim().slice(0, 5000),
        userId: caller.userId,
        attachments,
        supabaseUrl,
      });
    }

    const subject = existing
      ? String(existing.subject)
      : String(body.subject ?? "").trim().slice(0, 200);
    const message = existing
      ? String(existing.message)
      : String(body.message ?? "").trim().slice(0, 5000);
    const category = existing
      ? String(existing.category)
      : CATEGORIES.includes(body.category) ? body.category : "question";
    const page = existing
      ? (existing.page as string | null)
      : typeof body.page === "string" ? body.page.slice(0, 200) : null;

    if (!subject || !message) {
      return json({ success: false, error: "A subject and a message are required" }, 400);
    }

    const [{ data: settings }, { data: member }, { data: userRow }] = await Promise.all([
      admin.from("company_settings").select("company_name").maybeSingle(),
      admin.from("team_members").select("full_name, role").eq("user_id", caller.userId).maybeSingle(),
      admin.auth.admin.getUserById(caller.userId),
    ]);

    const email = userRow?.user?.email ?? null;

    let ticket: { id: string };
    // What the control plane is told about the files: our ids and their
    // descriptions, never the files.
    let attachmentRows: Array<Record<string, unknown>> = [];
    if (existing) {
      ticket = { id: existing.id as string };
    } else {
      const { data: inserted, error: insErr } = await admin
        .from("support_tickets")
        .insert({
          subject,
          message,
          category,
          page,
          created_by: caller.userId,
          created_email: email,
        })
        .select("id")
        .single();
      if (insErr) throw insErr;
      ticket = inserted;

      if (attachments.length) {
        const { data: saved } = await admin
          .from("support_attachments")
          .insert(
            attachments.map((a) => ({
              ticket_id: ticket.id,
              path: String(a.path ?? ""),
              filename: String(a.filename ?? "file"),
              mime_type: a.mime_type ? String(a.mime_type) : null,
              size_bytes: typeof a.size_bytes === "number" ? a.size_bytes : null,
              uploaded_by: caller.userId,
            })).filter((a) => a.path),
          )
          .select("id, filename, mime_type, size_bytes");
        attachmentRows = saved ?? [];
      }
    }

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
            user_email: (existing?.created_email as string | null) ?? email,
            user_name: member?.full_name ?? null,
            user_role: member?.role ?? null,
            attachments: attachmentRows,
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
