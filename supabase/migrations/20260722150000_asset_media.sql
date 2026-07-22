-- Instagram/TikTok assets need an attached image/video (uploaded or, for
-- Instagram, AI-generated) before real direct publishing to those networks
-- is possible. This adds the media fields + storage bucket for it.

ALTER TABLE public.incident_assets
  ADD COLUMN media_url TEXT,
  ADD COLUMN media_type TEXT CHECK (media_type IN ('image', 'video')),
  ADD COLUMN media_source TEXT CHECK (media_source IN ('upload', 'generated'));

INSERT INTO storage.buckets (id, name, public) VALUES ('asset-media', 'asset-media', true)
  ON CONFLICT (id) DO NOTHING;

-- Public read: a future real-Instagram-publish phase needs a publicly
-- fetchable image_url for the Graph API's media-container step. Write
-- access mirrors incident_assets' own owner-or-admin UPDATE/DELETE policy
-- (20260527111803_...sql) rather than the admin-only branding bucket, since
-- any authenticated user who can edit an asset today should be able to
-- attach its media.
CREATE POLICY "Asset media public read" ON storage.objects
  FOR SELECT USING (bucket_id = 'asset-media');
CREATE POLICY "Authenticated can upload asset media" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'asset-media');
CREATE POLICY "Owners or admins can replace asset media" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'asset-media' AND (owner = auth.uid() OR public.is_admin(auth.uid())));
CREATE POLICY "Owners or admins can delete asset media" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'asset-media' AND (owner = auth.uid() OR public.is_admin(auth.uid())));
