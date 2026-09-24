-- Keeping the promise the privacy policy already made.
--
-- The legal page tells a member of the public they can ask for their personal
-- information to be deleted, and that if it sits in a client's workspace Sevra
-- will pass the request on and help that client answer it.
--
-- Meanwhile social_mentions holds the name, handle, avatar and full post text
-- of people who never signed up to anything, for as long as the workspace
-- exists. There was no retention limit, no way to find someone by handle, and
-- no way to delete them. A client receiving an erasure request could not
-- honour it and Sevra could not help. That is a written commitment the code
-- could not keep.
--
-- Two things, because they answer different questions. Retention answers "why
-- do you still have this at all", and erasure answers "delete mine".

ALTER TABLE public.company_settings
  -- NULL means keep indefinitely, which is a choice a client may legitimately
  -- make and must therefore be able to express. It is not the default.
  ADD COLUMN IF NOT EXISTS mention_retention_days INTEGER
    CHECK (mention_retention_days IS NULL OR mention_retention_days BETWEEN 30 AND 3650);

-- Twelve months: long enough to cover an annual review and a slow-moving
-- regulatory matter, short enough that nobody is holding a stranger's posts
-- for years because nobody chose a number.
UPDATE public.company_settings SET mention_retention_days = 365 WHERE mention_retention_days IS NULL;

/**
 * Delete mentions nobody needs any more.
 *
 * Only mentions that never became part of an incident. One attached to an
 * incident is part of the record of a crisis — the thing the audit log, the
 * after-action review and quite possibly a regulator depend on — and deleting
 * it silently because a timer expired would destroy evidence.
 *
 * Runs from the monitor's own schedule rather than a new cron job, so it
 * cannot be the thing that stops running without anybody noticing.
 */
CREATE OR REPLACE FUNCTION public.expire_old_mentions()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  keep_days INTEGER;
  removed   INTEGER;
BEGIN
  SELECT mention_retention_days INTO keep_days FROM public.company_settings LIMIT 1;
  IF keep_days IS NULL THEN
    RETURN 0;
  END IF;

  DELETE FROM public.social_mentions
   WHERE incident_id IS NULL
     AND created_at < now() - make_interval(days => keep_days);
  GET DIAGNOSTICS removed = ROW_COUNT;
  RETURN removed;
END;
$$;

/**
 * An erasure request, for one person.
 *
 * Finds every mention by a handle and removes the personal parts. Two modes,
 * because the right answer differs:
 *
 *   'delete'  — the mention goes entirely. Correct when it is not attached to
 *               anything.
 *   'redact'  — the author's name, handle, avatar and the post text are
 *               cleared, and the row stays, because the incident it belongs to
 *               is a record of something that happened and the count of
 *               mentions in it must not silently change.
 *
 * Redaction is applied to anything attached to an incident, whatever was
 * asked for, and the caller is told how many were redacted rather than
 * deleted, so the person answering the request can say so honestly.
 *
 * Admin only, and every use is written to the audit trail by the caller.
 */
CREATE OR REPLACE FUNCTION public.erase_author(_handle TEXT)
RETURNS TABLE (deleted INTEGER, redacted INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  clean TEXT := lower(regexp_replace(COALESCE(_handle, ''), '^@', ''));
  del_count INTEGER;
  red_count INTEGER;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Only an administrator can act on an erasure request';
  END IF;
  IF clean = '' THEN
    RAISE EXCEPTION 'A handle is required';
  END IF;

  UPDATE public.social_mentions
     SET author_name = NULL,
         author_handle = NULL,
         author_avatar_url = NULL,
         content = '[removed at the author''s request]',
         ai_summary = NULL,
         translations = NULL,
         post_url = NULL
   WHERE incident_id IS NOT NULL
     AND lower(regexp_replace(COALESCE(author_handle, ''), '^@', '')) = clean;
  GET DIAGNOSTICS red_count = ROW_COUNT;

  DELETE FROM public.social_mentions
   WHERE incident_id IS NULL
     AND lower(regexp_replace(COALESCE(author_handle, ''), '^@', '')) = clean;
  GET DIAGNOSTICS del_count = ROW_COUNT;

  RETURN QUERY SELECT del_count, red_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.expire_old_mentions() TO service_role;
GRANT EXECUTE ON FUNCTION public.erase_author(TEXT) TO authenticated;
