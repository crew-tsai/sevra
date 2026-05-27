
-- 1. incident_assets: restrict mutations to owner or admin
DROP POLICY IF EXISTS "Authenticated can update assets" ON public.incident_assets;
DROP POLICY IF EXISTS "Authenticated can delete assets" ON public.incident_assets;
DROP POLICY IF EXISTS "Authenticated can create assets" ON public.incident_assets;

CREATE POLICY "Users can create assets"
ON public.incident_assets
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Owners or admins can update assets"
ON public.incident_assets
FOR UPDATE TO authenticated
USING (auth.uid() = created_by OR public.is_admin(auth.uid()))
WITH CHECK (auth.uid() = created_by OR public.is_admin(auth.uid()));

CREATE POLICY "Owners or admins can delete assets"
ON public.incident_assets
FOR DELETE TO authenticated
USING (auth.uid() = created_by OR public.is_admin(auth.uid()));

-- 2. incident_audit_log: tighten insert
DROP POLICY IF EXISTS "Authenticated can insert audit log" ON public.incident_audit_log;
CREATE POLICY "Authenticated can insert audit log"
ON public.incident_audit_log
FOR INSERT TO authenticated
WITH CHECK (changed_by IS NULL OR auth.uid() = changed_by);

-- 3. team_members: restrict SELECT to admins or self
DROP POLICY IF EXISTS "Authenticated can view team" ON public.team_members;
CREATE POLICY "Admins or self can view team"
ON public.team_members
FOR SELECT TO authenticated
USING (public.is_admin(auth.uid()) OR auth.uid() = user_id);

-- 4. leads: only admins can view
DROP POLICY IF EXISTS "Authenticated can view leads" ON public.leads;
CREATE POLICY "Admins can view leads"
ON public.leads
FOR SELECT TO authenticated
USING (public.is_admin(auth.uid()));

-- 5. user_roles: remove first-admin bootstrap escalation path
DROP POLICY IF EXISTS "First user can claim admin" ON public.user_roles;

-- 6. Lock down internal queue helpers and set search_path
REVOKE EXECUTE ON FUNCTION public.delete_email(text, bigint) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enqueue_email(text, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.read_email_batch(text, integer, integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb) FROM PUBLIC, anon, authenticated;

ALTER FUNCTION public.delete_email(text, bigint) SET search_path = public, pgmq;
ALTER FUNCTION public.enqueue_email(text, jsonb) SET search_path = public, pgmq;
ALTER FUNCTION public.read_email_batch(text, integer, integer) SET search_path = public, pgmq;
ALTER FUNCTION public.move_to_dlq(text, text, bigint, jsonb) SET search_path = public, pgmq;
ALTER FUNCTION public.update_updated_at_column() SET search_path = public;

-- 7. Realtime authorization: only authenticated users can subscribe
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated can read realtime messages" ON realtime.messages;
CREATE POLICY "Authenticated can read realtime messages"
ON realtime.messages
FOR SELECT TO authenticated
USING (true);
