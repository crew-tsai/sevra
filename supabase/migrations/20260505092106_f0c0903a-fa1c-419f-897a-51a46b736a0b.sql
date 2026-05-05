CREATE OR REPLACE FUNCTION public.get_social_monitor_status()
RETURNS TABLE(active boolean, schedule text, last_run_at timestamp with time zone, last_status text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'cron'
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

  -- Bounded lookup to avoid scanning full job_run_details history
  SELECT r.start_time, r.status
    INTO v_last_run, v_last_status
  FROM cron.job_run_details r
  WHERE r.jobid = v_jobid
    AND r.start_time > now() - interval '2 hours'
  ORDER BY r.start_time DESC
  LIMIT 1;

  RETURN QUERY SELECT v_active, v_schedule, v_last_run, v_last_status;
END;
$function$;