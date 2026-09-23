-- Watched sources and watched topics, replacing the flat watchlist.
--
-- monitor_watchlist mixed three things in one table — an account, a hashtag, a
-- phrase — and made the client carry a column they should never have been
-- asked about: the network. Watching the BBC meant two rows, one for X and one
-- for Facebook, neither aware of the other, each silently doing something
-- different because the platforms permit different things.
--
-- The model here is the client's own:
--
--   a SOURCE is an actor with a role — press, regulator, activist, competitor,
--   partner, community — who holds accounts on whichever networks they use;
--   a TOPIC is a hashtag or a phrase, which belongs to nobody.
--
-- The role is the point. It is what lets the product say "a regulator
-- mentioned you" instead of "you have one more mention", and it is what
-- reaches the AI when it drafts — as context about who is speaking, never as
-- an instruction, and never touching the two approvals every communication
-- still needs.
--
-- The role vocabulary is one list for every industry, decided with the
-- partners on 2026-09-23: what changes between sectors is the examples, not
-- the roles. It lives in watched-sources.ts, mirrored into the app; the CHECK
-- below is its copy in the database and the two must be changed together.

CREATE TABLE IF NOT EXISTS public.monitor_sources (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- The actor's name as the client would say it: "Noticias Caracol", "CAA",
  -- "Marta Ruiz". Not a handle — handles live per network below.
  name        TEXT NOT NULL,
  role        TEXT NOT NULL CHECK (role IN ('press', 'regulator', 'activist', 'competitor', 'partner', 'community')),
  -- Why this one is watched, in the client's words. Shown to whoever inherits
  -- the list, and to the AI as context for what it is looking at.
  note        TEXT,
  -- Whether a post from here counts as amplified, which raises the crisis
  -- level by one. Defaulted from the role, overridable per source.
  amplifies   BOOLEAN NOT NULL DEFAULT true,
  -- false: collect everything they post. true: only what names the company.
  -- A newsroom is read for what it says about you; a regulator is read whole.
  watch_everything BOOLEAN NOT NULL DEFAULT false,
  active      BOOLEAN NOT NULL DEFAULT true,
  created_by  UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS monitor_sources_name_unique
  ON public.monitor_sources (lower(name));

-- One row per network the source is present on. All optional: a source with
-- no accounts at all is legal and appears in the UI as watching nothing yet,
-- which is the honest thing to show rather than an empty success.
CREATE TABLE IF NOT EXISTS public.monitor_source_accounts (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id   UUID NOT NULL REFERENCES public.monitor_sources(id) ON DELETE CASCADE,
  network     TEXT NOT NULL CHECK (network IN ('x', 'instagram', 'facebook', 'tiktok')),
  -- Stored bare: no leading @, so the value reads the same whatever the
  -- platform's punctuation happens to be.
  handle      TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (source_id, network)
);

-- The same handle cannot belong to two sources on one network: a mention has
-- one origin, and provenance would otherwise be a guess.
CREATE UNIQUE INDEX IF NOT EXISTS monitor_source_accounts_handle_unique
  ON public.monitor_source_accounts (network, lower(handle));

CREATE INDEX IF NOT EXISTS monitor_source_accounts_source
  ON public.monitor_source_accounts (source_id);

-- A hashtag or a phrase. Never narrowed to "only when they name us": a crisis
-- hashtag is watched precisely because the company is not named in it yet.
CREATE TABLE IF NOT EXISTS public.monitor_topics (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kind        TEXT NOT NULL CHECK (kind IN ('hashtag', 'phrase')),
  value       TEXT NOT NULL,
  note        TEXT,
  -- A hashtag says nothing about who used it, so by default a topic hit is
  -- not amplified. Anyone can type a hashtag.
  amplifies   BOOLEAN NOT NULL DEFAULT false,
  active      BOOLEAN NOT NULL DEFAULT true,
  created_by  UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS monitor_topics_unique
  ON public.monitor_topics (kind, lower(value));

-- Provenance. A crisis team looking at a mention needs to know why it is in
-- front of them — the product went looking for it on someone's instruction,
-- and until now that instruction was untraceable once the post arrived. Both
-- columns can be set: a post by a watched journalist using a watched hashtag
-- matched twice, and saying so is more useful than picking one.
ALTER TABLE public.social_mentions
  ADD COLUMN IF NOT EXISTS matched_source_id UUID REFERENCES public.monitor_sources(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS matched_topic_id  UUID REFERENCES public.monitor_topics(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS social_mentions_matched_source
  ON public.social_mentions (matched_source_id) WHERE matched_source_id IS NOT NULL;

-- Carry the old list over. Accounts become a source with one account row;
-- hashtags and words become topics. Role cannot be inferred from a handle, so
-- every migrated account lands on 'press' — the commonest reason a client
-- watched an account — and the note records that it needs a second look.
INSERT INTO public.monitor_sources (name, role, note, amplifies, watch_everything, active, created_by, created_at)
SELECT
  w.value,
  'press',
  -- The old label answered "why are you watching this", which is a note, not
  -- a name. The name falls back to the handle, which is at least true; the
  -- client renames it to the actor once they see the list.
  TRIM(BOTH E' \n' FROM COALESCE(NULLIF(w.label, '') || E'\n', '') ||
    'Carried over from the old watchlist — check the name and role are right.'),
  w.amplifies,
  NOT w.only_mentions,
  w.active,
  w.created_by,
  w.created_at
FROM public.monitor_watchlist w
WHERE w.kind = 'account'
ON CONFLICT DO NOTHING;

INSERT INTO public.monitor_source_accounts (source_id, network, handle, created_at)
SELECT s.id, w.network, w.value, w.created_at
FROM public.monitor_watchlist w
JOIN public.monitor_sources s
  ON lower(s.name) = lower(w.value)
WHERE w.kind = 'account'
ON CONFLICT DO NOTHING;

INSERT INTO public.monitor_topics (kind, value, note, amplifies, active, created_by, created_at)
SELECT
  CASE WHEN w.kind = 'hashtag' THEN 'hashtag' ELSE 'phrase' END,
  w.value,
  NULLIF(w.label, ''),
  w.amplifies,
  w.active,
  w.created_by,
  w.created_at
FROM public.monitor_watchlist w
WHERE w.kind IN ('hashtag', 'keyword')
ON CONFLICT DO NOTHING;

-- monitor_watchlist is deliberately left in place, unread by any code after
-- this deploy. Migrations and functions roll out minutes apart across the
-- fleet, and dropping it here would give every client a window where the
-- still-running old monitor queries a table that is gone. It is dropped in a
-- later migration, once every deployment is past this one.
COMMENT ON TABLE public.monitor_watchlist IS
  'Superseded by monitor_sources / monitor_topics (20260923140000). Data carried over; safe to drop once every deployment is past that migration.';

ALTER TABLE public.monitor_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monitor_source_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monitor_topics ENABLE ROW LEVEL SECURITY;

-- Everyone reads: a team looking at a mention needs to see what brought it in.
-- Only admins write: this changes what the product goes looking for and what
-- it treats as amplified, which is a crisis-level decision.
DROP POLICY IF EXISTS "Authenticated can read sources" ON public.monitor_sources;
CREATE POLICY "Authenticated can read sources" ON public.monitor_sources
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Admins manage sources" ON public.monitor_sources;
CREATE POLICY "Admins manage sources" ON public.monitor_sources
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Authenticated can read source accounts" ON public.monitor_source_accounts;
CREATE POLICY "Authenticated can read source accounts" ON public.monitor_source_accounts
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Admins manage source accounts" ON public.monitor_source_accounts;
CREATE POLICY "Admins manage source accounts" ON public.monitor_source_accounts
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Authenticated can read topics" ON public.monitor_topics;
CREATE POLICY "Authenticated can read topics" ON public.monitor_topics
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Admins manage topics" ON public.monitor_topics;
CREATE POLICY "Admins manage topics" ON public.monitor_topics
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));
