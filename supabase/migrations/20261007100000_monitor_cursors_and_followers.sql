-- Two things the collector needed and did not have.
--
-- 1. A per-query cursor. Every tick re-read the newest page of each query, so
--    anything past that page was never collected at all: the busier the hour,
--    the smaller the share of it Sevra saw. The cursor lets a tick page
--    forward from where the last one stopped.
--
-- 2. The author's audience. The analyser already escalates on is_influencer
--    and is_verified, but nothing ever set them from the author's real
--    following, so a complaint from a two-million-follower account scored the
--    same as one from an account with three.

CREATE TABLE IF NOT EXISTS public.monitor_cursors (
  channel    TEXT NOT NULL,
  query      TEXT NOT NULL,
  since_id   TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (channel, query)
);

-- Internal bookkeeping: the service role writes it, nobody reads it from a
-- browser. RLS with no policy closes the door, and the explicit REVOKE closes
-- it against ALTER DEFAULT PRIVILEGES, which otherwise grants every new table
-- in this schema to authenticated and anon.
ALTER TABLE public.monitor_cursors ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.monitor_cursors FROM anon, authenticated;
GRANT ALL ON public.monitor_cursors TO service_role;

ALTER TABLE public.social_mentions
  ADD COLUMN IF NOT EXISTS author_followers INTEGER;

COMMENT ON COLUMN public.social_mentions.author_followers IS
  'Followers the author had when the post was collected. Reach falls back to this when X reports no impressions, so keeping it separate preserves who said it.';
