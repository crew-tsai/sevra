-- Volume is a signal, and nothing was reading it.
--
-- Every mention is scored on its own, so thirty people complaining about the
-- same route inside an hour produced thirty "low" verdicts and no alert. For
-- an airline that pattern *is* the crisis -- it rarely arrives as one
-- high-scoring post. This adds the rate check: it raises an alert for a human
-- and does not open an incident, because the thresholds are guesses until
-- they have seen real traffic.

CREATE TABLE IF NOT EXISTS public.monitor_alerts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kind            TEXT NOT NULL CHECK (kind IN ('volume_surge', 'topic_cluster')),
  summary         TEXT NOT NULL,
  details         JSONB NOT NULL DEFAULT '{}'::jsonb,
  window_minutes  INTEGER NOT NULL,
  observed        INTEGER NOT NULL,
  baseline        NUMERIC,
  status          TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'acknowledged')),
  acknowledged_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  acknowledged_at TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS monitor_alerts_open_idx
  ON public.monitor_alerts (created_at DESC) WHERE status = 'open';

ALTER TABLE public.monitor_alerts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated can view monitor alerts" ON public.monitor_alerts;
CREATE POLICY "Authenticated can view monitor alerts"
  ON public.monitor_alerts FOR SELECT TO authenticated USING (true);

-- Acknowledging is the only thing a person does to an alert. Whoever is on
-- the crisis desk can do it; waiting for an admin defeats the point.
DROP POLICY IF EXISTS "Authenticated can acknowledge monitor alerts" ON public.monitor_alerts;
CREATE POLICY "Authenticated can acknowledge monitor alerts"
  ON public.monitor_alerts FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- Recording a verdict never worked.
--
-- The UPDATE policy required auth.uid() = created_by, and a mention the
-- collector found has created_by NULL -- so every click matched zero rows,
-- returned no error, and showed a success toast. Zero verdicts had been
-- recorded on 133 mentions. Mentions are company data in a single-tenant
-- workspace, so any signed-in member may triage one; deleting is unchanged.
DROP POLICY IF EXISTS "Users can update own mentions" ON public.social_mentions;
CREATE POLICY "Authenticated can triage mentions"
  ON public.social_mentions FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

/**
 * Is the last window unusually loud?
 *
 * Two independent checks, each with its own cooldown so a surge that lasts
 * three hours is one alert rather than twelve:
 *
 *   volume_surge  -- the window holds more mentions than the trailing week's
 *                    rate would predict, and enough of them to matter at all.
 *   topic_cluster -- several mentions in the window share one sub-type, which
 *                    is the shape of a single real event being reported by
 *                    many people.
 *
 * Dismissed mentions and drills are excluded: noise and rehearsals must not
 * be able to raise an alarm.
 */
CREATE OR REPLACE FUNCTION public.detect_mention_surge(
  p_window_minutes   INTEGER DEFAULT 60,
  p_min_absolute     INTEGER DEFAULT 8,
  p_multiplier       NUMERIC DEFAULT 4,
  p_cluster_min      INTEGER DEFAULT 4,
  p_cooldown_minutes INTEGER DEFAULT 60
) RETURNS SETOF public.monitor_alerts
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_since     TIMESTAMPTZ := now() - make_interval(mins => p_window_minutes);
  v_base_from TIMESTAMPTZ := v_since - INTERVAL '7 days';
  v_observed  INTEGER;
  v_negative  INTEGER;
  v_base_count INTEGER;
  v_baseline  NUMERIC;
  v_threshold NUMERIC;
  v_alert     public.monitor_alerts;
  v_cluster   RECORD;
BEGIN
  SELECT count(*), count(*) FILTER (WHERE ai_sentiment = 'negative')
    INTO v_observed, v_negative
    FROM social_mentions
   WHERE coalesce(posted_at, created_at) >= v_since
     AND status <> 'dismissed'
     AND coalesce(is_drill, false) = false;

  SELECT count(*)
    INTO v_base_count
    FROM social_mentions
   WHERE coalesce(posted_at, created_at) >= v_base_from
     AND coalesce(posted_at, created_at) <  v_since
     AND status <> 'dismissed'
     AND coalesce(is_drill, false) = false;

  -- The week's rate, expressed in windows of the same length, so the
  -- comparison is like for like.
  v_baseline := round((v_base_count::numeric / (7 * 24)) * (p_window_minutes / 60.0), 2);

  -- A quiet account has a baseline near zero, where any multiplier fires on
  -- two posts. p_min_absolute is the floor that stops that.
  v_threshold := greatest(p_min_absolute::numeric, v_baseline * p_multiplier);

  IF v_observed >= v_threshold AND NOT EXISTS (
       SELECT 1 FROM monitor_alerts
        WHERE kind = 'volume_surge'
          AND created_at > now() - make_interval(mins => p_cooldown_minutes)
     ) THEN
    INSERT INTO monitor_alerts (kind, summary, details, window_minutes, observed, baseline)
    VALUES (
      'volume_surge',
      format(
        '%s mentions in the last %s minutes (%s negative). The past week averaged %s for a window this size.',
        v_observed, p_window_minutes, v_negative, v_baseline
      ),
      jsonb_build_object(
        'negative', v_negative,
        'threshold', v_threshold,
        'multiplier', p_multiplier,
        'baseline_window_count', v_base_count
      ),
      p_window_minutes, v_observed, v_baseline
    )
    RETURNING * INTO v_alert;
    RETURN NEXT v_alert;
  END IF;

  FOR v_cluster IN
    SELECT ai_sub_type AS sub_type, count(*) AS n
      FROM social_mentions
     WHERE coalesce(posted_at, created_at) >= v_since
       AND status <> 'dismissed'
       AND coalesce(is_drill, false) = false
       AND ai_sub_type IS NOT NULL
     GROUP BY ai_sub_type
    HAVING count(*) >= p_cluster_min
  LOOP
    -- Cooldown is per sub-type: a delay cluster must not silence a
    -- simultaneous baggage cluster.
    CONTINUE WHEN EXISTS (
      SELECT 1 FROM monitor_alerts
       WHERE kind = 'topic_cluster'
         AND details->>'sub_type' = v_cluster.sub_type
         AND created_at > now() - make_interval(mins => p_cooldown_minutes)
    );

    INSERT INTO monitor_alerts (kind, summary, details, window_minutes, observed, baseline)
    VALUES (
      'topic_cluster',
      format(
        '%s mentions in the last %s minutes all describe the same thing: %s.',
        v_cluster.n, p_window_minutes, v_cluster.sub_type
      ),
      jsonb_build_object('sub_type', v_cluster.sub_type, 'cluster_min', p_cluster_min),
      p_window_minutes, v_cluster.n, NULL
    )
    RETURNING * INTO v_alert;
    RETURN NEXT v_alert;
  END LOOP;

  RETURN;
END;
$$;

REVOKE ALL ON FUNCTION public.detect_mention_surge(INTEGER, INTEGER, NUMERIC, INTEGER, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.detect_mention_surge(INTEGER, INTEGER, NUMERIC, INTEGER, INTEGER) TO service_role;
