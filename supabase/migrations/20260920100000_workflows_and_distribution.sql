-- Workflows, and the distribution config they act on.
--
-- Both existed on screen without existing anywhere else. The Workflows page
-- kept the admin's rules in React state seeded with two demo rules, so a rule
-- survived until the next refresh and no part of the backend had ever read
-- one. Email lists and the responsibility matrix were kept in localStorage, so
-- they were per-browser, invisible to the rest of the team and unreadable by
-- any edge function — which is why a rule could not have notified anyone even
-- if rules had run.
--
-- The rule engine runs server side (see _shared/workflows.ts), because a rule
-- has to fire when a crisis is detected at 3am with nobody signed in.

-- ---------------------------------------------------------------------------
-- Rules
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.workflows (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name              TEXT NOT NULL,
  enabled           BOOLEAN NOT NULL DEFAULT true,
  -- Matching. incident_type and sub_type are the product's own values (see
  -- _shared/industries.ts); NULL means "any".
  incident_type     TEXT,
  sub_type          TEXT,
  min_crisis_level  SMALLINT NOT NULL DEFAULT 0 CHECK (min_crisis_level BETWEEN 0 AND 4),
  -- [{field, op, value}] over incident columns, all of which must pass.
  criteria          JSONB NOT NULL DEFAULT '[]'::jsonb,
  -- [{type, detail}]. Types the engine carries out: draft_package, notify,
  -- set_status, lock_public, log_only. Publishing is deliberately absent —
  -- nothing leaves this workspace without a person approving it.
  actions           JSONB NOT NULL DEFAULT '[]'::jsonb,
  next_status       TEXT CHECK (next_status IS NULL OR next_status IN ('active', 'monitoring', 'contained', 'resolved')),
  created_by        UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.workflows ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated can read workflows" ON public.workflows;
CREATE POLICY "Authenticated can read workflows" ON public.workflows
  FOR SELECT TO authenticated USING (true);

-- Rules decide what Sevra does by itself, so only an administrator writes them.
DROP POLICY IF EXISTS "Admins manage workflows" ON public.workflows;
CREATE POLICY "Admins manage workflows" ON public.workflows
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

DROP TRIGGER IF EXISTS update_workflows_updated_at ON public.workflows;
CREATE TRIGGER update_workflows_updated_at
  BEFORE UPDATE ON public.workflows
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------------------------------------------------------------------------
-- What a rule did, and the guarantee that it does it once
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.workflow_runs (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id  UUID NOT NULL REFERENCES public.workflows(id) ON DELETE CASCADE,
  incident_id  UUID NOT NULL REFERENCES public.incidents(id) ON DELETE CASCADE,
  fired_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- What was carried out, and anything that failed, for the audit trail.
  result       JSONB NOT NULL DEFAULT '{}'::jsonb
);

-- The claim: one row per rule per incident. An escalating crisis produces
-- several mentions and several analyses; the rule still fires once.
CREATE UNIQUE INDEX IF NOT EXISTS workflow_runs_once
  ON public.workflow_runs (workflow_id, incident_id);

ALTER TABLE public.workflow_runs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated can read workflow runs" ON public.workflow_runs;
CREATE POLICY "Authenticated can read workflow runs" ON public.workflow_runs
  FOR SELECT TO authenticated USING (true);
-- Written only by the engine, which runs with the service role.

-- ---------------------------------------------------------------------------
-- Distribution: who gets told
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.email_lists (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  emails      TEXT[] NOT NULL DEFAULT '{}',
  created_by  UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.email_lists ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated can read email lists" ON public.email_lists;
CREATE POLICY "Authenticated can read email lists" ON public.email_lists
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Admins manage email lists" ON public.email_lists;
CREATE POLICY "Admins manage email lists" ON public.email_lists
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

DROP TRIGGER IF EXISTS update_email_lists_updated_at ON public.email_lists;
CREATE TRIGGER update_email_lists_updated_at
  BEFORE UPDATE ON public.email_lists
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Who is responsible, accountable, consulted or informed for each kind of
-- communication. One row per (communication, level, list).
CREATE TABLE IF NOT EXISTS public.responsibility_matrix (
  asset_type  TEXT NOT NULL,
  level       TEXT NOT NULL CHECK (level IN ('responsible', 'accountable', 'consulted', 'informed')),
  list_id     UUID NOT NULL REFERENCES public.email_lists(id) ON DELETE CASCADE,
  PRIMARY KEY (asset_type, level, list_id)
);

ALTER TABLE public.responsibility_matrix ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated can read responsibility matrix" ON public.responsibility_matrix;
CREATE POLICY "Authenticated can read responsibility matrix" ON public.responsibility_matrix
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Admins manage responsibility matrix" ON public.responsibility_matrix;
CREATE POLICY "Admins manage responsibility matrix" ON public.responsibility_matrix
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- What a list is for, in the admin's own words. The editor has always shown a
-- description; it had nowhere to live while lists were browser storage.
ALTER TABLE public.email_lists ADD COLUMN IF NOT EXISTS description TEXT;
