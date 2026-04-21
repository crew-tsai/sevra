ALTER TABLE public.social_mentions REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.social_mentions;