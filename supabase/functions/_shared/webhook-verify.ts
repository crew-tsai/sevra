// Verifies a Svix-signed webhook, which is the scheme Resend uses.
//
// Replaces npm:@lovable.dev/webhooks-js. Written out rather than pulled from a
// package because it is thirty lines and the alternative is another vendor
// dependency in the position we just spent this migration removing.
//
// Signature covers `{id}.{timestamp}.{body}` with HMAC-SHA256, keyed on the
// base64 secret that follows the `whsec_` prefix.

export type VerifyResult =
  | { ok: true; body: string }
  | { ok: false; reason: "no_secret" | "missing_headers" | "stale" | "bad_signature" };

/** Tolerance for clock skew and delivery delay, in seconds. */
const MAX_AGE = 5 * 60;

export async function verifySvix(req: Request, secret: string | undefined): Promise<VerifyResult> {
  if (!secret) return { ok: false, reason: "no_secret" };

  const id = req.headers.get("svix-id") ?? req.headers.get("webhook-id");
  const ts = req.headers.get("svix-timestamp") ?? req.headers.get("webhook-timestamp");
  const sig = req.headers.get("svix-signature") ?? req.headers.get("webhook-signature");
  if (!id || !ts || !sig) return { ok: false, reason: "missing_headers" };

  // A replayed delivery from long ago should not be able to re-suppress an
  // address that has since been cleaned up.
  const age = Math.abs(Date.now() / 1000 - Number(ts));
  if (!Number.isFinite(age) || age > MAX_AGE) return { ok: false, reason: "stale" };

  const body = await req.text();
  const raw = secret.startsWith("whsec_") ? secret.slice(6) : secret;

  const key = await crypto.subtle.importKey(
    "raw",
    Uint8Array.from(atob(raw), (c) => c.charCodeAt(0)),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${id}.${ts}.${body}`));
  const expected = btoa(String.fromCharCode(...new Uint8Array(mac)));

  // The header carries a space-separated list of `v1,<sig>` so a secret can be
  // rotated without dropping deliveries mid-rotation.
  const provided = sig.split(" ").map((p) => p.split(",")[1] ?? "");
  const match = provided.some((p) => timingSafeEqual(p, expected));
  return match ? { ok: true, body } : { ok: false, reason: "bad_signature" };
}

/** Comparison whose duration does not depend on where the first byte differs. */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
