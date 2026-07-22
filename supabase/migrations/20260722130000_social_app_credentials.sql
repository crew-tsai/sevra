-- Per-network OAuth app credentials (Client ID/Secret), entered by the
-- client's own admin in Admin -> Social connections, instead of requiring
-- someone with Supabase CLI/dashboard access to run `supabase secrets set`.

CREATE TABLE public.social_app_credentials (
  network TEXT PRIMARY KEY CHECK (network IN ('x', 'instagram', 'tiktok', 'facebook')),
  client_id TEXT NOT NULL,
  client_secret TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

ALTER TABLE public.social_app_credentials ENABLE ROW LEVEL SECURITY;
-- No policies at all: only the service-role client inside edge functions can
-- read or write this table. A client_secret must never reach the browser,
-- not even for the admin who saved it — same trust boundary already used
-- for social_connection_tokens/oauth_states.
