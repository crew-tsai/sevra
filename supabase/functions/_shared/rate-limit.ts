// A shared rate limit for the functions anybody can reach, or that cost money.
//
// The counting lives in the database because edge function instances are not
// one process: a limit held in memory is a limit per instance, which is no
// limit at all.
//
// Fails OPEN, unlike the drill guard, and for the opposite reason. If the
// limiter itself is broken, refusing every password reset and every question
// to the assistant turns a small fault into an outage. The cost of letting
// traffic through while it is broken is some wasted spend; the cost of
// refusing it is a client locked out during a crisis.

/**
 * Count this attempt and say whether it may proceed.
 *
 * `key` names the function and whoever is being limited — "recovery:a@b.com",
 * "stripes:<user id>". Composed by the caller, because only the caller knows
 * what "one of these" means.
 */
// deno-lint-ignore no-explicit-any
export async function allowRequest(
  admin: any,
  key: string,
  limit: number,
  windowSeconds: number,
): Promise<boolean> {
  try {
    const { data, error } = await admin.rpc("rate_limit_hit", {
      _key: key,
      _limit: limit,
      _window_seconds: windowSeconds,
    });
    if (error) {
      console.error("allowRequest: limiter unavailable, allowing", error.message);
      return true;
    }
    return data !== false;
  } catch (e) {
    console.error("allowRequest: limiter threw, allowing", e);
    return true;
  }
}

/** The standard refusal, with a sentence a person can act on. */
export function tooManyRequests(message: string): Response {
  return new Response(JSON.stringify({ success: false, error: message }), {
    status: 429,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      "Content-Type": "application/json",
      // Advisory, but it is what a well-behaved client reads before retrying.
      "Retry-After": "60",
    },
  });
}
