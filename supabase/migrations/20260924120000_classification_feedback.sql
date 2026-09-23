-- What a person thought, when the AI got it wrong.
--
-- Sevra classifies every mention — a risk word, a score, whether it opens an
-- incident — and nothing anywhere recorded whether it was right. So the
-- classifier could not be tuned, drift could not be detected, and the question
-- a prospect always asks ("how accurate is it?") had no answer but an opinion.
--
-- Deliberately not a thumbs up/down. The useful correction is the specific
-- one: this was not a crisis, or this was worse than you said. A verdict that
-- names the right answer is a training example; a thumb is a mood.

ALTER TABLE public.social_mentions
  -- NULL means nobody has judged it, which is the normal state and must stay
  -- distinguishable from "a person agreed".
  ADD COLUMN IF NOT EXISTS human_risk TEXT
    CHECK (human_risk IS NULL OR human_risk IN ('none', 'low', 'medium', 'high', 'critical')),
  ADD COLUMN IF NOT EXISTS human_risk_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS human_risk_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS social_mentions_judged
  ON public.social_mentions (human_risk_at DESC)
  WHERE human_risk IS NOT NULL;

/**
 * How often the AI and the people agreed, over a window.
 *
 * 'none' is the verdict for "this was not a crisis at all", which the AI
 * expresses by declining to open an incident rather than by a risk word — so
 * agreement there means ai_should_create_incident was false.
 *
 * Only judged mentions are counted. An unjudged mention is not evidence of
 * agreement, and treating silence as assent is how an accuracy number becomes
 * a lie.
 */
CREATE OR REPLACE FUNCTION public.classification_agreement(_since TIMESTAMPTZ DEFAULT now() - INTERVAL '90 days')
RETURNS TABLE (judged INTEGER, agreed INTEGER, overcalled INTEGER, undercalled INTEGER)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  WITH ranked AS (
    SELECT
      CASE m.human_risk WHEN 'none' THEN 0 WHEN 'low' THEN 1 WHEN 'medium' THEN 2 WHEN 'high' THEN 3 WHEN 'critical' THEN 4 END AS human,
      CASE
        WHEN m.ai_should_create_incident IS NOT TRUE AND m.ai_risk IS NULL THEN 0
        WHEN m.ai_risk = 'low' THEN 1 WHEN m.ai_risk = 'medium' THEN 2
        WHEN m.ai_risk = 'high' THEN 3 WHEN m.ai_risk = 'critical' THEN 4
        ELSE 0
      END AS ai
    FROM public.social_mentions m
    WHERE m.human_risk IS NOT NULL AND m.human_risk_at >= _since
  )
  SELECT
    COUNT(*)::INTEGER,
    COUNT(*) FILTER (WHERE ai = human)::INTEGER,
    COUNT(*) FILTER (WHERE ai > human)::INTEGER,
    COUNT(*) FILTER (WHERE ai < human)::INTEGER
  FROM ranked;
$$;

GRANT EXECUTE ON FUNCTION public.classification_agreement(TIMESTAMPTZ) TO authenticated;
