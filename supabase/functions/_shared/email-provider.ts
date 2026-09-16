// Sends one transactional email.
//
// Replaces npm:@lovable.dev/email-js. The app was built in Lovable and
// migrated out, but the email pipeline still called back to api.lovable.dev
// with a LOVABLE_API_KEY that was never set on the migrated project, so
// nothing had been delivered since the move -- the queue worker simply 500'd
// every five seconds.
//
// The queue, dedupe, suppression list, DLQ and send log are unchanged. Only
// the final hop to the provider is different, which keeps the blast radius of
// this swap to a single function call.
import { fromAddress, senderDomain } from "./sender-identity.ts";

const RESEND_API = "https://api.resend.com/emails";

export type SendPayload = {
  to: string;
  subject: string;
  html: string;
  text?: string;
  /** Overrides the deployment's own From: when the caller has a reason to. */
  from?: string;
  /** Lets the provider collapse retries of the same message. */
  idempotency_key?: string;
  unsubscribe_token?: string;
};

export function providerConfigured(): boolean {
  return !!Deno.env.get("RESEND_API_KEY")?.trim();
}

/**
 * Throws on failure so the caller's existing retry and dead-letter handling
 * treats a provider error exactly as it treated one before.
 */
export async function sendTransactional(payload: SendPayload): Promise<{ id: string }> {
  const key = Deno.env.get("RESEND_API_KEY")?.trim();
  if (!key) throw new Error("RESEND_API_KEY is not configured");

  const headers: Record<string, string> = {
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
  };
  // Same key on a retry means the provider delivers once, not twice. The queue
  // already dedupes, but a crash between "sent" and "deleted from queue" would
  // otherwise resend.
  if (payload.idempotency_key) headers["Idempotency-Key"] = payload.idempotency_key;

  const body: Record<string, unknown> = {
    from: payload.from ?? fromAddress(),
    to: [payload.to],
    subject: payload.subject,
    html: payload.html,
    ...(payload.text ? { text: payload.text } : {}),
  };

  // One-click unsubscribe. Required by Gmail and Yahoo for bulk senders, and
  // these go to press and distribution lists, which is exactly bulk.
  if (payload.unsubscribe_token) {
    const site = Deno.env.get("SITE_URL")?.replace(/\/+$/, "") ?? `https://${senderDomain()}`;
    const url = `${site}/unsubscribe?token=${encodeURIComponent(payload.unsubscribe_token)}`;
    body.headers = {
      "List-Unsubscribe": `<${url}>`,
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    };
  }

  const res = await fetch(RESEND_API, { method: "POST", headers, body: JSON.stringify(body) });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const detail = (json as { message?: string })?.message ?? `HTTP ${res.status}`;
    throw new Error(`Email provider rejected the message: ${detail}`);
  }
  return { id: (json as { id?: string })?.id ?? "" };
}
