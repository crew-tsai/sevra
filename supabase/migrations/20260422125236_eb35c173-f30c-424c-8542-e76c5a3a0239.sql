CREATE TABLE public.incident_assets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  incident_id UUID NOT NULL REFERENCES public.incidents(id) ON DELETE CASCADE,
  asset_type TEXT NOT NULL,
  channel TEXT,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  approval_status TEXT NOT NULL DEFAULT 'pending',
  approved_at TIMESTAMPTZ,
  approved_by UUID,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_incident_assets_incident ON public.incident_assets(incident_id);

ALTER TABLE public.incident_assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view assets"
  ON public.incident_assets FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated can create assets"
  ON public.incident_assets FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated can update assets"
  ON public.incident_assets FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated can delete assets"
  ON public.incident_assets FOR DELETE TO authenticated USING (true);

CREATE TRIGGER update_incident_assets_updated_at
  BEFORE UPDATE ON public.incident_assets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();