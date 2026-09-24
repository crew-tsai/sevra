-- A rate limit the edge functions can share.
--
-- The README has listed "no rate limiting on any edge function" as a known gap
-- since before the lead form was limited. The functions that matter are the
-- ones anybody can reach or that cost money per call: account-recovery sends
-- email to any address someone types, and Agent Stripes spends AI budget on
-- every message.
--
-- A fixed window rather than a sliding one: it is one row and one upsert, it
-- cannot be gamed in any way that matters at these limits, and the alternative
-- costs a table scan on a path that runs during a crisis.

CREATE TABLE IF NOT EXISTS public.rate_limit_counters (
  -- 'function:subject' — the function doing the limiting and whoever it is
  -- limiting: a user id, an email address, an incident. Composed by the
  -- caller, because only the caller knows what "one of these" means.
  key           TEXT NOT NULL,
  window_start  TIMESTAMPTZ NOT NULL,
  hits          INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (key, window_start)
);

-- Old windows are litter, not history. Nothing reads them.
CREATE INDEX IF NOT EXISTS rate_limit_counters_sweep ON public.rate_limit_counters (window_start);

/**
 * Count this attempt, and say whether it is allowed.
 *
 * Returns true when the caller may proceed. The increment happens either way,
 * so a caller hammering a limit keeps the window hot rather than resetting it
 * by being refused.
 *
 * SECURITY DEFINER with no RLS grant to anyone: the table is reachable only
 * through this function, so a client holding the anon key cannot read who has
 * been trying what, and cannot clear their own counter.
 */
CREATE OR REPLACE FUNCTION public.rate_limit_hit(
  _key TEXT,
  _limit INTEGER,
  _window_seconds INTEGER
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  bucket TIMESTAMPTZ;
  total  INTEGER;
BEGIN
  IF _key IS NULL OR _key = '' OR _limit <= 0 THEN
    RETURN true;
  END IF;

  -- Floor the clock to the window, so every caller in the same window shares
  -- one row without needing to agree on anything.
  bucket := to_timestamp(floor(extract(epoch FROM now()) / _window_seconds) * _window_seconds);

  INSERT INTO public.rate_limit_counters (key, window_start, hits)
  VALUES (_key, bucket, 1)
  ON CONFLICT (key, window_start)
  DO UPDATE SET hits = public.rate_limit_counters.hits + 1
  RETURNING hits INTO total;

  -- Opportunistic cleanup, on roughly one call in fifty, so nothing has to
  -- schedule a job whose only purpose is deleting counters.
  IF random() < 0.02 THEN
    DELETE FROM public.rate_limit_counters WHERE window_start < now() - INTERVAL '1 day';
  END IF;

  RETURN total <= _limit;
END;
$$;

ALTER TABLE public.rate_limit_counters ENABLE ROW LEVEL SECURITY;
-- No policies at all, deliberately: nobody reaches this table except through
-- the function above, which runs as its owner.

REVOKE ALL ON FUNCTION public.rate_limit_hit(TEXT, INTEGER, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rate_limit_hit(TEXT, INTEGER, INTEGER) TO service_role;
