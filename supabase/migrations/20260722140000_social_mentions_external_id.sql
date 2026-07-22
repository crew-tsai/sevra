-- Real API pulls (X search, Facebook Page comments/tags) return the same
-- posts repeatedly every cron run unless deduped by the platform's own ID.
-- A plain (non-partial) unique index works for this: Postgres already
-- exempts NULL from uniqueness checks, so simulated rows (external_id always
-- NULL) are unaffected, and PostgREST's upsert(..., { onConflict }) can
-- infer this index directly (it can't infer a partial index without
-- repeating its WHERE clause, which upsert() has no way to express).
ALTER TABLE public.social_mentions ADD COLUMN external_id TEXT;

CREATE UNIQUE INDEX social_mentions_channel_external_id_idx
  ON public.social_mentions (channel, external_id);
