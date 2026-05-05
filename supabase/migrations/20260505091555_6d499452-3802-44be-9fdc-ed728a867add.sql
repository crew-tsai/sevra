-- Roles
CREATE TYPE public.app_role AS ENUM ('admin', 'coordinador', 'manager', 'ejecutivo');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'admin')
$$;

CREATE POLICY "Users can view their own roles" ON public.user_roles
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all roles" ON public.user_roles
  FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "Admins can insert roles" ON public.user_roles
  FOR INSERT TO authenticated WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Admins can update roles" ON public.user_roles
  FOR UPDATE TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "Admins can delete roles" ON public.user_roles
  FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));

-- Bootstrap: if no admin exists, allow first authenticated user to claim admin
CREATE POLICY "First user can claim admin" ON public.user_roles
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND role = 'admin'
    AND NOT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin')
  );

-- Company settings (singleton)
CREATE TABLE public.company_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  singleton BOOLEAN NOT NULL DEFAULT true UNIQUE,
  company_name TEXT,
  industry TEXT,
  comms_manual_url TEXT,
  comms_manual_name TEXT,
  logo_url TEXT,
  brand_primary TEXT,
  brand_secondary TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view settings" ON public.company_settings
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can insert settings" ON public.company_settings
  FOR INSERT TO authenticated WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Admins can update settings" ON public.company_settings
  FOR UPDATE TO authenticated USING (public.is_admin(auth.uid()));

CREATE TRIGGER update_company_settings_updated_at
  BEFORE UPDATE ON public.company_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Team members (invite by email, assign role before signup)
CREATE TABLE public.team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  full_name TEXT,
  role app_role NOT NULL,
  invited_by UUID REFERENCES auth.users(id),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view team" ON public.team_members
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can insert team" ON public.team_members
  FOR INSERT TO authenticated WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Admins can update team" ON public.team_members
  FOR UPDATE TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "Admins can delete team" ON public.team_members
  FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));

CREATE TRIGGER update_team_members_updated_at
  BEFORE UPDATE ON public.team_members
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Storage buckets
INSERT INTO storage.buckets (id, name, public) VALUES ('branding', 'branding', true)
  ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('manuals', 'manuals', false)
  ON CONFLICT (id) DO NOTHING;

-- Branding policies (public read, admin write)
CREATE POLICY "Branding public read" ON storage.objects
  FOR SELECT USING (bucket_id = 'branding');
CREATE POLICY "Admins can upload branding" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'branding' AND public.is_admin(auth.uid()));
CREATE POLICY "Admins can update branding" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'branding' AND public.is_admin(auth.uid()));
CREATE POLICY "Admins can delete branding" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'branding' AND public.is_admin(auth.uid()));

-- Manuals policies (authenticated read, admin write)
CREATE POLICY "Authenticated can read manuals" ON storage.objects
  FOR SELECT TO authenticated USING (bucket_id = 'manuals');
CREATE POLICY "Admins can upload manuals" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'manuals' AND public.is_admin(auth.uid()));
CREATE POLICY "Admins can update manuals" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'manuals' AND public.is_admin(auth.uid()));
CREATE POLICY "Admins can delete manuals" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'manuals' AND public.is_admin(auth.uid()));