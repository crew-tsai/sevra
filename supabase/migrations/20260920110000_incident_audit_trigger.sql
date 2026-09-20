-- One audit trigger, in version control, that says who made the change.
--
-- Two problems, both found by watching a workflow rule move an incident's
-- status and produce two audit entries for it:
--
-- 1. The original deployment has a trigger, log_incident_changes, that logs
--    status, approval_status and assignee alongside risk. It was created
--    directly against that database and never written down, so a workspace
--    provisioned from these migrations got only the older
--    log_incident_risk_changes — crisis level, risk score and risk. Every
--    client but the first has been auditing less than the first.
--
-- 2. Both versions stamp change_source 'manual' whatever made the change. Now
--    that Sevra moves statuses by itself, "manual" against an automatic change
--    is not a label, it is a wrong answer to the question the audit log exists
--    to answer. A service-role write has no auth.uid(), which is exactly what
--    distinguishes the two.

CREATE OR REPLACE FUNCTION public.log_incident_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid;
  v_source text;
BEGIN
  v_user := auth.uid();
  -- No signed-in user means an edge function did it with the service role,
  -- which in this product means Sevra acted on its own.
  v_source := CASE WHEN v_user IS NULL THEN 'sevra' ELSE 'manual' END;

  IF NEW.crisis_level IS DISTINCT FROM OLD.crisis_level THEN
    INSERT INTO public.incident_audit_log(incident_id,incident_title,field_name,old_value,new_value,changed_by,change_source)
    VALUES (NEW.id,NEW.title,'crisis_level',OLD.crisis_level::text,NEW.crisis_level::text,v_user,v_source);
  END IF;

  IF NEW.risk_score IS DISTINCT FROM OLD.risk_score THEN
    INSERT INTO public.incident_audit_log(incident_id,incident_title,field_name,old_value,new_value,changed_by,change_source)
    VALUES (NEW.id,NEW.title,'risk_score',OLD.risk_score::text,NEW.risk_score::text,v_user,v_source);
  END IF;

  IF NEW.risk IS DISTINCT FROM OLD.risk THEN
    INSERT INTO public.incident_audit_log(incident_id,incident_title,field_name,old_value,new_value,changed_by,change_source)
    VALUES (NEW.id,NEW.title,'risk',OLD.risk,NEW.risk,v_user,v_source);
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.incident_audit_log(incident_id,incident_title,field_name,old_value,new_value,changed_by,change_source)
    VALUES (NEW.id,NEW.title,'status',OLD.status,NEW.status,v_user,v_source);
  END IF;

  IF NEW.approval_status IS DISTINCT FROM OLD.approval_status THEN
    INSERT INTO public.incident_audit_log(incident_id,incident_title,field_name,old_value,new_value,changed_by,change_source)
    VALUES (NEW.id,NEW.title,'approval_status',OLD.approval_status,NEW.approval_status,v_user,v_source);
  END IF;

  IF NEW.assignee IS DISTINCT FROM OLD.assignee THEN
    INSERT INTO public.incident_audit_log(incident_id,incident_title,field_name,old_value,new_value,changed_by,change_source)
    VALUES (NEW.id,NEW.title,'assignee',OLD.assignee,NEW.assignee,v_user,v_source);
  END IF;

  -- A rule can close public publishing, which is a decision someone will want
  -- to find afterwards.
  IF NEW.is_public IS DISTINCT FROM OLD.is_public THEN
    INSERT INTO public.incident_audit_log(incident_id,incident_title,field_name,old_value,new_value,changed_by,change_source)
    VALUES (NEW.id,NEW.title,'is_public',OLD.is_public::text,NEW.is_public::text,v_user,v_source);
  END IF;

  RETURN NEW;
END;
$$;

-- The older trigger logged a subset of the same fields; leaving it in place
-- would double every risk entry.
DROP TRIGGER IF EXISTS trg_log_incident_risk_changes ON public.incidents;
DROP TRIGGER IF EXISTS trg_log_incident_changes ON public.incidents;
CREATE TRIGGER trg_log_incident_changes
  AFTER UPDATE ON public.incidents
  FOR EACH ROW EXECUTE FUNCTION public.log_incident_changes();
