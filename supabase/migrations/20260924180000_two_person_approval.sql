-- Make the two approvals actually be two people, and say who they were.
--
-- Two approvals is the product's central promise: it is in the README, in the
-- Help page, and in the facts Agent Stripes reads out. The implementation
-- recorded only the second one — `approved_by` was set on the final step and
-- left null on the first — so who sent a communication forward was never
-- written down. And nothing stopped one administrator doing both halves
-- alone, in two clicks, which is the exact case a two-stage control exists to
-- prevent.
--
-- A claim the record cannot support is worse than no claim, because people
-- rely on it.

ALTER TABLE public.incident_assets
  ADD COLUMN IF NOT EXISTS submitted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ,
  -- True when one person did both halves. Not hidden: a workspace that allows
  -- it should still be able to see which communications went out that way.
  ADD COLUMN IF NOT EXISTS self_approved BOOLEAN NOT NULL DEFAULT false;

-- Some workspaces genuinely are one person. Refusing to let them approve
-- anything would not make the control stronger, it would make the product
-- unusable and teach them to share a login — which is worse than self
-- approval and invisible afterwards.
ALTER TABLE public.company_settings
  ADD COLUMN IF NOT EXISTS allow_self_approval BOOLEAN NOT NULL DEFAULT false;

/**
 * Enforce the separation at the point of approval.
 *
 * In the database rather than the page: the browser holds a key that can talk
 * to PostgREST directly, so a control that lives only in the UI is a
 * suggestion. Server-side callers — the workflow engine, the drafting
 * functions — have no auth.uid() and are unaffected; they cannot approve
 * anything anyway, by design.
 *
 * A single-member workspace is allowed through automatically. There is no
 * second person to ask, and the alternative is a product that cannot send.
 */
CREATE OR REPLACE FUNCTION public.enforce_two_person_approval()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor      UUID := auth.uid();
  allowed    BOOLEAN;
  members    INTEGER;
BEGIN
  -- Only the transition into final approval is governed.
  IF NEW.approval_status IS DISTINCT FROM 'approved'
     OR OLD.approval_status = 'approved' THEN
    RETURN NEW;
  END IF;

  -- Record the first half if it was never captured, so the trail is complete
  -- even for assets approved straight through.
  IF NEW.submitted_by IS NULL THEN
    NEW.submitted_by := OLD.submitted_by;
    NEW.submitted_at := OLD.submitted_at;
  END IF;

  IF actor IS NULL OR NEW.submitted_by IS NULL OR NEW.submitted_by <> actor THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(allow_self_approval, false) INTO allowed FROM public.company_settings LIMIT 1;
  SELECT COUNT(*) INTO members FROM public.team_members;

  IF allowed OR members <= 1 THEN
    -- Permitted, and written down. The point is that it is visible, not that
    -- it is forbidden.
    NEW.self_approved := true;
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'This communication was sent forward by you, so somebody else has to give the final approval.'
    USING ERRCODE = '42501';
END;
$$;

DROP TRIGGER IF EXISTS incident_assets_two_person ON public.incident_assets;
CREATE TRIGGER incident_assets_two_person
  BEFORE UPDATE ON public.incident_assets
  FOR EACH ROW EXECUTE FUNCTION public.enforce_two_person_approval();
