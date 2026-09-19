-- "Last run" on Social Intel, from the monitor itself.
--
-- The status read the time from cron.job_run_details, until that scan timed
-- out and was dropped -- after which new workspaces never showed a last run at
-- all. Older workspaces kept a version reading company_settings, which nothing
-- had written since the move off Lovable: one said "last run 58 days ago" while
-- the monitor ran every 15 minutes.
--
-- Now the monitor records each run on company_settings, and the status reads
-- that, with on/off taken from the scheduled job -- the thing that actually
-- decides whether it runs.
ALTER TABLE public.company_settings
  ADD COLUMN IF NOT EXISTS monitor_last_run_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS monitor_last_result JSONB;

-- DROP first: workspaces that drifted return a different column list, and
-- CREATE OR REPLACE cannot change a function's return type.
DROP FUNCTION IF EXISTS public.get_social_monitor_status();

CREATE FUNCTION public.get_social_monitor_status()
RETURNS TABLE(active boolean, schedule text, last_run_at timestamptz, last_status text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, cron
SET statement_timeout = '3s'
AS $$
DECLARE
  v_active boolean;
  v_schedule text;
  v_last_run timestamptz;
  v_last_result jsonb;
BEGIN
  SELECT j.active, j.schedule INTO v_active, v_schedule
    FROM cron.job j WHERE j.jobname = 'sevra-social-monitor-15min';

  SELECT s.monitor_last_run_at, s.monitor_last_result INTO v_last_run, v_last_result
    FROM public.company_settings s LIMIT 1;

  RETURN QUERY SELECT
    COALESCE(v_active, false),
    v_schedule,
    v_last_run,
    CASE WHEN v_last_result IS NULL THEN NULL
         WHEN v_last_result ? 'network_errors' THEN 'errors'
         ELSE 'ok' END;
END;
$$;

-- On/off is the scheduled job. Drifted workspaces also wrote a settings flag
-- that nothing reads any more; one source of truth is the point.
CREATE OR REPLACE FUNCTION public.set_social_monitor_active(p_active boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, cron
AS $$
BEGIN
  PERFORM cron.alter_job(
    job_id := (SELECT jobid FROM cron.job WHERE jobname = 'sevra-social-monitor-15min'),
    active := p_active
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_social_monitor_status() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.set_social_monitor_active(boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_social_monitor_status() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.set_social_monitor_active(boolean) TO authenticated, service_role;
