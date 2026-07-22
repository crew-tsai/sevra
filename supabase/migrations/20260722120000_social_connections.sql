-- Social network connections (OAuth): one shared, company-wide connection per
-- network (x, instagram, tiktok, facebook), managed from Admin by admins.

CREATE TABLE public.social_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  network TEXT NOT NULL UNIQUE CHECK (network IN ('x', 'instagram', 'tiktok', 'facebook')),
  status TEXT NOT NULL DEFAULT 'disconnected' CHECK (status IN ('connected', 'disconnected', 'error')),
  account_label TEXT,
  account_id TEXT,
  avatar_url TEXT,
  scopes TEXT[],
  token_expires_at TIMESTAMPTZ,
  last_error TEXT,
  connected_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  connected_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.social_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view connections" ON public.social_connections
  FOR SELECT TO authenticated USING (true);
-- No INSERT/UPDATE/DELETE policy for authenticated/anon: only edge functions
-- (via the service-role client, which bypasses RLS) write to this table.

CREATE TRIGGER update_social_connections_updated_at
  BEFORE UPDATE ON public.social_connections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- OAuth tokens, split into their own table with RLS enabled and zero
-- policies: anon/authenticated get nothing, only the service-role key
-- (held only in edge function secrets) can read or write it.
CREATE TABLE public.social_connection_tokens (
  connection_id UUID PRIMARY KEY REFERENCES public.social_connections(id) ON DELETE CASCADE,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.social_connection_tokens ENABLE ROW LEVEL SECURITY;

-- Short-lived OAuth state/PKCE storage for the authorize -> callback round
-- trip. Same zero-policy, service-role-only pattern as the tokens table.
CREATE TABLE public.oauth_states (
  state TEXT PRIMARY KEY,
  network TEXT NOT NULL,
  code_verifier TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT now() + interval '10 minutes'
);

ALTER TABLE public.oauth_states ENABLE ROW LEVEL SECURITY;

-- Seed the four network rows so the Admin UI has something to render
-- immediately, before any connection has ever been made.
INSERT INTO public.social_connections (network) VALUES
  ('x'), ('instagram'), ('tiktok'), ('facebook')
ON CONFLICT (network) DO NOTHING;
