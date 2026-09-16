-- Bring response_plan into version control.
--
-- The table exists on the original deployment but in no migration: it was
-- created directly against that database, the same way generate-response-plan
-- was deployed with no source and incidents.approval_status acquired a default
-- its own CHECK rejected. Automated provisioning is what exposed it -- the
-- first client built purely from these migrations came out missing it, so
-- generate-response-plan would have failed on its final upsert.
--
-- Definition mirrors the live table exactly (columns, constraints, policies),
-- so this is a no-op where it already exists and closes the gap everywhere
-- else.
--
-- Two other undocumented tables were found alongside it and are deliberately
-- NOT reproduced here: distribution_lists (the frontend keeps distribution
-- lists in localStorage and never reads it) and raci_assignments (referenced
-- nowhere at all). Copying dead tables into every future client would spread
-- the drift rather than close it.

CREATE TABLE IF NOT EXISTS public.response_plan (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id     UUID NOT NULL UNIQUE REFERENCES public.incidents(id) ON DELETE CASCADE,
  phase_immediate JSONB,
  phase_short     JSONB,
  phase_medium    JSONB,
  phase_long      JSONB,
  generated_by    TEXT,
  created_by      UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.response_plan ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated can read response plans" ON public.response_plan;
CREATE POLICY "Authenticated can read response plans" ON public.response_plan
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Admins and managers can insert response plans" ON public.response_plan;
CREATE POLICY "Admins and managers can insert response plans" ON public.response_plan
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin(auth.uid()) OR public.has_role(auth.uid(), 'manager'::public.app_role));

DROP POLICY IF EXISTS "Admins and managers can update response plans" ON public.response_plan;
CREATE POLICY "Admins and managers can update response plans" ON public.response_plan
  FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid()) OR public.has_role(auth.uid(), 'manager'::public.app_role));

DROP TRIGGER IF EXISTS update_response_plan_updated_at ON public.response_plan;
CREATE TRIGGER update_response_plan_updated_at
  BEFORE UPDATE ON public.response_plan
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
