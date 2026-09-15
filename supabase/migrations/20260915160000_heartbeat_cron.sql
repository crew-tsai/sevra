-- Latido periódico al plano de control de Sevra.
--
-- Cada despliegue de cliente vive en su propia base de datos, así que la
-- cartera de clientes no es visible desde ningún sitio. deployment-heartbeat
-- envía metadatos (nombre de empresa, tipo de transporte y conteos -- nunca
-- contenido de incidentes) al registro central cada 15 minutos.
--
-- La función sale sin hacer nada si CONTROL_PLANE_URL o HEARTBEAT_SECRET no
-- están configurados, así que este cron es inofensivo en un despliegue que no
-- deba reportar.
--
-- Reutiliza el secreto de Vault 'sevra_cron_service_role_key' que ya usan los
-- otros dos cron (ver 20260722160000_cron_jobs.sql). Aquí no vive ninguna
-- credencial: solo se referencia por nombre.
--
-- Para revertir:
--   select cron.unschedule('sevra-deployment-heartbeat-15min');

select cron.schedule(
  'sevra-deployment-heartbeat-15min',
  '*/15 * * * *',
  $$
  select net.http_post(
    url := 'https://cbkeuuudcqgfpdkwevto.supabase.co/functions/v1/deployment-heartbeat',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'sevra_cron_service_role_key')
    ),
    body := '{}'::jsonb
  );
  $$
);
