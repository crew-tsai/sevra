-- Let a client set their own email sending domain from the app.
--
-- The sending domain lived only in an environment variable, so changing it
-- meant someone at Sevra running `supabase secrets set` against that client's
-- project. That put a DNS-and-deployment task between a comms team and the
-- ability to send from their own name — the same shape of problem as asking
-- them to register a Facebook Developer app.
--
-- Storing it here makes it settable from Admin. The environment variable still
-- wins when present, so an existing deployment configured by hand keeps
-- behaving exactly as it did.
--
-- Status mirrors the provider's view and is advisory: mail only sends from
-- this domain once the provider reports it verified, because sending from an
-- unverified domain fails at the provider rather than degrading politely.
ALTER TABLE public.company_settings
  ADD COLUMN IF NOT EXISTS sending_domain TEXT,
  ADD COLUMN IF NOT EXISTS sending_domain_status TEXT
    CHECK (sending_domain_status IN ('pending', 'verified', 'failed')),
  ADD COLUMN IF NOT EXISTS sending_domain_records JSONB;

COMMENT ON COLUMN public.company_settings.sending_domain IS
  'Verified subdomain this workspace sends from, e.g. notify.acme.com. Never the root domain: root MX records usually belong to the customer''s own mail provider.';
