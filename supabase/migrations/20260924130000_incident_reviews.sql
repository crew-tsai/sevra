-- The after-action report.
--
-- Everything needed to write one already existed and nobody could get at it:
-- when the incident opened, what the mentions said, how the level moved, what
-- was drafted, who approved it, when it went out and what happened next. That
-- is the document a communications director takes to their board, and it was
-- a week of somebody's evenings.
--
-- Generated per incident, stored, and regenerable — the facts can change after
-- the fact (a late correction, a mention that arrives the next morning), and a
-- review that cannot be rewritten stops being true.

CREATE TABLE IF NOT EXISTS public.incident_reviews (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id   UUID NOT NULL UNIQUE REFERENCES public.incidents(id) ON DELETE CASCADE,
  content       TEXT NOT NULL,
  -- The measured facts, kept beside the prose so the numbers in the report can
  -- be checked against what the tables actually said at the time, and so a
  -- later reader can see them without re-deriving them.
  metrics       JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- 'ai' or 'facts': whether a model wrote the prose, or the report is the
  -- measured sequence alone because the provider could not be reached. The
  -- reader is entitled to know which they are holding.
  generated_by  TEXT NOT NULL DEFAULT 'ai' CHECK (generated_by IN ('ai', 'facts')),
  language      TEXT NOT NULL DEFAULT 'en',
  created_by    UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.incident_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated can read reviews" ON public.incident_reviews;
CREATE POLICY "Authenticated can read reviews" ON public.incident_reviews
  FOR SELECT TO authenticated USING (true);

-- Written by the edge function with the service role. No browser-side insert:
-- a review is a generated document, not something typed into a form, and
-- leaving it writable from the client would make its provenance meaningless.

GRANT SELECT ON public.incident_reviews TO authenticated;
