// Who transactional email appears to come from, for this deployment.
//
// These were hardcoded to Sevra's own domain, which meant every client's crisis
// notifications went out as noreply@thestellar.ai. Two problems with that:
//
//   - The recipient doesn't recognise the sender at the exact moment trust
//     matters most. A hospital notifying its staff mid-incident should not
//     arrive as mail from its software vendor.
//   - Far worse, every client shared one sending reputation. Spam complaints
//     against one client degrade deliverability for all of them. The product is
//     built on structural isolation -- one database per client -- and leaving
//     the outbound channel shared quietly undoes that for email.
//
// So the sending identity is per deployment. Sevra still holds the single
// provider account and operates it; each client verifies their own subdomain
// under it, which keeps reputation separated without asking a comms team to go
// register anything.
//
// Unset falls back to Sevra's domain, which is correct for a client who has not
// verified their own yet: mail still sends, it just isn't branded to them.

/** Verified sending subdomain, e.g. "notify.client.com". Never the root. */
export function senderDomain(): string {
  return Deno.env.get("SENDER_DOMAIN")?.trim() || "notify.thestellar.ai";
}

/**
 * Domain shown in the From: header.
 *
 * Defaults to the verified sending domain rather than the root. The previous
 * default was the root domain, inherited from a Mailgun setup that allowed
 * displaying one domain while sending through another. Resend refuses that
 * outright:
 *
 *   This API key is not authorized to send emails from thestellar.ai
 *
 * Most providers now require the From: domain to be the one actually
 * verified, and anti-spoofing checks at the recipient expect the same, so
 * defaulting to the sending domain is both what works and what aligns.
 *
 * Set FROM_DOMAIN explicitly only when that exact domain is also verified
 * with the provider.
 */
export function fromDomain(): string {
  return Deno.env.get("FROM_DOMAIN")?.trim() || senderDomain();
}

/** Display name in the From: header. */
export function siteName(): string {
  return Deno.env.get("SITE_NAME")?.trim() || "sevra";
}

/** The complete From: header value. */
export function fromAddress(): string {
  return `${siteName()} <noreply@${fromDomain()}>`;
}

/** True when this deployment still sends under Sevra's domain. */
export function usingFallbackDomain(): boolean {
  return !Deno.env.get("SENDER_DOMAIN")?.trim();
}
