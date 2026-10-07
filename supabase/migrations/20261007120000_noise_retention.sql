-- Noise does not deserve a year.
--
-- Retention was one number for everything: 365 days unless a mention became
-- part of an incident. But a post the classifier marked unrelated -- matched
-- because somebody used the word "smoke" in a party hashtag, or "fire" about
-- a football game -- is not evidence of anything. It is the name, handle,
-- avatar and full text of a person with no connection to the company, kept
-- for twelve months because it tripped a keyword once.
--
-- That is the weakest possible case for holding someone's personal data, and
-- the easiest to fix: there is no legitimate interest in retaining a post
-- about an unrelated subject by an uninvolved stranger. It is also what a
-- client sees first when they open the monitoring feed, which is its own
-- argument.
--
-- So dismissed mentions expire on their own, much shorter clock. Anything the
-- classifier found relevant -- no_risk included, because "they praised us" is
-- real feedback about the company -- keeps the full retention period, and
-- anything attached to an incident is still never touched.

ALTER TABLE public.company_settings
  ADD COLUMN IF NOT EXISTS noise_retention_days INTEGER
    CHECK (noise_retention_days IS NULL OR noise_retention_days BETWEEN 1 AND 365);

-- Seven days: long enough that somebody reviewing last week's triage can still
-- see what was thrown away and correct it, short enough that nobody's
-- unrelated posts linger.
UPDATE public.company_settings SET noise_retention_days = 7 WHERE noise_retention_days IS NULL;

ALTER TABLE public.company_settings
  ALTER COLUMN noise_retention_days SET DEFAULT 7;

-- A default on the column, because company_settings is created by the app
-- rather than a migration: without one, every client provisioned from here on
-- would start at "keep forever" again, which is the bug this already had once.
ALTER TABLE public.company_settings
  ALTER COLUMN mention_retention_days SET DEFAULT 365;

/**
 * Delete mentions nobody needs any more.
 *
 * Two clocks now. Dismissed mentions -- the classifier's "this is not about
 * this company at all" -- go on the short one. Everything else keeps the full
 * retention period. A mention attached to an incident is never deleted by
 * either: that is the record of a crisis, and a timer must not destroy
 * evidence.
 *
 * Runs from the monitor's own schedule rather than a new cron job, so it
 * cannot be the thing that stops running without anybody noticing.
 */
CREATE OR REPLACE FUNCTION public.expire_old_mentions()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  keep_days  INTEGER;
  noise_days INTEGER;
  removed    INTEGER := 0;
  n          INTEGER;
BEGIN
  SELECT mention_retention_days, noise_retention_days
    INTO keep_days, noise_days
    FROM public.company_settings
   LIMIT 1;

  IF noise_days IS NOT NULL THEN
    DELETE FROM public.social_mentions
     WHERE incident_id IS NULL
       AND status = 'dismissed'
       AND created_at < now() - make_interval(days => noise_days);
    GET DIAGNOSTICS n = ROW_COUNT;
    removed := removed + n;
  END IF;

  IF keep_days IS NOT NULL THEN
    DELETE FROM public.social_mentions
     WHERE incident_id IS NULL
       AND created_at < now() - make_interval(days => keep_days);
    GET DIAGNOSTICS n = ROW_COUNT;
    removed := removed + n;
  END IF;

  RETURN removed;
END;
$$;
