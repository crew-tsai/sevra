CREATE OR REPLACE FUNCTION public.get_social_monitor_status()
RETURNS TABLE(active boolean, schedule text, last_run_at timestamptz, last_status text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, cron
AS $$
DECLARE
  v_jobid bigint;
BEGIN
  SELECT j.jobid INTO v_jobid FROM cron.job j WHERE j.jobname = 'sevra-social-monitor-15min';
  IF v_jobid IS NULL THEN
    RETURN QUERY SELECT false, NULL::text, NULL::timestamptz, NULL::text;
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    j.active,
    j.schedule,
    (SELECT r.start_time FROM cron.job_run_details r WHERE r.jobid = v_jobid ORDER BY r.start_time DESC LIMIT 1),
    (SELECT r.status     FROM cron.job_run_details r WHERE r.jobid = v_jobid ORDER BY r.start_time DESC LIMIT 1)
  FROM cron.job j
  WHERE j.jobid = v_jobid;
END;
$$;

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