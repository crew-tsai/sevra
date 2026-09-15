-- Periodic heartbeat to the Sevra control plane.
--
-- Each client deployment lives in its own database, so the client portfolio is
-- not visible anywhere. deployment-heartbeat sends metadata (company name,
-- industry and counts -- never incident content) to the central registry every
-- 15 minutes.
--
-- The function no-ops if CONTROL_PLANE_URL or HEARTBEAT_SECRET are unset, so
-- this job is harmless on a deployment that shouldn't report.
--
-- Reuses the Vault secret 'sevra_cron_service_role_key' the other two jobs
-- already use (see 20260722160000_cron_jobs.sql). No credential lives here:
-- it is referenced by name only.
--
-- To revert:
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
