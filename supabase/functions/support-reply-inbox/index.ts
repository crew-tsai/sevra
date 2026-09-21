// Sevra's answer arriving in the client's workspace.
//
// The mirror of support-ticket: that function carries a question out to the
// control plane, this one carries the answer back in, so the Help page shows a
// conversation rather than a list of things the client shouted into a void.
//
// Authenticated with the shared deployment secret, exactly like the heartbeat:
// the caller is the control plane, not a person, and no session exists for it
// to present. It is deliberately the only way in — nothing a browser holds can
// write a reply, so nobody in the workspace can put words in Sevra's mouth.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-heartbeat-secret",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// Compared without an early exit, so the time it takes says nothing about how
// much of the secret was right.
function constantTimeEquals(a: string, b: string): boolean {
  const x = new TextEncoder().encode(a);
  const y = new TextEncoder().encode(b);
  if (x.length !== y.length) return false;
  let diff = 0;
  for (let i = 0; i < x.length; i++) diff |= x[i] ^ y[i];
  return diff === 0;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const secret = Deno.env.get("HEARTBEAT_SECRET");
    if (!secret) return json({ success: false, error: "This workspace is not linked to Sevra support" }, 503);
    if (!constantTimeEquals(req.headers.get("x-heartbeat-secret") ?? "", secret)) {
      return json({ success: false, error: "Unauthorized" }, 401);
    }

    const body = await req.json().catch(() => ({}));
    const ticketId = String(body.ticket_id ?? "").trim();
    const replyId = String(body.reply_id ?? "").trim();
    const text = String(body.body ?? "").trim().slice(0, 10_000);
    if (!ticketId || !replyId || !text) {
      return json({ success: false, error: "ticket_id, reply_id and body are required" }, 400);
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // The ticket has to be one of ours. The control plane holds every client's
    // tickets, and a wrong id here would show one company's answer to another.
    const { data: ticket } = await admin
      .from("support_tickets")
      .select("id")
      .eq("id", ticketId)
      .maybeSingle();
    if (!ticket) return json({ success: false, error: "No such ticket in this workspace" }, 404);

    const { error } = await admin
      .from("support_replies")
      .upsert(
        {
          ticket_id: ticket.id,
          console_reply_id: replyId,
          body: text,
          from_name: String(body.from_name ?? "").trim().slice(0, 80) || "Sevra support",
          sent_at: typeof body.sent_at === "string" ? body.sent_at : new Date().toISOString(),
        },
        { onConflict: "console_reply_id", ignoreDuplicates: false },
      );
    if (error) throw error;

    const now = new Date().toISOString();
    // answered, not finished: the client can write again, and doing so puts
    // the thread back to waiting.
    await admin
      .from("support_tickets")
      .update({ state: "answered", last_activity_at: now })
      .eq("id", ticket.id);
    await admin
      .from("support_tickets")
      .update({ answered_at: now })
      .eq("id", ticket.id)
      .is("answered_at", null);

    return json({ success: true });
  } catch (e) {
    console.error("support-reply-inbox error", e);
    return json({ success: false, error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
