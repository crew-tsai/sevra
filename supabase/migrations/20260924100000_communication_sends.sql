-- What actually went out, and when.
--
-- The product could say what it had drafted and what had been approved, and
-- nothing at all about what left the building. social-publish posted to X or
-- Facebook and wrote nothing back; there was no published timestamp anywhere.
-- So three questions had no answer:
--
--   what did we say publicly, on which channel, at what time
--   how long did it take us, from the first mention to the first statement
--   did this already go out (a double post during a crisis is its own crisis)
--
-- It also left the product's central promise — two approvals and then a person
-- presses the button — with no evidence that the button was ever pressed.
--
-- Append-only, like incident_audit_log: a record of a send is a record of
-- something irreversible, and a table you can edit is not a record. Email to
-- lists keeps its own delivery detail in email_send_log; this is the ledger of
-- communications leaving, whatever the channel.

CREATE TABLE IF NOT EXISTS public.communication_sends (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- The asset may be deleted (regenerating a package deletes the lot), and
  -- the fact that something went out survives it. incident_id does not: a
  -- send with no incident is not a record of anything.
  asset_id      UUID REFERENCES public.incident_assets(id) ON DELETE SET NULL,
  incident_id   UUID NOT NULL REFERENCES public.incidents(id) ON DELETE CASCADE,
  -- What the asset was at the moment it was sent, kept because asset_id can
  -- go null and "a press release went out at 14:02" must still read.
  asset_title   TEXT,
  asset_type    TEXT,
  channel       TEXT NOT NULL,
  -- 'api': Sevra posted it and the platform confirmed. 'manual': the text was
  -- handed to a person who posted it themselves, on a platform that accepts no
  -- API post, and they said so afterwards. The distinction is the difference
  -- between a fact and somebody's word, and the UI shows which.
  method        TEXT NOT NULL CHECK (method IN ('api', 'manual')),
  destination   TEXT,
  external_id   TEXT,
  external_url  TEXT,
  recipients    INTEGER,
  status        TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'failed')),
  error         TEXT,
  sent_by       UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  sent_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS communication_sends_incident
  ON public.communication_sends (incident_id, sent_at DESC);
CREATE INDEX IF NOT EXISTS communication_sends_asset
  ON public.communication_sends (asset_id);

-- A failed attempt is not a send, and only successful ones count towards "have
-- we already published this". Partial so a retry after a failure is allowed.
CREATE UNIQUE INDEX IF NOT EXISTS communication_sends_once
  ON public.communication_sends (asset_id, channel)
  WHERE status = 'sent' AND asset_id IS NOT NULL;

ALTER TABLE public.communication_sends ENABLE ROW LEVEL SECURITY;

-- Everyone reads: the team needs to know what has gone out before saying
-- anything else.
DROP POLICY IF EXISTS "Authenticated can read sends" ON public.communication_sends;
CREATE POLICY "Authenticated can read sends" ON public.communication_sends
  FOR SELECT TO authenticated USING (true);

-- Anyone may record a send they made; nobody may claim one for someone else.
DROP POLICY IF EXISTS "Authenticated record own sends" ON public.communication_sends;
CREATE POLICY "Authenticated record own sends" ON public.communication_sends
  FOR INSERT TO authenticated
  WITH CHECK (sent_by = auth.uid());

-- No UPDATE and no DELETE policy, deliberately. Service-role callers (the
-- publish function) bypass RLS; everyone else can add to this table and never
-- change it.

/**
 * How long this incident took to reach the public, in seconds.
 *
 * The number crisis communications is judged on, and until now uncomputable:
 * the clock starts when the incident opened and stops at the first successful
 * send. NULL means nothing has gone out yet, which is a different fact from
 * zero and must not be averaged with it.
 */
CREATE OR REPLACE FUNCTION public.time_to_first_send(_incident_id UUID)
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT EXTRACT(EPOCH FROM (MIN(s.sent_at) - i.created_at))::INTEGER
  FROM public.incidents i
  LEFT JOIN public.communication_sends s
    ON s.incident_id = i.id AND s.status = 'sent'
  WHERE i.id = _incident_id
  GROUP BY i.created_at;
$$;

GRANT SELECT ON public.communication_sends TO authenticated;
GRANT INSERT ON public.communication_sends TO authenticated;
GRANT EXECUTE ON FUNCTION public.time_to_first_send(UUID) TO authenticated;
