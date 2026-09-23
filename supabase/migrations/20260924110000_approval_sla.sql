-- An approval that nobody has looked at.
--
-- Two approvals is the right rule and the product enforces it well. What it
-- never had was a clock. A package drafted at 03:10 during an L4 sits in
-- Approvals until somebody happens to open the page — and the whole reason
-- automatic drafting exists is that at 03:10 nobody is looking.
--
-- So: after N minutes unapproved, on an incident at or above a level the
-- client chooses, the people who own that communication get told. Off by
-- default. A workspace that has not thought about who is on call should not
-- start sending mail at 03:10 either.

ALTER TABLE public.company_settings
  -- NULL means off. Zero would mean "escalate immediately", which is a
  -- different and legitimate thing to want, so it cannot be the off switch.
  ADD COLUMN IF NOT EXISTS approval_sla_minutes INTEGER
    CHECK (approval_sla_minutes IS NULL OR approval_sla_minutes BETWEEN 1 AND 1440),
  -- Escalating an L1 at 03:10 teaches people to ignore the alert, which costs
  -- more than the alert was worth.
  ADD COLUMN IF NOT EXISTS approval_sla_min_level INTEGER NOT NULL DEFAULT 3
    CHECK (approval_sla_min_level BETWEEN 0 AND 4);

-- Once per asset, not once per sweep. An escalation that repeats every five
-- minutes is a pager nobody keeps answering.
ALTER TABLE public.incident_assets
  ADD COLUMN IF NOT EXISTS escalated_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS incident_assets_awaiting_approval
  ON public.incident_assets (approval_status, created_at)
  WHERE approval_status <> 'approved' AND escalated_at IS NULL;

-- The sweep, scheduled against THIS project.
--
-- Every other cron migration spells out a full function URL, which is the
-- URL of the project the migration was written on. Provisioning rewrites
-- those when a client is created, and deployment-sync now rewrites them when
-- a migration arrives afterwards — but a migration that can get it right on
-- its own should, rather than relying on being corrected. The host is taken
-- from a job this project already has.
DO $sched$
DECLARE
  host TEXT;
BEGIN
  SELECT substring(command FROM 'https://([a-z]+)\.supabase\.co')
    INTO host
    FROM cron.job
   WHERE command ~ 'https://[a-z]+\.supabase\.co'
   LIMIT 1;

  IF host IS NULL THEN
    -- A project with no scheduled jobs at all: nothing to copy the host from,
    -- and provisioning has not run yet. Saying so beats scheduling a job that
    -- calls somebody else.
    RAISE NOTICE 'approval SLA sweep not scheduled: no existing cron job to read this project''s host from';
    RETURN;
  END IF;

  PERFORM cron.unschedule('sevra-approval-sla-5min')
    WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'sevra-approval-sla-5min');

  PERFORM cron.schedule(
    'sevra-approval-sla-5min',
    '*/5 * * * *',
    format(
      $cmd$
      select net.http_post(
        url := 'https://%s.supabase.co/functions/v1/approval-escalation',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'sevra_cron_service_role_key')
        ),
        body := '{}'::jsonb,
        timeout_milliseconds := 60000
      );
      $cmd$,
      host
    )
  );
END
$sched$;
