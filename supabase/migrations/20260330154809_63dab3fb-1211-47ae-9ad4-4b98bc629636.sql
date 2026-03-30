
-- Create enums
CREATE TYPE public.incident_type AS ENUM ('operational', 'safety', 'security', 'weather', 'technical', 'medical', 'regulatory', 'reputational');
CREATE TYPE public.incident_source AS ENUM ('manual', 'social_media', 'news', 'internal_ops', 'customer_complaint', 'regulator');
CREATE TYPE public.incident_status AS ENUM ('active', 'monitoring', 'contained', 'resolved');
CREATE TYPE public.risk_level AS ENUM ('critical', 'high', 'medium', 'low');

-- Create incidents table
CREATE TABLE public.incidents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  incident_type TEXT NOT NULL,
  sub_type TEXT,
  description TEXT,
  airline_name TEXT,
  flight_number TEXT,
  route TEXT,
  airport_code TEXT,
  country TEXT,
  injury_fatality BOOLEAN NOT NULL DEFAULT false,
  regulator_involved BOOLEAN NOT NULL DEFAULT false,
  estimated_passengers_impacted INTEGER DEFAULT 0,
  is_public BOOLEAN NOT NULL DEFAULT false,
  influencer_media_involved BOOLEAN NOT NULL DEFAULT false,
  source TEXT NOT NULL DEFAULT 'manual',
  risk TEXT NOT NULL DEFAULT 'medium',
  status TEXT NOT NULL DEFAULT 'active',
  risk_score INTEGER NOT NULL DEFAULT 50,
  assignee TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.incidents ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read all incidents
CREATE POLICY "Authenticated users can view all incidents"
  ON public.incidents FOR SELECT TO authenticated
  USING (true);

-- Authenticated users can create incidents
CREATE POLICY "Authenticated users can create incidents"
  ON public.incidents FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by);

-- Users can update their own incidents
CREATE POLICY "Users can update own incidents"
  ON public.incidents FOR UPDATE TO authenticated
  USING (auth.uid() = created_by);

-- Users can delete their own incidents
CREATE POLICY "Users can delete own incidents"
  ON public.incidents FOR DELETE TO authenticated
  USING (auth.uid() = created_by);

-- Timestamp trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_incidents_updated_at
  BEFORE UPDATE ON public.incidents
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
