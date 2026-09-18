// Who is calling this function.
//
// The gateway's verify_jwt check is not an authentication check. It confirms
// the Authorization header carries a valid JWT — and the public anon key IS a
// valid JWT, shipped inside every visitor's browser bundle. Functions that
// looked up the user "best-effort" and carried on when there was none were
// therefore open to anyone holding that public key, and ran with service-role
// privileges once inside. sevra-analyze and generate-incident-assets both did
// this: an anonymous caller could trigger AI analysis that creates incidents,
// or generate a full asset package, in any client's workspace.
//
// This classifies the caller once, the same way everywhere, so each function
// states who it accepts instead of each re-deriving it.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

export type Caller =
  | { kind: "service" }
  | { kind: "user"; userId: string }
  | { kind: "anonymous" };

function roleClaim(token: string): string | null {
  const parts = token.split(".");
  if (parts.length < 2) return null;
  try {
    const b = parts[1].replaceAll("-", "+").replaceAll("_", "/")
      .padEnd(Math.ceil(parts[1].length / 4) * 4, "=");
    const role = (JSON.parse(atob(b)) as Record<string, unknown>).role;
    return typeof role === "string" ? role : null;
  } catch {
    return null;
  }
}

export async function identifyCaller(req: Request): Promise<Caller> {
  const header = req.headers.get("Authorization") ?? "";
  const token = header.replace(/^Bearer\s+/i, "").trim();
  if (!token) return { kind: "anonymous" };

  // A project holds two service-role credentials — the legacy JWT and the newer
  // sb_secret_ key — and which one is injected differs by project age, so an
  // exact comparison alone rejects the cron. Accept either.
  if (token === Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || roleClaim(token) === "service_role") {
    return { kind: "service" };
  }

  try {
    const client = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: header } } },
    );
    const { data } = await client.auth.getUser(token);
    // The anon key authenticates the request but names no user; getUser
    // returns nothing for it, which is exactly the case to refuse.
    if (data?.user?.id) return { kind: "user", userId: data.user.id };
  } catch {
    // Treated as anonymous below.
  }
  return { kind: "anonymous" };
}

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/** The standard refusal, so callers see one consistent shape. */
export function unauthorized(message = "Not authenticated"): Response {
  return new Response(JSON.stringify({ success: false, error: message }), {
    status: 401,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}
