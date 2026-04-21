CREATE TABLE public.social_mentions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  channel TEXT NOT NULL,
  author_name TEXT,
  author_handle TEXT,
  author_avatar_url TEXT,
  content TEXT NOT NULL,
  post_url TEXT,
  posted_at TIMESTAMPTZ,
  likes INTEGER DEFAULT 0,
  shares INTEGER DEFAULT 0,
  reach INTEGER DEFAULT 0,
  is_verified BOOLEAN DEFAULT false,
  is_influencer BOOLEAN DEFAULT false,
  status TEXT NOT NULL DEFAULT 'pending',
  ai_incident_type TEXT,
  ai_sub_type TEXT,
  ai_risk TEXT,
  ai_risk_score INTEGER,
  ai_summary TEXT,
  ai_should_create_incident BOOLEAN DEFAULT false,
  ai_extracted JSONB,
  incident_id UUID REFERENCES public.incidents(id) ON DELETE SET NULL,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.social_mentions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view mentions"
  ON public.social_mentions FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Authenticated users can create mentions"
  ON public.social_mentions FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update own mentions"
  ON public.social_mentions FOR UPDATE
  TO authenticated USING (auth.uid() = created_by);

CREATE POLICY "Users can delete own mentions"
  ON public.social_mentions FOR DELETE
  TO authenticated USING (auth.uid() = created_by);

CREATE TRIGGER update_social_mentions_updated_at
  BEFORE UPDATE ON public.social_mentions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_social_mentions_status ON public.social_mentions(status);
CREATE INDEX idx_social_mentions_channel ON public.social_mentions(channel);
CREATE INDEX idx_social_mentions_created_at ON public.social_mentions(created_at DESC);