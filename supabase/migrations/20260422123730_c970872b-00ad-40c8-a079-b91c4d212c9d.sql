ALTER TABLE public.incidents
  ADD COLUMN IF NOT EXISTS approval_status text NOT NULL DEFAULT 'pending_review',
  ADD COLUMN IF NOT EXISTS approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS approved_by uuid;