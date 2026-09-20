-- Sevra's promise is that a crisis arrives with its communications already
-- drafted. Until now the package was only written when a person opened the
-- incident and pressed Approve, so a crisis detected at 3am was a headline with
-- an empty package underneath it.
--
-- Two things were missing: a level to decide on, and somewhere to say at which
-- level drafting should start.

-- The level above which the monitor drafts the package by itself. NULL turns
-- the automation off; a workspace that wants nothing drafted until a person
-- asks sets it to NULL rather than to a level nothing reaches.
ALTER TABLE public.company_settings
  ADD COLUMN IF NOT EXISTS auto_package_level smallint DEFAULT 3;

UPDATE public.company_settings SET auto_package_level = 3 WHERE auto_package_level IS NULL;

ALTER TABLE public.company_settings
  DROP CONSTRAINT IF EXISTS company_settings_auto_package_level_check;
ALTER TABLE public.company_settings
  ADD CONSTRAINT company_settings_auto_package_level_check
  CHECK (auto_package_level IS NULL OR auto_package_level BETWEEN 1 AND 4);

COMMENT ON COLUMN public.company_settings.auto_package_level IS
  'Draft the communication package automatically for incidents at or above this crisis level (1-4). NULL = only on request.';

-- The uploaded communications manual, as text the AI can read. Extracting a
-- PDF is slow and the manual changes about once a year, so the extraction is
-- cached here and redone only when the file behind it changes.
ALTER TABLE public.company_settings
  ADD COLUMN IF NOT EXISTS comms_manual_text text;
ALTER TABLE public.company_settings
  ADD COLUMN IF NOT EXISTS comms_manual_text_source text;

COMMENT ON COLUMN public.company_settings.comms_manual_text IS
  'Text extracted from comms_manual_url, used to ground generated communications.';
COMMENT ON COLUMN public.company_settings.comms_manual_text_source IS
  'The comms_manual_url the cached text was extracted from; a different value means re-extract.';

-- One package per incident, even when two mentions of the same crisis arrive in
-- the same monitoring run. Claiming this column with a conditional UPDATE is
-- what makes the drafting request exclusive; without it the second mention
-- regenerates the package and deletes the first one — including anything a
-- person had already approved.
ALTER TABLE public.incidents
  ADD COLUMN IF NOT EXISTS package_requested_at timestamptz;

COMMENT ON COLUMN public.incidents.package_requested_at IS
  'When a communication package was first requested for this incident. Claimed atomically so it is only ever drafted once.';

-- Incidents that already have a package predate the column; mark them so an
-- automatic request never overwrites them.
UPDATE public.incidents i
SET package_requested_at = COALESCE(i.updated_at, now())
WHERE i.package_requested_at IS NULL
  AND EXISTS (SELECT 1 FROM public.incident_assets a WHERE a.incident_id = i.id);
