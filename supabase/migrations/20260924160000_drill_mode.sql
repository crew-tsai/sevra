-- Rehearsal, kept separate from the real thing.
--
-- company_settings.simulation_enabled already existed and defaults to false,
-- for a good reason: the synthetic mentions it produced became ordinary rows,
-- indistinguishable from genuine ones once created. That is not a rehearsal
-- feature, it is a way to poison a client's record, which is why it stays off.
--
-- A drill has to satisfy three things or it is not worth having:
--
--   it must be unmistakable — on screen, in the numbers, in the record;
--   it must not reach the outside world, ever, by any path;
--   it must be removable in one go, leaving nothing behind.
--
-- Comms teams rehearse. A tool they cannot rehearse in is a tool they meet
-- for the first time during the worst hour of their year.

ALTER TABLE public.incidents
  ADD COLUMN IF NOT EXISTS is_drill BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.social_mentions
  ADD COLUMN IF NOT EXISTS is_drill BOOLEAN NOT NULL DEFAULT false;

-- Denormalised onto the asset as well, deliberately. Every guard against a
-- drill reaching the outside world has to be answerable without a join: a
-- publish path that must look up the incident to find out whether it may post
-- is a publish path that will one day be called without doing so.
ALTER TABLE public.incident_assets
  ADD COLUMN IF NOT EXISTS is_drill BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS incidents_drill ON public.incidents (is_drill) WHERE is_drill;
CREATE INDEX IF NOT EXISTS social_mentions_drill ON public.social_mentions (is_drill) WHERE is_drill;

-- Keep the flag true on everything belonging to a drill, whoever inserts it.
-- The UI sets it; this makes it so even when something else does not.
CREATE OR REPLACE FUNCTION public.inherit_drill_flag()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.incident_id IS NOT NULL AND NOT COALESCE(NEW.is_drill, false) THEN
    SELECT COALESCE(i.is_drill, false) INTO NEW.is_drill
      FROM public.incidents i WHERE i.id = NEW.incident_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS incident_assets_inherit_drill ON public.incident_assets;
CREATE TRIGGER incident_assets_inherit_drill
  BEFORE INSERT ON public.incident_assets
  FOR EACH ROW EXECUTE FUNCTION public.inherit_drill_flag();

DROP TRIGGER IF EXISTS social_mentions_inherit_drill ON public.social_mentions;
CREATE TRIGGER social_mentions_inherit_drill
  BEFORE INSERT ON public.social_mentions
  FOR EACH ROW EXECUTE FUNCTION public.inherit_drill_flag();

/**
 * Remove every trace of every drill.
 *
 * One call, because a rehearsal nobody can clean up is a rehearsal nobody runs
 * twice. Cascades handle the assets, mentions, sends, reviews and plans that
 * hang off a drill incident; mentions that were marked as drills without ever
 * opening one are swept separately.
 *
 * Admin only: it deletes, and the audit log records incidents disappearing
 * without being able to say a drill was the reason.
 */
CREATE OR REPLACE FUNCTION public.purge_drills()
RETURNS TABLE (incidents_removed INTEGER, mentions_removed INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  inc_count INTEGER;
  men_count INTEGER;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Only an administrator can clear drill data';
  END IF;

  DELETE FROM public.social_mentions WHERE is_drill AND incident_id IS NULL;
  GET DIAGNOSTICS men_count = ROW_COUNT;

  DELETE FROM public.incidents WHERE is_drill;
  GET DIAGNOSTICS inc_count = ROW_COUNT;

  RETURN QUERY SELECT inc_count, men_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.purge_drills() TO authenticated;
