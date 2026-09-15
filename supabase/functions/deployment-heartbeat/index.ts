// Reporta metadatos de este despliegue al plano de control de Sevra.
//
// Sevra se despliega una base de datos por cliente, así que no hay forma de
// ver la cartera desde ningún sitio. Esta función manda un latido periódico
// (pg_cron, cada 15 min) con el pulso de este despliegue.
//
// LÍMITE DE PRIVACIDAD, INNEGOCIABLE: solo se envían conteos y el nombre de
// la empresa. Nunca títulos de incidentes, descripciones, contenido de
// comunicados ni menciones. Es lo que permite dar visibilidad de cartera sin
// romper el aislamiento entre clientes.
//
// Si CONTROL_PLANE_URL o HEARTBEAT_SECRET no están configurados, la función
// no hace nada y devuelve skipped: un despliegue que no reporta es válido.
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
    const controlPlaneUrl = Deno.env.get("CONTROL_PLANE_URL");
    const secret = Deno.env.get("HEARTBEAT_SECRET");

    if (!controlPlaneUrl || !secret) {
      return new Response(
        JSON.stringify({ success: true, skipped: "control plane not configured" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const admin = createClient(supabaseUrl, serviceKey);

    // project_ref sale de la propia URL: https://<ref>.supabase.co
    const projectRef = new URL(supabaseUrl).hostname.split(".")[0];

    const [settings, incidentsTotal, incidentsOpen, assets, mentions, users, social] =
      await Promise.all([
        admin.from("company_settings").select("company_name, industry").maybeSingle(),
        admin.from("incidents").select("id", { count: "exact", head: true }),
        admin.from("incidents").select("id", { count: "exact", head: true }).eq("status", "active"),
        admin.from("incident_assets").select("id", { count: "exact", head: true }),
        admin.from("social_mentions").select("id", { count: "exact", head: true }),
        admin.from("user_roles").select("id", { count: "exact", head: true }),
        admin
          .from("social_connections")
          .select("id", { count: "exact", head: true })
          .eq("status", "connected"),
      ]);

    const payload = {
      project_ref: projectRef,
      company_name: settings.data?.company_name ?? null,
      transport_type: settings.data?.industry ?? null,
      app_url: Deno.env.get("SITE_URL") ?? null,
      metrics: {
        incidents_total: incidentsTotal.count ?? 0,
        incidents_open: incidentsOpen.count ?? 0,
        assets_total: assets.count ?? 0,
        mentions_total: mentions.count ?? 0,
        users_total: users.count ?? 0,
        social_connected: social.count ?? 0,
      },
    };

    const res = await fetch(`${controlPlaneUrl}/functions/v1/heartbeat-ingest`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-heartbeat-secret": secret,
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`control plane ${res.status}: ${txt.slice(0, 200)}`);
    }

    return new Response(JSON.stringify({ success: true, reported: payload.metrics }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("deployment-heartbeat error:", e);
    return new Response(JSON.stringify({ success: false, error: e?.message ?? String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
