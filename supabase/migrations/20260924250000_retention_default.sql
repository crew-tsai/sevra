-- Give retention a default, so a client created tomorrow gets one.
--
-- 20260924200000 added mention_retention_days with no column default and
-- backfilled 365 into the existing row. That is correct for a workspace that
-- already exists and wrong for every one that does not yet: no migration
-- seeds company_settings — the row is created by the app the first time an
-- administrator saves the company profile, which happens long after the
-- migrations have run. The backfill would touch nothing, the new row would
-- take the column default of NULL, and NULL means keep indefinitely.
--
-- So every client provisioned from now on would quietly have kept the names,
-- handles and words of members of the public forever, which is the exact
-- opposite of what that migration was for. The kind of thing nobody notices
-- until somebody asks a question with a lawyer attached.

ALTER TABLE public.company_settings
  ALTER COLUMN mention_retention_days SET DEFAULT 365;

-- And catch the workspace that already got it wrong, if any.
UPDATE public.company_settings
   SET mention_retention_days = 365
 WHERE mention_retention_days IS NULL;
