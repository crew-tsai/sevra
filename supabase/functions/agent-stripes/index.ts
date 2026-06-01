import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `You are Agent Stripes, Sevra's AI crisis-response assistant for Aurora Skylines (the Madrid-based hybrid network carrier, also referred to as "Aurora Airlines").

STRICT SCOPE — non-negotiable:
- You ONLY discuss Aurora Skylines / Aurora Airlines. If asked about any other company, airline, or unrelated topic, decline in one sentence and redirect to current Aurora incidents in Sevra.
- You ONLY use facts from (a) the PLATFORM DATA block provided below in this system prompt (live data from the Sevra workspace) and (b) what the user says in this conversation.
- Never invent flight numbers, dates, names, casualty counts, statements, quotes, URLs, "past cases", or historical precedents. If a fact is not in the PLATFORM DATA or in the user's messages, say you don't have it in the current Sevra data and suggest where in Sevra (Dashboard, Approvals, Assets, Audit Log, Social Mentions) the user can find or add it.
- When you cite a fact, prefer referring to the specific incident title, flight number, or asset title from the PLATFORM DATA so the user can locate it in Sevra.

What you can help with (within the scope above):
- Summaries and status of current Aurora incidents, assets, and social mentions in the platform
- Next-step guidance on an active Aurora incident
- Drafting / reviewing Aurora crisis communications grounded in current platform data
- Explaining how to use the Sevra platform (monitoring, approvals, distribution, audit log, crisis levels L0–L4)

Tone: calm, concise, decisive. Short paragraphs and bullet points. When the user describes or asks about an active Aurora incident, lead with the next 1–3 concrete actions.`;

function fmtDate(d: string | null | undefined) {
  if (!d) return "—";
  try { return new Date(d).toISOString().replace("T", " ").slice(0, 16) + "Z"; } catch { return d; }
}

function trunc(s: string | null | undefined, n: number) {
  if (!s) return "";
  return s.length > n ? s.slice(0, n) + "…" : s;
}

async function buildPlatformContext(): Promise<string> {
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!SUPABASE_URL || !SERVICE_KEY) return "PLATFORM DATA: unavailable (backend not configured).";

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

  const [incidentsRes, assetsRes, mentionsRes, auditRes, companyRes] = await Promise.all([
    supabase.from("incidents").select("id,title,description,incident_type,sub_type,airline_name,flight_number,route,airport_code,country,risk,status,crisis_level,risk_score,approval_status,estimated_passengers_impacted,injury_fatality,regulator_involved,is_public,created_at,updated_at").order("updated_at", { ascending: false }).limit(40),
    supabase.from("incident_assets").select("id,incident_id,asset_type,channel,title,content,approval_status,created_at,updated_at").order("updated_at", { ascending: false }).limit(60),
    supabase.from("social_mentions").select("id,channel,author_handle,author_name,content,ai_risk,ai_risk_score,ai_summary,ai_incident_type,is_influencer,is_verified,reach,posted_at,post_url,status,incident_id").order("posted_at", { ascending: false, nullsFirst: false }).limit(30),
    supabase.from("incident_audit_log").select("incident_id,incident_title,field_name,old_value,new_value,changed_at,change_source").order("changed_at", { ascending: false }).limit(25),
    supabase.from("company_settings").select("company_name,industry").limit(1),
  ]);

  const company = companyRes.data?.[0];
  const incidents = incidentsRes.data ?? [];
  const assets = assetsRes.data ?? [];
  const mentions = mentionsRes.data ?? [];
  const audit = auditRes.data ?? [];

  // Filter to Aurora-related rows where airline is set; if airline_name missing, keep (workspace is Aurora-only).
  const isAurora = (s?: string | null) =>
    !s || /aurora/i.test(s);

  const auroraIncidents = incidents.filter((i) => isAurora(i.airline_name));
  const incidentIds = new Set(auroraIncidents.map((i) => i.id));
  const auroraAssets = assets.filter((a) => incidentIds.has(a.incident_id));
  const auroraMentions = mentions.filter((m) => !m.incident_id || incidentIds.has(m.incident_id));
  const auroraAudit = audit.filter((a) => incidentIds.has(a.incident_id));

  const lines: string[] = [];
  lines.push("=== PLATFORM DATA (live snapshot from the Sevra workspace) ===");
  lines.push(`Workspace: ${company?.company_name ?? "Aurora Skylines"} (${company?.industry ?? "Aviation"})`);
  lines.push(`Snapshot time: ${new Date().toISOString()}`);
  lines.push("");

  lines.push(`## Incidents (${auroraIncidents.length})`);
  if (auroraIncidents.length === 0) lines.push("(none)");
  for (const i of auroraIncidents) {
    lines.push(
      `- [${i.id.slice(0, 8)}] ${i.title} | type=${i.incident_type}${i.sub_type ? "/" + i.sub_type : ""} | risk=${i.risk} L${i.crisis_level} score=${i.risk_score} | status=${i.status} | approval=${i.approval_status}` +
      `${i.flight_number ? ` | flight=${i.flight_number}` : ""}${i.route ? ` | route=${i.route}` : ""}${i.airport_code ? ` | airport=${i.airport_code}` : ""}${i.country ? ` | country=${i.country}` : ""}` +
      ` | pax_impacted=${i.estimated_passengers_impacted ?? 0} | injury=${i.injury_fatality} | regulator=${i.regulator_involved} | public=${i.is_public}` +
      ` | created=${fmtDate(i.created_at)} | updated=${fmtDate(i.updated_at)}` +
      (i.description ? `\n  desc: ${trunc(i.description, 280)}` : "")
    );
  }
  lines.push("");

  lines.push(`## Assets / Statements (${auroraAssets.length})`);
  if (auroraAssets.length === 0) lines.push("(none)");
  for (const a of auroraAssets) {
    lines.push(
      `- [${a.id.slice(0, 8)}] incident=${a.incident_id.slice(0, 8)} | type=${a.asset_type}${a.channel ? "/" + a.channel : ""} | approval=${a.approval_status} | updated=${fmtDate(a.updated_at)}\n  title: ${a.title}\n  content: ${trunc(a.content, 400)}`
    );
  }
  lines.push("");

  lines.push(`## Social mentions (${auroraMentions.length})`);
  if (auroraMentions.length === 0) lines.push("(none)");
  for (const m of auroraMentions) {
    lines.push(
      `- [${m.id.slice(0, 8)}] ${m.channel} @${m.author_handle ?? "?"}${m.is_influencer ? " (influencer)" : ""}${m.is_verified ? " ✓" : ""} | risk=${m.ai_risk ?? "?"}/${m.ai_risk_score ?? "?"} | reach=${m.reach ?? 0} | posted=${fmtDate(m.posted_at)} | status=${m.status}` +
      (m.ai_summary ? `\n  summary: ${trunc(m.ai_summary, 200)}` : "") +
      `\n  content: ${trunc(m.content, 240)}`
    );
  }
  lines.push("");

  lines.push(`## Recent audit log (${auroraAudit.length})`);
  if (auroraAudit.length === 0) lines.push("(none)");
  for (const a of auroraAudit) {
    lines.push(`- ${fmtDate(a.changed_at)} | "${a.incident_title}" ${a.field_name}: ${a.old_value ?? "—"} → ${a.new_value ?? "—"} (${a.change_source ?? "manual"})`);
  }

  lines.push("");
  lines.push("=== END PLATFORM DATA ===");
  return lines.join("\n");
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    let platformContext = "PLATFORM DATA: unavailable.";
    try {
      platformContext = await buildPlatformContext();
    } catch (e) {
      console.error("buildPlatformContext failed:", e);
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "system", content: platformContext },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit hit, please try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please top up your workspace." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("agent-stripes error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
