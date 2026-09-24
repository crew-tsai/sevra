-- Assigning an incident to a person, rather than to a string.
--
-- `incidents.assignee` is TEXT, shown on the Dashboard and the incident page —
-- and set by nothing. There is no control anywhere in the product that assigns
-- an incident to anybody, so the field has only ever read "Unassigned". Even
-- if something wrote to it, a name in a text column cannot be emailed, cannot
-- be filtered on as "mine", and cannot be tied to an account in the audit log.
--
-- The text column stays and keeps holding the display name, because two
-- screens read it and a crisis is not the moment for a rename. What is new is
-- an actual reference to the person.

ALTER TABLE public.incidents
  ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS incidents_assigned_to
  ON public.incidents (assigned_to) WHERE assigned_to IS NOT NULL;
