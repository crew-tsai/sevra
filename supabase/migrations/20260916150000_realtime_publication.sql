-- Publish the tables the app actually subscribes to.
--
-- Four components open postgres_changes subscriptions, but only social_mentions
-- was ever added to the supabase_realtime publication:
--
--   Dashboard.tsx      incidents, social_mentions
--   Assets.tsx         incident_assets
--   Approvals.tsx      incident_assets
--   AssetComments.tsx  incident_asset_comments  (filtered on asset_id)
--
-- The three unpublished ones failed silently: subscribing to a table that
-- Postgres never replicates raises no error and simply never fires. So the
-- Dashboard, Assets and Approvals looked live and were not -- a coordinator
-- watching an incident board mid-crisis would see stale data with no
-- indication of it, which is the worst place in this product for that.
--
-- REPLICA IDENTITY FULL matches what social_mentions already carries. It is
-- required for DELETE payloads to include the old row's columns, which
-- AssetComments depends on: its filter is asset_id=eq.<id>, and without FULL a
-- delete carries only the primary key, so the filter cannot match and the
-- deletion never reaches the client.

ALTER TABLE public.incidents REPLICA IDENTITY FULL;
ALTER TABLE public.incident_assets REPLICA IDENTITY FULL;
ALTER TABLE public.incident_asset_comments REPLICA IDENTITY FULL;

-- Idempotent: ALTER PUBLICATION ... ADD TABLE errors if the table is already a
-- member, and this migration also runs against freshly provisioned projects.
DO $realtime_pub$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['incidents', 'incident_assets', 'incident_asset_comments']
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
       WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = t
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
    END IF;
  END LOOP;
END
$realtime_pub$;
