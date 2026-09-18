-- Spanish alongside English for what the AI writes.
--
-- English stays in the original columns -- everything that reads them keeps
-- working -- and the Spanish version of the same fields sits in
-- `translations.es`, keyed by column name:
--
--   incidents.translations        {"es": {"title": "...", "description": "..."}}
--   social_mentions.translations  {"es": {"ai_summary": "..."}}
--   response_plan.translations    {"es": {"phase_immediate": [...], ...}}
--
-- A record with no Spanish yet (older ones, and incidents people typed in by
-- hand) is translated the first time someone views it in Spanish.
ALTER TABLE public.incidents       ADD COLUMN IF NOT EXISTS translations JSONB;
ALTER TABLE public.social_mentions ADD COLUMN IF NOT EXISTS translations JSONB;
ALTER TABLE public.response_plan   ADD COLUMN IF NOT EXISTS translations JSONB;

-- Drafted communications are written in one language, chosen when they are
-- generated, because they are published as they are.
ALTER TABLE public.incident_assets ADD COLUMN IF NOT EXISTS language TEXT
  CHECK (language IS NULL OR language IN ('en', 'es'));
