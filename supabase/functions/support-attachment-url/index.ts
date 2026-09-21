// A short-lived link to one support attachment, for Sevra's staff.
//
// The file stays here, in the client's own project. The control plane holds
// only the fact that it exists — its name, type and size — and asks for a
// signed URL when a staff member actually opens it. That keeps the privacy
// line where the README puts it: a screenshot of an unpublished holding
// statement is exactly the kind of thing the registry must not accumulate.
//
// Authenticated with the shared deployment secret, like the reply inbox: the
// caller is the control plane, not a person, and there is no session for it to
// present. The URL it gets back expires in minutes.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-heartbeat-secret",
};

const EXPIRES_SECONDS = 300;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

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

    const { attachment_id } = await req.json().catch(() => ({}));
    if (!attachment_id) return json({ success: false, error: "attachment_id required" }, 400);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // The path comes from our own table, never from the request. A caller
    // holding the secret could otherwise name any object in the bucket.
    const { data: attachment } = await admin
      .from("support_attachments")
      .select("path, filename, mime_type")
      .eq("id", attachment_id)
      .maybeSingle();
    if (!attachment) return json({ success: false, error: "No such attachment" }, 404);

    const { data: signed, error } = await admin
      .storage
      .from("support-attachments")
      .createSignedUrl(attachment.path, EXPIRES_SECONDS);
    if (error || !signed) {
      return json({ success: false, error: error?.message ?? "Could not sign the file" }, 500);
    }

    return json({
      success: true,
      url: signed.signedUrl,
      filename: attachment.filename,
      mime_type: attachment.mime_type,
      expires_in: EXPIRES_SECONDS,
    });
  } catch (e) {
    console.error("support-attachment-url error", e);
    return json({ success: false, error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
