-- Store the mention's L0-L4 level instead of deriving it in the browser.
--
-- The level comes from crisisLevel() in src/lib/crisis-level.ts, mirrored into
-- the edge functions and checked byte-identical by the build. That file says
-- plainly why: a second copy of these rules drifts from the first, and the
-- person who finds out is a client who was told the wrong thing about their
-- own crisis. So this column is deliberately NOT a generated column and there
-- is no SQL version of the formula -- sevra-analyze already computes the
-- level for the incident it may open, and now writes the same number here.
--
-- Why it has to be stored at all: Social Intel filters and counts by level,
-- and doing that in the browser means first downloading every mention in the
-- workspace. With the column, the database filters and counts, and the page
-- fetches only what it shows.

ALTER TABLE public.social_mentions
  ADD COLUMN IF NOT EXISTS crisis_level SMALLINT
    CHECK (crisis_level IS NULL OR crisis_level BETWEEN 0 AND 4);

COMMENT ON COLUMN public.social_mentions.crisis_level IS
  'L0-L4, written by sevra-analyze from the shared crisisLevel() rules. NULL means not yet analysed; the monitor backfills those. Never compute this in SQL.';

-- When the thing actually happened. posted_at is what the network reported and
-- created_at is when Sevra wrote the row; the feed has always ordered and
-- ranged on "posted_at if we have it, else created_at", and that expression
-- cannot be indexed or filtered on from the client while it lives in
-- JavaScript. Generated, not a trigger: it is a coalesce, not a judgement.
ALTER TABLE public.social_mentions
  ADD COLUMN IF NOT EXISTS occurred_at TIMESTAMPTZ
    GENERATED ALWAYS AS (coalesce(posted_at, created_at)) STORED;

-- The feed's orderings and filters. posted_at DESC is the default order;
-- the partial index covers the "needs attention" view, which is the one
-- somebody actually sits on.
CREATE INDEX IF NOT EXISTS social_mentions_occurred_at_idx
  ON public.social_mentions (occurred_at DESC);

CREATE INDEX IF NOT EXISTS social_mentions_status_occurred_idx
  ON public.social_mentions (status, occurred_at DESC);

CREATE INDEX IF NOT EXISTS social_mentions_level_occurred_idx
  ON public.social_mentions (crisis_level, occurred_at DESC)
  WHERE status NOT IN ('dismissed', 'no_risk');

CREATE INDEX IF NOT EXISTS social_mentions_channel_idx
  ON public.social_mentions (channel);

-- Counting is the other half of this: the cards, the level chips and the
-- channel tabs each need a total over the whole table, not over a page.
-- One round trip for all of them, rather than a dozen head requests.
CREATE OR REPLACE FUNCTION public.mention_facets(
  p_from TIMESTAMPTZ DEFAULT NULL,
  p_to   TIMESTAMPTZ DEFAULT NULL,
  p_channel TEXT DEFAULT NULL
) RETURNS JSONB
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  WITH scoped AS (
    SELECT *
      FROM social_mentions
     -- Unfinished work ignores the date filter, exactly as the feed does:
     -- a mention nobody has triaged yet is still untriaged next week, and
     -- dropping it out of the counts is how a crisis goes missing.
     WHERE (p_from IS NULL OR occurred_at >= p_from OR status IN ('pending', 'analyzing'))
       AND (p_to   IS NULL OR occurred_at <= p_to   OR status IN ('pending', 'analyzing'))
       AND (p_channel IS NULL OR channel = p_channel)
  )
  SELECT jsonb_build_object(
    'total',    (SELECT count(*) FROM scoped),
    'noise',    (SELECT count(*) FROM scoped WHERE status = 'dismissed'),
    'no_risk',  (SELECT count(*) FROM scoped WHERE status = 'no_risk'),
    'pending',  (SELECT count(*) FROM scoped WHERE status IN ('pending', 'analyzing')),
    'at_risk',  (SELECT count(*) FROM scoped WHERE status NOT IN ('dismissed', 'no_risk')),
    'levels',   (SELECT coalesce(jsonb_object_agg(lvl, n), '{}'::jsonb)
                   FROM (SELECT coalesce(crisis_level, 0) AS lvl, count(*) AS n
                           FROM scoped
                          WHERE status NOT IN ('dismissed', 'no_risk')
                          GROUP BY 1) t),
    -- Channel counts ignore the channel filter: they are the tabs themselves,
    -- and a tab that reads 0 because you are standing on another tab is
    -- useless.
    'channels', (SELECT coalesce(jsonb_object_agg(channel, n), '{}'::jsonb)
                   FROM (SELECT channel, count(*) AS n
                           FROM social_mentions
                          WHERE (p_from IS NULL OR occurred_at >= p_from OR status IN ('pending', 'analyzing'))
                            AND (p_to   IS NULL OR occurred_at <= p_to   OR status IN ('pending', 'analyzing'))
                          GROUP BY 1) c)
  );
$$;

-- SECURITY INVOKER above is deliberate: the caller's RLS still applies, so
-- this cannot become a way to count rows somebody may not read.
GRANT EXECUTE ON FUNCTION public.mention_facets(TIMESTAMPTZ, TIMESTAMPTZ, TEXT) TO authenticated;
