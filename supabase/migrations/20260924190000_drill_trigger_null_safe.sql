-- Harden inherit_drill_flag against a lookup that finds nothing.
--
-- `SELECT ... INTO` leaves the target NULL when no row matches, and is_drill
-- is NOT NULL, so the insert failed with a constraint error that named the
-- wrong problem. In normal use the foreign key guarantees the incident exists
-- — but a BEFORE trigger runs before that key is checked, so the first thing
-- anyone inserting a bad incident_id saw was a confusing NOT NULL violation
-- on a column they had never heard of instead of the foreign key error that
-- actually described their mistake.
--
-- Found by testing the separation-of-duties trigger, not by a client hitting
-- it, which is the only reason it is a footnote rather than an incident.

CREATE OR REPLACE FUNCTION public.inherit_drill_flag()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  parent BOOLEAN;
BEGIN
  IF NEW.incident_id IS NOT NULL AND NOT COALESCE(NEW.is_drill, false) THEN
    SELECT i.is_drill INTO parent FROM public.incidents i WHERE i.id = NEW.incident_id;
    -- COALESCE outside the SELECT, not inside it: inside, it only defends
    -- against a NULL column, and the case that bit was no row at all.
    NEW.is_drill := COALESCE(parent, false);
  END IF;
  RETURN NEW;
END;
$$;
