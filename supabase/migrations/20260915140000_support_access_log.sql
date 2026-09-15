-- Explicit, logged support access.
--
-- Sevra staff could already read a client's whole workspace, because the read
-- policies on incidents/incident_assets/social_mentions are USING (true) — but
-- they did so with accounts holding no role: invisible to the client and
-- leaving no trace. They now hold the 'soporte' role (visible in Admin -> Team
-- & roles) and entering the workspace is recorded where the client can see it.

CREATE TABLE public.support_access_log (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_email  TEXT,
  accessed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_support_access_log_accessed_at
  ON public.support_access_log (accessed_at DESC);

ALTER TABLE public.support_access_log ENABLE ROW LEVEL SECURITY;

-- The client must be able to see this: transparency is the whole point.
CREATE POLICY "Authenticated can view support access" ON public.support_access_log
  FOR SELECT TO authenticated USING (true);

-- No INSERT/UPDATE/DELETE policies. Only the SECURITY DEFINER RPC below
-- writes, and nobody -- support included -- can edit or delete an entry to
-- cover up an access.

-- Records a support user entering the workspace.
--
-- No-ops if the caller doesn't hold the 'soporte' role, so the frontend can
-- call it unconditionally without checking the role first. At most one row per
-- user per hour, so a long session doesn't produce hundreds of rows.
CREATE OR REPLACE FUNCTION public.log_support_access()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles
     WHERE user_id = auth.uid() AND role = 'soporte'
  ) THEN
    RETURN;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.support_access_log
     WHERE user_id = auth.uid()
       AND accessed_at > now() - interval '1 hour'
  ) THEN
    RETURN;
  END IF;

  SELECT email INTO v_email FROM auth.users WHERE id = auth.uid();

  INSERT INTO public.support_access_log (user_id, user_email)
  VALUES (auth.uid(), v_email);
END;
$$;

GRANT EXECUTE ON FUNCTION public.log_support_access() TO authenticated;

-- Sevra staff with access to this deployment.
-- team_members makes them visible to the client's admin in Admin -> Team &
-- roles, and permits registration (the workspace is invite-only).
INSERT INTO public.team_members (email, full_name, role)
VALUES
  ('gavargas@sevra.com', 'Sevra Support', 'soporte'),
  ('roayca@gmail.com',   'Sevra Support', 'soporte')
ON CONFLICT (email) DO UPDATE SET role = EXCLUDED.role;

INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'soporte'
  FROM auth.users u
 WHERE u.email IN ('gavargas@sevra.com', 'roayca@gmail.com')
ON CONFLICT (user_id, role) DO NOTHING;

UPDATE public.team_members tm
   SET user_id = u.id
  FROM auth.users u
 WHERE lower(u.email) = lower(tm.email)
   AND tm.user_id IS NULL;
