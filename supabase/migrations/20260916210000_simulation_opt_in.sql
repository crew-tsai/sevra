-- Stop fabricating incidents in workspaces that never asked for them.
--
-- social-monitor-cron generates synthetic Instagram and TikTok posts on every
-- run and feeds them through the same analysis that creates real incidents.
-- That was built so a demo has something to show, but it ran unconditionally:
-- a client provisioned this morning with nothing connected had ten incidents
-- by the afternoon, about services and stations that do not exist.
--
-- In a crisis communications tool that is worse than noise. The whole product
-- asks people to trust that what is on the incident board actually happened.
--
-- Default false: a workspace only invents incidents if somebody deliberately
-- turns it on.
ALTER TABLE public.company_settings
  ADD COLUMN IF NOT EXISTS simulation_enabled BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.company_settings.simulation_enabled IS
  'Generate synthetic social mentions for networks with no live connection. Demos only — these become real incident rows and are indistinguishable from genuine ones once created.';
