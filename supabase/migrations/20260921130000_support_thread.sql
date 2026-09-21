-- A support request is a conversation, not a question and an answer.
--
-- The first version treated Sevra's reply as the end: the ticket went to
-- 'answered' and the client had nowhere to say "that isn't it" except by
-- replying to the email, which leaves the product entirely and lands in an
-- inbox as ordinary mail. Whoever opens the ticket next sees an answer and no
-- sign that it failed.
--
-- So follow-ups from the client live here, beside Sevra's replies, and either
-- side writing reopens the thread.
--
-- Attachments are the other half of the same problem: a person describing a
-- screen in prose is doing the hard version of sending a screenshot, and a
-- crisis team has better things to do.

CREATE TABLE IF NOT EXISTS public.support_messages (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id    UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  body         TEXT NOT NULL,
  created_by   UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_email TEXT,
  -- Whether this follow-up reached Sevra. Same contract as the ticket itself:
  -- recorded here first, forwarded second, retryable if the forward failed.
  delivered    BOOLEAN NOT NULL DEFAULT false,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS support_messages_ticket
  ON public.support_messages (ticket_id, created_at);

ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;

-- The same readership as the tickets: the whole team, because a colleague
-- needs to see that the thread moved on.
DROP POLICY IF EXISTS "Authenticated can read support messages" ON public.support_messages;
CREATE POLICY "Authenticated can read support messages" ON public.support_messages
  FOR SELECT TO authenticated USING (true);

-- ---------------------------------------------------------------------------
-- Attachments
-- ---------------------------------------------------------------------------
--
-- The files stay in the client's own project. Sevra's staff open them through
-- a short-lived signed URL minted here on request, so a screenshot of an
-- unpublished holding statement never gets copied into the control plane —
-- which holds metadata, and should keep holding only metadata.
CREATE TABLE IF NOT EXISTS public.support_attachments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id   UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  message_id  UUID REFERENCES public.support_messages(id) ON DELETE CASCADE,
  -- Path inside the support-attachments bucket.
  path        TEXT NOT NULL,
  filename    TEXT NOT NULL,
  mime_type   TEXT,
  size_bytes  BIGINT,
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS support_attachments_ticket
  ON public.support_attachments (ticket_id, created_at);

ALTER TABLE public.support_attachments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated can read support attachments" ON public.support_attachments;
CREATE POLICY "Authenticated can read support attachments" ON public.support_attachments
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated can record support attachments" ON public.support_attachments;
CREATE POLICY "Authenticated can record support attachments" ON public.support_attachments
  FOR INSERT TO authenticated WITH CHECK (true);

-- Private. A support attachment can be a screenshot of an incident that has
-- not been published, so it is never served publicly the way branding is.
INSERT INTO storage.buckets (id, name, public) VALUES ('support-attachments', 'support-attachments', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Authenticated can read support files" ON storage.objects;
CREATE POLICY "Authenticated can read support files" ON storage.objects
  FOR SELECT TO authenticated USING (bucket_id = 'support-attachments');

DROP POLICY IF EXISTS "Authenticated can upload support files" ON storage.objects;
CREATE POLICY "Authenticated can upload support files" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'support-attachments');

-- ---------------------------------------------------------------------------
-- The ticket's own state
-- ---------------------------------------------------------------------------
--
-- answered_at said when Sevra last replied. It was being read as "this is
-- finished", which is the assumption this whole migration exists to remove, so
-- the thread's state is now explicit and a client follow-up puts it back to
-- waiting.
ALTER TABLE public.support_tickets
  ADD COLUMN IF NOT EXISTS state TEXT NOT NULL DEFAULT 'waiting'
    CHECK (state IN ('waiting', 'answered', 'closed')),
  -- Sorting the list by when anything last happened, rather than by when it
  -- was opened — a three-day-old thread with a message this morning is the
  -- live one.
  ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMPTZ NOT NULL DEFAULT now();

UPDATE public.support_tickets
   SET state = CASE WHEN answered_at IS NOT NULL THEN 'answered' ELSE 'waiting' END,
       last_activity_at = COALESCE(answered_at, created_at)
 WHERE last_activity_at = created_at;
