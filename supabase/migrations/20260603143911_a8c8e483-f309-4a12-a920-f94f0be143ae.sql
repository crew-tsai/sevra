CREATE TABLE public.incident_asset_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  asset_id UUID NOT NULL REFERENCES public.incident_assets(id) ON DELETE CASCADE,
  author_id UUID NOT NULL,
  author_email TEXT,
  body TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_incident_asset_comments_asset ON public.incident_asset_comments(asset_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.incident_asset_comments TO authenticated;
GRANT ALL ON public.incident_asset_comments TO service_role;

ALTER TABLE public.incident_asset_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view asset comments"
ON public.incident_asset_comments FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins can add asset comments"
ON public.incident_asset_comments FOR INSERT
TO authenticated
WITH CHECK (is_admin(auth.uid()) AND auth.uid() = author_id);

CREATE POLICY "Admins can update asset comments"
ON public.incident_asset_comments FOR UPDATE
TO authenticated
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Admins can delete asset comments"
ON public.incident_asset_comments FOR DELETE
TO authenticated
USING (is_admin(auth.uid()));

CREATE TRIGGER update_incident_asset_comments_updated_at
BEFORE UPDATE ON public.incident_asset_comments
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();