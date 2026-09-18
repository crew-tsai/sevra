-- Filling in a translation is not an edit.
--
-- Records are translated the first time someone views them in the other
-- language. Without this, that write bumped updated_at: an incident nobody had
-- touched in a week read "Updated just now" and jumped to the top of lists
-- sorted by recency, simply because someone switched language.
--
-- Shared by every table's updated_at trigger. On tables with no
-- `translations` column the subtraction is a no-op and nothing changes.
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  IF (to_jsonb(NEW) - 'translations' - 'updated_at') = (to_jsonb(OLD) - 'translations' - 'updated_at') THEN
    NEW.updated_at = OLD.updated_at;
  ELSE
    NEW.updated_at = now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;
