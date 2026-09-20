-- The person who owns the workspace belongs in its team.
--
-- Everyone invited through Admin gets a team_members row, and handle_new_user
-- links it to their account when they sign up. The first administrator arrives
-- the other way round — they claim the role through claim_first_admin — and
-- nobody ever created a row for them. So the workspace owner was missing from
-- their own Team & roles list, and the audit log, which resolves a user id
-- through team_members, could only say "A person" about the one person it
-- should have been able to name.

CREATE OR REPLACE FUNCTION public.claim_first_admin()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email       text;
  v_admin_email text;
BEGIN
  IF EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin') THEN
    RETURN 'already_claimed';
  END IF;

  SELECT bootstrap_admin_email INTO v_admin_email FROM public.bootstrap_config WHERE id = 1;
  IF v_admin_email IS NULL THEN
    RETURN 'not_configured';
  END IF;

  SELECT email INTO v_email FROM auth.users WHERE id = auth.uid();
  IF v_email IS NULL OR lower(v_email) <> lower(v_admin_email) THEN
    RETURN 'not_authorized';
  END IF;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (auth.uid(), 'admin')
  ON CONFLICT (user_id, role) DO NOTHING;

  -- An invitation may already exist for this address, in which case it is
  -- linked rather than duplicated.
  UPDATE public.team_members
     SET user_id = auth.uid(),
         role    = 'admin'
   WHERE lower(email) = lower(v_email)
     AND (user_id IS NULL OR user_id = auth.uid());

  IF NOT FOUND THEN
    INSERT INTO public.team_members (email, full_name, role, user_id)
    VALUES (v_email, split_part(v_email, '@', 1), 'admin', auth.uid());
  END IF;

  RETURN 'claimed';
END;
$$;

-- Backfill: anyone holding a role in this workspace who has no team record.
-- Their name is unknown, so the local part of the address stands in until they
-- or an administrator sets one.
INSERT INTO public.team_members (email, full_name, role, user_id)
SELECT u.email, split_part(u.email, '@', 1), r.role, u.id
FROM (
  SELECT DISTINCT ON (user_id) user_id, role
  FROM public.user_roles
  ORDER BY user_id,
           CASE role::text
             WHEN 'admin' THEN 1
             WHEN 'coordinador' THEN 2
             WHEN 'manager' THEN 3
             WHEN 'ejecutivo' THEN 4
             ELSE 5
           END
) r
JOIN auth.users u ON u.id = r.user_id
WHERE u.email IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.team_members t
    WHERE t.user_id = u.id OR lower(t.email) = lower(u.email)
  );

-- And link any invitation whose person has since signed up but whose row was
-- never connected to the account.
UPDATE public.team_members t
SET user_id = u.id
FROM auth.users u
WHERE t.user_id IS NULL
  AND lower(t.email) = lower(u.email);
