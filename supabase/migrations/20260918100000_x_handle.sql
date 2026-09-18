-- Let a workspace be monitored on X before anyone connects an account.
--
-- Monitoring reads *public* posts. X's search endpoint accepts an app-only
-- bearer token, which authorises nothing on anyone's behalf — so watching for
-- mentions never needed the client to authorise anything. It was gated on a
-- connection only because the handle to search for was read off that
-- connection.
--
-- Storing the handle separates the two. A client types their handle in Admin
-- and monitoring starts; connecting an account remains what it should be —
-- the step that lets Sevra *publish as them*, which genuinely does need their
-- consent and comes much later in their life as a customer.
--
-- Nullable: a workspace with only a company name is still monitorable, since
-- the search also matches the company by name.
ALTER TABLE public.company_settings
  ADD COLUMN IF NOT EXISTS x_handle TEXT;

COMMENT ON COLUMN public.company_settings.x_handle IS
  'Public X handle to monitor, with or without the leading @. Independent of any connected account — monitoring uses an app-only token and needs no authorization.';
