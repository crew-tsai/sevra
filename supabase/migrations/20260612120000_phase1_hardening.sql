-- Phase 1: Schema hardening, RBAC completion, and first-admin RPC

-- 1. Repair legacy incident_type values before adding CHECK constraint
UPDATE public.incidents SET incident_type = 'delay'              WHERE incident_type IN ('operational', 'weather');
UPDATE public.incidents SET incident_type = 'safety'             WHERE incident_type IN ('medical', 'security', 'regulatory');
UPDATE public.incidents SET incident_type = 'customer_treatment' WHERE incident_type = 'reputational';
UPDATE public.incidents SET incident_type = 'outage'             WHERE incident_type = 'technical';

-- Guard: set anything still unrecognised to 'safety' so the CHECK never fails unexpectedly
UPDATE public.incidents
SET incident_type = 'safety'
WHERE incident_type NOT IN ('safety', 'delay', 'customer_treatment', 'outage', 'misinformation');

ALTER TABLE public.incidents
  ADD CONSTRAINT ck_incident_type
  CHECK (incident_type IN ('safety', 'delay', 'customer_treatment', 'outage', 'misinformation'));

-- 2. Enforce approval_status values on incidents
-- Repair any legacy 'pending_review' values from older migrations before adding constraint
UPDATE public.incidents SET approval_status = 'pending' WHERE approval_status NOT IN ('pending', 'approved', 'rejected');
ALTER TABLE public.incidents
  ADD CONSTRAINT ck_incident_approval_status
  CHECK (approval_status IN ('pending', 'approved', 'rejected'));

-- 3. Add tags column to incidents
ALTER TABLE public.incidents ADD COLUMN IF NOT EXISTS tags TEXT[] NOT NULL DEFAULT '{}';

-- 4. Enforce channel values on social_mentions
ALTER TABLE public.social_mentions
  ADD CONSTRAINT ck_mention_channel
  CHECK (channel IN ('twitter', 'instagram', 'tiktok', 'facebook', 'reddit', 'news', 'web'));

-- 5. Enforce status values on social_mentions
ALTER TABLE public.social_mentions
  ADD CONSTRAINT ck_mention_status
  CHECK (status IN ('pending', 'analyzing', 'incident_created', 'linked_to_incident', 'dismissed'));

-- 6. Enforce ai_risk values on social_mentions (nullable column)
ALTER TABLE public.social_mentions
  ADD CONSTRAINT ck_mention_ai_risk
  CHECK (ai_risk IS NULL OR ai_risk IN ('critical', 'high', 'medium', 'low'));

-- 7. Fix incident UPDATE RLS: allow creator, admin, or manager to update
DROP POLICY IF EXISTS "Users can update own incidents" ON public.incidents;
DROP POLICY IF EXISTS "Authenticated can update incidents" ON public.incidents;

CREATE POLICY "Creators admins and managers can update incidents"
ON public.incidents
FOR UPDATE TO authenticated
USING (
  auth.uid() = created_by
  OR public.is_admin(auth.uid())
  OR public.has_role(auth.uid(), 'manager')
)
WITH CHECK (
  auth.uid() = created_by
  OR public.is_admin(auth.uid())
  OR public.has_role(auth.uid(), 'manager')
);

-- 8. claim_first_admin(): safe bootstrap RPC replacing the dropped policy
CREATE OR REPLACE FUNCTION public.claim_first_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin') THEN
    RETURN false;
  END IF;
  INSERT INTO public.user_roles (user_id, role)
  VALUES (auth.uid(), 'admin')
  ON CONFLICT (user_id, role) DO NOTHING;
  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.claim_first_admin() TO authenticated;
