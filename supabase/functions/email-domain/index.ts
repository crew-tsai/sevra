// Lets this workspace's admin set up their own email sending domain.
//
// Crisis statements go to journalists and regulators. Arriving from the
// software vendor's domain rather than the company's own is both a
// deliverability problem (an unfamiliar sender mailing press lists is the
// shape of phishing) and a credibility one, at the moment credibility matters
// most. So this has to be something a comms team can do themselves.
//
// The provider key that can create and delete domains stays on the control
// plane -- one compromised client must not be able to unverify another
// client's domain. This function proves the caller is an admin here, then
// relays over the shared-secret channel the deployment already uses.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData } = await userClient.auth.getUser();
    const userId = userData?.user?.id ?? null;
    if (!userId) return json({ success: false, error: "Not authenticated" }, 401);

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: isAdmin } = await admin.rpc("is_admin", { _user_id: userId });
    if (!isAdmin) return json({ success: false, error: "Admin access required" }, 403);

    const controlPlane = Deno.env.get("CONTROL_PLANE_URL")?.replace(/\/+$/, "");
    const secret = Deno.env.get("HEARTBEAT_SECRET");
    if (!controlPlane || !secret) {
      return json({
        success: false,
        error: "This deployment isn't connected to Sevra's control plane. Contact your Sevra administrator.",
      }, 503);
    }

    const projectRef = new URL(supabaseUrl).hostname.split(".")[0];
    const { action, domain } = await req.json().catch(() => ({}));

    const relay = await fetch(`${controlPlane}/functions/v1/client-domain`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-heartbeat-secret": secret },
      body: JSON.stringify({ project_ref: projectRef, action, domain }),
    });
    const result = await relay.json().catch(() => ({}));
    if (!relay.ok || !(result as { success?: boolean }).success) {
      return json({ success: false, error: (result as { error?: string }).error ?? "Request failed" }, relay.status);
    }

    // Mirror the provider's answer into company_settings, which is what
    // sender-identity reads when deciding what to send as. Only 'verified'
    // ever changes the From: address.
    if (action === "add") {
      await admin.from("company_settings").update({
        sending_domain: (result as { domain?: string }).domain,
        sending_domain_status: "pending",
        sending_domain_records: (result as { records?: unknown }).records ?? null,
      }).not("id", "is", null);
    } else if (action === "status") {
      const status = (result as { status?: string }).status;
      await admin.from("company_settings").update({
        sending_domain_status: status === "verified" ? "verified" : status === "not_found" ? null : "pending",
        sending_domain_records: (result as { records?: unknown }).records ?? null,
      }).not("id", "is", null);
    }

    return json(result);
  } catch (e) {
    console.error("email-domain error:", e);
    return json({ success: false, error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
