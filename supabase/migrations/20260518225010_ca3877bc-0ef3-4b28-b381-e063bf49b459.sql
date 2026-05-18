
CREATE TABLE public.incident_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id uuid NOT NULL REFERENCES public.incidents(id) ON DELETE CASCADE,
  incident_title text,
  changed_by uuid,
  changed_at timestamptz NOT NULL DEFAULT now(),
  field_name text NOT NULL,
  old_value text,
  new_value text,
  change_source text DEFAULT 'manual'
);

CREATE INDEX idx_incident_audit_log_incident ON public.incident_audit_log(incident_id);
CREATE INDEX idx_incident_audit_log_changed_at ON public.incident_audit_log(changed_at DESC);

ALTER TABLE public.incident_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view audit log"
  ON public.incident_audit_log FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated can insert audit log"
  ON public.incident_audit_log FOR INSERT TO authenticated WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.log_incident_risk_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.crisis_level IS DISTINCT FROM OLD.crisis_level THEN
    INSERT INTO public.incident_audit_log(incident_id, incident_title, changed_by, field_name, old_value, new_value)
    VALUES (NEW.id, NEW.title, auth.uid(), 'crisis_level', OLD.crisis_level::text, NEW.crisis_level::text);
  END IF;
  IF NEW.risk_score IS DISTINCT FROM OLD.risk_score THEN
    INSERT INTO public.incident_audit_log(incident_id, incident_title, changed_by, field_name, old_value, new_value)
    VALUES (NEW.id, NEW.title, auth.uid(), 'risk_score', OLD.risk_score::text, NEW.risk_score::text);
  END IF;
  IF NEW.risk IS DISTINCT FROM OLD.risk THEN
    INSERT INTO public.incident_audit_log(incident_id, incident_title, changed_by, field_name, old_value, new_value)
    VALUES (NEW.id, NEW.title, auth.uid(), 'risk', OLD.risk, NEW.risk);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_log_incident_risk_changes
AFTER UPDATE ON public.incidents
FOR EACH ROW EXECUTE FUNCTION public.log_incident_risk_changes();
