// Tells someone an incident is now theirs.
//
// The product could display an assignee and had no way to set one; now that it
// does, being handed a crisis is only useful if you find out about it while it
// is still happening.
//
// Best-effort by design. Assignment is the thing that must succeed; the email
// is the thing that helps. The caller does not wait on this and a failure here
// never un-assigns anybody.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey);

    // A real person has to be asking: this sends mail, and the gateway accepts
    // the publishable key as a valid JWT, so being let in proves nothing.
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? serviceKey;
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
    });
    const { data: userData } = await userClient.auth.getUser();
    if (!userData?.user?.id) {
      return new Response(JSON.stringify({ success: false, error: "Not authenticated" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { incident_id, user_id, lang } = await req.json().catch(() => ({}));
    if (!incident_id || !user_id) throw new Error("incident_id and user_id are required");

    // Telling somebody they own their own incident is noise.
    if (user_id === userData.user.id) {
      return new Response(JSON.stringify({ success: true, skipped: "assigned to self" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const [{ data: incident }, { data: member }, { data: settings }] = await Promise.all([
      admin.from("incidents").select("id, title, description, risk, crisis_level, is_drill").eq("id", incident_id).maybeSingle(),
      admin.from("team_members").select("email").eq("user_id", user_id).maybeSingle(),
      admin.from("company_settings").select("company_name").maybeSingle(),
    ]);

    if (!incident) throw new Error("Incident not found");
    if (!member?.email) throw new Error("That team member has no email address");
    // A rehearsal must not mail anybody, by any path.
    if (incident.is_drill) {
      return new Response(JSON.stringify({ success: true, drill: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const res = await fetch(`${supabaseUrl}/functions/v1/send-transactional-email`, {
      method: "POST",
      headers: { Authorization: `Bearer ${serviceKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        templateName: "crisis-alert",
        recipientEmail: member.email,
        // One notice per person per incident, however many times it is
        // reassigned back and forth.
        idempotencyKey: `assign-${incident_id}-${user_id}`,
        templateData: {
          incidentTitle: incident.title,
          incidentRef: `INC-${String(incident.id).slice(0, 8).toUpperCase()}`,
          crisisLevel: incident.crisis_level ?? 0,
          risk: incident.risk,
          summary: incident.description ?? "",
          assignedToYou: true,
          companyName: settings?.company_name ?? undefined,
          lang: lang === "es" ? "es" : "en",
        },
      }),
    });

    return new Response(JSON.stringify({ success: res.ok }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
    // deno-lint-ignore no-explicit-any
  } catch (e: any) {
    console.error("notify-assignee error:", e);
    return new Response(JSON.stringify({ success: false, error: e?.message ?? String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
