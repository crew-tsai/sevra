-- Remember which redirect_uri an OAuth flow started with.
--
-- The token exchange must present the same redirect_uri the authorize request
-- used, or the provider rejects it. Until now that was always this project's
-- own callback, so it could be recomputed. With Sevra's shared apps the
-- authorize request goes through one central relay on the control plane —
-- registered once on the Meta and X apps instead of once per client project —
-- and the callback has to know which one this particular flow used.
--
-- Storing it on the state row is exact where recomputing would be a guess.
ALTER TABLE public.oauth_states
  ADD COLUMN IF NOT EXISTS redirect_uri TEXT;
