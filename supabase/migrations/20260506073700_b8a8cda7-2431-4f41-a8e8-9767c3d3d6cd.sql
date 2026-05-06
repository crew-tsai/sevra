CREATE OR REPLACE FUNCTION public.get_social_monitor_status()
RETURNS TABLE(active boolean, schedule text, last_run_at timestamp with time zone, last_status text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'cron'
SET statement_timeout TO '3s'
AS $function$
DECLARE
  v_jobid bigint;
  v_active boolean;
  v_schedule text;
  v_last_run timestamptz;
  v_last_status text;
BEGIN
  SELECT j.jobid, j.active, j.schedule
    INTO v_jobid, v_active, v_schedule
  FROM cron.job j
  WHERE j.jobname = 'sevra-social-monitor-15min';

  IF v_jobid IS NULL THEN
    RETURN QUERY SELECT false, NULL::text, NULL::timestamptz, NULL::text;
    RETURN;
  END IF;

  -- Skip last-run lookup to avoid scanning cron.job_run_details (no useful index, causes timeouts).
  RETURN QUERY SELECT v_active, v_schedule, NULL::timestamptz, NULL::text;
END;
$function$;