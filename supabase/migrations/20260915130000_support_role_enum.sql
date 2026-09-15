-- Support role for Sevra staff.
--
-- Deliberately in its own migration: Postgres will not let a newly added enum
-- value be USED in the same transaction that adds it. The next migration
-- (20260915140000) is the one that can assign it.
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'soporte';
