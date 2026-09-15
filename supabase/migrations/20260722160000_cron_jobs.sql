-- Wires up the two cron jobs the app already assumes exist but never
-- actually did: the "Continuous monitoring" toggle in Social Intel looks up
-- a job named 'sevra-social-monitor-15min' (see get_social_monitor_status(),
-- 20260506073700_...sql) that was never created, and process-email-queue
-- (which only dequeues, never sends synchronously) had nothing periodically
-- invoking it despite 20260423123727_email_infra.sql documenting a 5-second
-- cadence as the intended design.
--
-- No secret material lives in this file. The service-role key used to
-- authenticate these calls is stored out-of-band in Vault as
-- 'sevra_cron_service_role_key' (create via:
--   select vault.create_secret('<service_role_key>', 'sevra_cron_service_role_key');
-- ) and only referenced here by name.
--
-- To revert:
--   select cron.unschedule('sevra-social-monitor-15min');
--   select cron.unschedule('process-email-queue-5s');
--   delete from vault.secrets where name = 'sevra_cron_service_role_key';

select cron.schedule(
  'sevra-social-monitor-15min',
  '*/15 * * * *',
  $$
  select net.http_post(
    url := 'https://cbkeuuudcqgfpdkwevto.supabase.co/functions/v1/social-monitor-cron',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'sevra_cron_service_role_key')
    ),
    body := '{}'::jsonb
  );
  $$
);

select cron.schedule(
  'process-email-queue-5s',
  '5 seconds',
  $$
  select net.http_post(
    url := 'https://cbkeuuudcqgfpdkwevto.supabase.co/functions/v1/process-email-queue',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'sevra_cron_service_role_key')
    ),
    body := '{}'::jsonb
  );
  $$
);
