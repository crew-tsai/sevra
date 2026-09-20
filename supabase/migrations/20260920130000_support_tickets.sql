-- What the client asked Sevra for help with.
--
-- The ticket itself is Sevra's to answer, so the copy that matters lives in the
-- control plane where staff can see every client's requests in one place. This
-- table is the client's own record: what they sent, when, and whether it
-- reached us — so nobody has to wonder whether the message went anywhere.

CREATE TABLE IF NOT EXISTS public.support_tickets (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject      TEXT NOT NULL,
  message      TEXT NOT NULL,
  -- question | problem | request, in the person's own framing.
  category     TEXT NOT NULL DEFAULT 'question'
               CHECK (category IN ('question', 'problem', 'request')),
  -- Where in the app they were when they asked. Saves a round trip.
  page         TEXT,
  created_by   UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_email TEXT,
  -- False when the control plane could not be reached; the ticket still
  -- exists here and can be retried rather than silently lost.
  delivered    BOOLEAN NOT NULL DEFAULT false,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS support_tickets_created_at ON public.support_tickets (created_at DESC);

ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

-- Everyone can ask for help, and everyone can see what their own team sent:
-- a crisis team needs to know a colleague already reported the thing.
DROP POLICY IF EXISTS "Authenticated can read support tickets" ON public.support_tickets;
CREATE POLICY "Authenticated can read support tickets" ON public.support_tickets
  FOR SELECT TO authenticated USING (true);

-- Written by the edge function under the service role, which records who asked.
