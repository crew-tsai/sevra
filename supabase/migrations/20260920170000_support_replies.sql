-- Sevra's answer, where the person who asked will look for it.
--
-- A reply used to exist in two places the asker cannot see: the control plane,
-- and whatever inbox the email landed in. So the Help page showed a question
-- with no answer under it, and anyone who asked from a shared address — or
-- whose colleague asked — had no way to know it had been answered at all.
--
-- Written by support-reply-inbox under the service role, which authenticates
-- the control plane with the shared deployment secret rather than a JWT.

CREATE TABLE IF NOT EXISTS public.support_replies (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id  UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  -- The control plane's id for this reply. A redelivery is the same answer,
  -- not a second one.
  console_reply_id UUID NOT NULL,
  body       TEXT NOT NULL,
  -- Who it is from, as the client should see it. Sevra answers as Sevra.
  from_name  TEXT NOT NULL DEFAULT 'Sevra support',
  -- When it was written in the control plane, not when it arrived here.
  sent_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS support_replies_console_id
  ON public.support_replies (console_reply_id);

CREATE INDEX IF NOT EXISTS support_replies_ticket
  ON public.support_replies (ticket_id, created_at);

ALTER TABLE public.support_replies ENABLE ROW LEVEL SECURITY;

-- The same readership as the tickets themselves: the whole team. A crisis team
-- sharing one account of what Sevra said is the point.
DROP POLICY IF EXISTS "Authenticated can read support replies" ON public.support_replies;
CREATE POLICY "Authenticated can read support replies" ON public.support_replies
  FOR SELECT TO authenticated USING (true);

-- Answered is a fact about the ticket, and the page sorts by it.
ALTER TABLE public.support_tickets
  ADD COLUMN IF NOT EXISTS answered_at TIMESTAMPTZ;
