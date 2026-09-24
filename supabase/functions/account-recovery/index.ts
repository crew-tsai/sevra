// "Forgot password?" for someone who was invited but never signed up.
//
// The auth server's own reset only emails existing accounts and silently
// drops everyone else -- correctly, or it would reveal who has one. But an
// invited person who has not created their account yet is exactly who reaches
// for "Forgot password?", and they got nothing. For them this sends an
// invitation instead: the same link lands on the set-a-password page.
//
// Public (no JWT). Answers identically whatever the outcome, and only ever
// emails an address this workspace already invited.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { allowRequest } from "../_shared/rate-limit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ok = () => new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers: corsHeaders });

  try {
    const { email } = await req.json().catch(() => ({}));
    if (typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return ok();
    const addr = email.trim().toLowerCase();

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Public, and it sends email to whatever address is typed. Five attempts
    // an hour per address is far above anyone who genuinely forgot, and far
    // below anything worth doing to somebody's inbox.
    //
    // Answered with the same `ok()` as every other outcome, not a 429: this
    // endpoint deliberately reveals nothing about which addresses exist, and a
    // distinct response for "too many" would leak exactly that.
    if (!(await allowRequest(admin, `recovery:${addr}`, 5, 3600))) {
      console.warn("account-recovery: rate limited", addr);
      return ok();
    }

    const [team, boot] = await Promise.all([
      admin.from("team_members").select("email").ilike("email", addr).limit(1),
      admin.from("bootstrap_config").select("bootstrap_admin_email").maybeSingle(),
    ]);
    const invited = (team.data?.length ?? 0) > 0 ||
      (boot.data?.bootstrap_admin_email ?? "").trim().toLowerCase() === addr;
    if (!invited) return ok();

    // The redirect is fixed to this workspace's own address, never taken from
    // the request, so the email cannot be made to send someone elsewhere.
    const site = (Deno.env.get("SITE_URL") ?? "").replace(/\/+$/, "");
    const { error } = await admin.auth.admin.inviteUserByEmail(addr, site ? { redirectTo: `${site}/reset-password` } : undefined);
    // "Already registered" is the normal case for anyone with an account: the
    // auth server's own reset email covers them.
    if (error && !/already|registered|exists/i.test(error.message)) {
      console.error("account-recovery invite failed:", error.message);
    }
  } catch (e) {
    console.error("account-recovery error:", e);
  }
  return ok();
});
