-- A dismissal is a verdict, and there are already 69 of them.
--
-- classification_agreement() counted only mentions somebody had explicitly
-- judged with the new control, so it reported "nobody has corrected a
-- classification yet" on a workspace holding 69 mentions a person had opened,
-- read and thrown away. Dismissing is the most common verdict there is: it
-- means "this was not about us", which is exactly the 'none' the explicit
-- control offers.
--
-- Explicit verdicts still win. Somebody who dismissed a mention and then said
-- "actually this was high risk" has said two things, and the later, more
-- specific one is the one to believe.

-- Adding an OUT parameter changes the return type, and CREATE OR REPLACE
-- refuses that (42P13) — the same trap as rebuilding a view with a new column
-- order. Dropped explicitly, and the grant restated below because the drop
-- takes it with the function.
DROP FUNCTION IF EXISTS public.classification_agreement(TIMESTAMPTZ);

CREATE OR REPLACE FUNCTION public.classification_agreement(_since TIMESTAMPTZ DEFAULT now() - INTERVAL '90 days')
RETURNS TABLE (judged INTEGER, agreed INTEGER, overcalled INTEGER, undercalled INTEGER, implicit INTEGER, by_one INTEGER)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  WITH verdicts AS (
    SELECT
      m.id,
      -- The human's answer, explicit where there is one, otherwise the
      -- dismissal.
      COALESCE(
        CASE m.human_risk
          WHEN 'none' THEN 0 WHEN 'low' THEN 1 WHEN 'medium' THEN 2
          WHEN 'high' THEN 3 WHEN 'critical' THEN 4
        END,
        CASE WHEN m.status = 'dismissed' THEN 0 END
      ) AS human,
      (m.human_risk IS NULL) AS from_dismissal,
      CASE
        WHEN m.ai_should_create_incident IS NOT TRUE AND m.ai_risk IS NULL THEN 0
        WHEN m.ai_risk = 'low' THEN 1 WHEN m.ai_risk = 'medium' THEN 2
        WHEN m.ai_risk = 'high' THEN 3 WHEN m.ai_risk = 'critical' THEN 4
        ELSE 0
      END AS ai
    FROM public.social_mentions m
    WHERE (m.human_risk IS NOT NULL AND m.human_risk_at >= _since)
       OR (m.human_risk IS NULL AND m.status = 'dismissed' AND m.updated_at >= _since)
  )
  SELECT
    COUNT(*)::INTEGER,
    COUNT(*) FILTER (WHERE ai = human)::INTEGER,
    COUNT(*) FILTER (WHERE ai > human)::INTEGER,
    COUNT(*) FILTER (WHERE ai < human)::INTEGER,
    -- Reported separately so the number is never mistaken for a team that has
    -- been diligently grading every mention.
    COUNT(*) FILTER (WHERE from_dismissal)::INTEGER,
    -- Disagreed by a single band. On The Stellar Crew every one of the 69
    -- dismissals was a mention the AI had called 'low' — the mildest possible
    -- disagreement. Counting those the same as calling a catastrophe routine
    -- would report a 0% accurate classifier and be its own kind of lie, so the
    -- near misses are counted apart from the real ones.
    COUNT(*) FILTER (WHERE abs(ai - human) = 1)::INTEGER
  FROM verdicts
  WHERE human IS NOT NULL;
$$;

GRANT EXECUTE ON FUNCTION public.classification_agreement(TIMESTAMPTZ) TO authenticated;
