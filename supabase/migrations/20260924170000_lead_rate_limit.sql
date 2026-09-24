-- A limit on the one table strangers can write to.
--
-- `leads` carries an "Anyone can submit a lead" INSERT policy, which is
-- correct — it is a public contact form — and until now it was the only thing
-- standing between the internet and unbounded rows in a client's database.
-- Nothing rate-limited it, nothing deduplicated it, and the table is read by
-- staff, so filling it is both a storage problem and a way to bury real
-- enquiries under noise.
--
-- Enforced in the database rather than in the page, because the page is not
-- what an abuser uses. The anonymous key is published in the bundle by design;
-- anybody can POST to PostgREST with it.
--
-- Deliberately generous. A real person who mistypes their email and submits
-- three times in a minute must still get through, so the limit is set where
-- only automation reaches it.

CREATE OR REPLACE FUNCTION public.limit_lead_submissions()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  from_email INTEGER;
  overall    INTEGER;
BEGIN
  -- Same address, repeatedly. The commonest real case is a person submitting
  -- twice; five in an hour is not a person.
  SELECT COUNT(*) INTO from_email
    FROM public.leads
   WHERE lower(email) = lower(NEW.email)
     AND created_at > now() - INTERVAL '1 hour';

  IF from_email >= 5 THEN
    RAISE EXCEPTION 'Too many submissions from this address. Please try again later.'
      USING ERRCODE = '53400';
  END IF;

  -- A ceiling for the whole form, which catches the case the per-address limit
  -- cannot: a script that varies the address on every request. Set well above
  -- any plausible hour of genuine interest, so it only ever fires on abuse.
  SELECT COUNT(*) INTO overall
    FROM public.leads
   WHERE created_at > now() - INTERVAL '1 hour';

  IF overall >= 100 THEN
    RAISE EXCEPTION 'The contact form is temporarily unavailable. Please email us directly.'
      USING ERRCODE = '53400';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS leads_rate_limit ON public.leads;
CREATE TRIGGER leads_rate_limit
  BEFORE INSERT ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.limit_lead_submissions();

-- Makes both counts an index scan rather than a table scan on every submission.
CREATE INDEX IF NOT EXISTS leads_recent ON public.leads (created_at DESC);
CREATE INDEX IF NOT EXISTS leads_by_email ON public.leads (lower(email), created_at DESC);
