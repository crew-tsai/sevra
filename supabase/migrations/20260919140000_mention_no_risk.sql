-- A mention can be about the company without being a risk.
--
-- Analysis had two outcomes: open an incident, or "dismissed" -- shown as
-- noise. Praise for the company ("congratulations on the launch") landed in
-- noise next to posts that were not about the company at all, labelled
-- "Customer treatment · Service complaint" because a type was required even
-- when there was no incident.
--
-- no_risk: about the company, not a threat (praise, questions, neutral news).
-- dismissed stays for what is not about the company at all.
ALTER TABLE public.social_mentions DROP CONSTRAINT IF EXISTS ck_mention_status;
ALTER TABLE public.social_mentions
  ADD CONSTRAINT ck_mention_status
  CHECK (status IN ('pending', 'analyzing', 'incident_created', 'linked_to_incident', 'no_risk', 'dismissed'));

ALTER TABLE public.social_mentions
  ADD COLUMN IF NOT EXISTS ai_sentiment TEXT
  CHECK (ai_sentiment IS NULL OR ai_sentiment IN ('positive', 'neutral', 'negative'));
