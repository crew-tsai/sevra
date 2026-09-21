-- Accounts and hashtags this company wants watched, beyond its own name.
--
-- Brand monitoring answers "who is talking about us". It does not answer "what
-- is the local MP saying today", or "what is moving under #FlightDelays" — and
-- in a crisis those are often where it starts, before the company is named at
-- all.
--
-- The important part is not the extra reach. It is that a complaint from an
-- account with an audience is a different event from the same words posted by
-- nobody in particular: `social_mentions.is_influencer` already feeds
-- `amplified` in the crisis-level calculation, which raises the level by one.
-- A watched account is therefore a statement about consequence, not just a
-- search term, which is why each entry carries that choice explicitly.

CREATE TABLE IF NOT EXISTS public.monitor_watchlist (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Only 'x' does anything today. The column exists because the limit is the
  -- platforms', not ours: Instagram can search hashtags for business accounts
  -- with permissions we do not yet hold, Facebook cannot search at all, and
  -- TikTok offers no search outside its research programme. Storing the
  -- intention now means a client's list survives the day a platform opens up.
  network     TEXT NOT NULL DEFAULT 'x' CHECK (network IN ('x', 'instagram', 'facebook', 'tiktok')),
  kind        TEXT NOT NULL CHECK (kind IN ('account', 'hashtag', 'keyword')),
  -- Stored bare: no leading @ or #, so the same value reads the same in the
  -- table whatever the platform's punctuation happens to be.
  value       TEXT NOT NULL,
  -- Why this is being watched, in the client's words: "local MP", "aviation
  -- blogger", "the hashtag from the March incident". Shown to whoever inherits
  -- the list, and to the AI as context for what it is looking at.
  label       TEXT,
  -- Whether a post from here counts as amplified. True for an account with an
  -- audience; usually false for a hashtag, which anyone can use.
  amplifies   BOOLEAN NOT NULL DEFAULT true,
  active      BOOLEAN NOT NULL DEFAULT true,
  created_by  UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- One entry per thing per network. A duplicate is a wasted slot in a query
-- that has 512 characters to spend.
CREATE UNIQUE INDEX IF NOT EXISTS monitor_watchlist_unique
  ON public.monitor_watchlist (network, kind, lower(value));

CREATE INDEX IF NOT EXISTS monitor_watchlist_active
  ON public.monitor_watchlist (network, active);

ALTER TABLE public.monitor_watchlist ENABLE ROW LEVEL SECURITY;

-- Everyone sees what is being watched — a crisis team reading a mention needs
-- to know why it was collected.
DROP POLICY IF EXISTS "Authenticated can read watchlist" ON public.monitor_watchlist;
CREATE POLICY "Authenticated can read watchlist" ON public.monitor_watchlist
  FOR SELECT TO authenticated USING (true);

-- Changing it changes what the product goes looking for and what it treats as
-- amplified, so it belongs with the other administrator-only settings.
DROP POLICY IF EXISTS "Admins manage watchlist" ON public.monitor_watchlist;
CREATE POLICY "Admins manage watchlist" ON public.monitor_watchlist
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));
