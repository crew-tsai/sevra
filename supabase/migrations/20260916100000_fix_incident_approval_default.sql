-- Repair incidents.approval_status, whose DEFAULT violates its own CHECK.
--
-- The live database had drifted from this repo: the column's default was
-- 'pending_review', while ck_incident_approval_status (added in
-- 20260612120000_phase1_hardening.sql) only permits 'pending', 'approved' and
-- 'rejected'. That hardening migration repaired the existing *rows* but never
-- touched the *default*, and no migration in this repo ever set
-- 'pending_review' — it was applied straight to the project.
--
-- The effect: any INSERT that doesn't name approval_status explicitly takes the
-- default and is rejected by the constraint. sevra-analyze is exactly such an
-- insert, so every incident the AI tried to open failed with:
--
--   new row for relation "incidents" violates check constraint
--   "ck_incident_approval_status"
--
-- This stayed invisible because the AI surface had been dead since the app was
-- migrated off Lovable — nothing was reaching the insert to fail on it. It
-- surfaced the moment AI started working again.
--
-- 'pending' is the original default from 20260422123730 and the value the
-- hardening migration normalised existing rows to, so it is the correct side
-- of the mismatch to restore.
ALTER TABLE public.incidents
  ALTER COLUMN approval_status SET DEFAULT 'pending';

-- Belt and braces: anything already carrying an illegal value would block the
-- constraint. Idempotent, and a no-op on a project provisioned from scratch.
UPDATE public.incidents
   SET approval_status = 'pending'
 WHERE approval_status NOT IN ('pending', 'approved', 'rejected');
