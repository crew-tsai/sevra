-- Secure per-company onboarding.
--
-- Sevra runs one deployment per client, so data is already isolated at the
-- database level. What was not controlled was who gets INTO a given
-- company's workspace:
--
--   1. claim_first_admin() was a land-grab - whoever signed up first and
--      reached /admin became that company's admin.
--   2. Admin -> Team & roles wrote to team_members, but nothing ever read it
--      for authorization, so invited people signed up with no role at all.
--   3. Signup was fully open, and incidents/incident_assets/social_mentions
--      are readable by any authenticated user - so a stranger with the URL
--      could register and read unpublished crisis communications.
--
-- This migration makes signup invite-only, makes invites grant real roles,
-- and locks the admin claim to an email designated at provisioning time.

-- ---------------------------------------------------------------------------
-- Bootstrap config: which email is allowed to claim admin on this deployment.
-- Single row, service-role only (zero policies), same pattern as
-- social_app_credentials.
-- ---------------------------------------------------------------------------
CREATE TABLE public.bootstrap_config (
  id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  bootstrap_admin_email TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.bootstrap_config (id) VALUES (1) ON CONFLICT DO NOTHING;

ALTER TABLE public.bootstrap_config ENABLE ROW LEVEL SECURITY;
-- No policies on purpose: only the service role and the SECURITY DEFINER
-- functions below ever read this table.

-- ---------------------------------------------------------------------------
-- Invite-only signup.
--
-- Enforced as a BEFORE INSERT trigger on auth.users so it cannot be bypassed
-- by calling the auth API directly. Fails closed: until a provisioning step
-- sets bootstrap_admin_email (and/or an admin invites someone), nobody can
-- register. That is what prevents the admin land-grab on a fresh deployment.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.enforce_invite_only_signup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_email text;
BEGIN
  SELECT bootstrap_admin_email INTO v_admin_email FROM public.bootstrap_config WHERE id = 1;

  -- The administrator designated for this deployment at provisioning time.
  IF v_admin_email IS NOT NULL AND lower(NEW.email) = lower(v_admin_email) THEN
    RETURN NEW;
  END IF;

  -- Anyone an existing admin invited from Admin -> Team & roles.
  IF EXISTS (SELECT 1 FROM public.team_members WHERE lower(email) = lower(NEW.email)) THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'This Sevra workspace is invite-only.'
    USING ERRCODE = 'check_violation';
END;
$$;

CREATE TRIGGER enforce_invite_only_signup_trigger
  BEFORE INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.enforce_invite_only_signup();

-- ---------------------------------------------------------------------------
-- Grant the invited role on signup.
--
-- team_members.user_id has existed since the table was created but was never
-- populated, and no user_roles row was ever created for invitees.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role app_role;
BEGIN
  SELECT role INTO v_role
    FROM public.team_members
   WHERE lower(email) = lower(NEW.email)
   LIMIT 1;

  IF v_role IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, v_role)
    ON CONFLICT (user_id, role) DO NOTHING;

    UPDATE public.team_members
       SET user_id = NEW.id
     WHERE lower(email) = lower(NEW.email)
       AND user_id IS NULL;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- One-time backfill: people who were invited AND had already signed up never
-- received their role, because the trigger above did not exist yet.
INSERT INTO public.user_roles (user_id, role)
SELECT u.id, tm.role
  FROM public.team_members tm
  JOIN auth.users u ON lower(u.email) = lower(tm.email)
ON CONFLICT (user_id, role) DO NOTHING;

UPDATE public.team_members tm
   SET user_id = u.id
  FROM auth.users u
 WHERE lower(u.email) = lower(tm.email)
   AND tm.user_id IS NULL;

-- ---------------------------------------------------------------------------
-- Lock the admin claim to the designated email.
--
-- DROP + CREATE rather than CREATE OR REPLACE because the return type changes
-- from boolean to text, so the UI can explain *why* a claim failed.
-- ---------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.claim_first_admin();

CREATE FUNCTION public.claim_first_admin()
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

  RETURN 'claimed';
END;
$$;

GRANT EXECUTE ON FUNCTION public.claim_first_admin() TO authenticated;
