-- Where and in which languages a company is talked about.
--
-- A company name that is also a common word pulls in the world's posts
-- containing it: "Lessence", a Colombian company, collected French posts about
-- l'essence (petrol). The countries it operates in brief the AI; the languages
-- narrow the X search itself (lang:), which X can filter reliably -- a country
-- filter cannot be pushed down, as X only knows the country of geotagged
-- posts, a small fraction. Excluded words drop what is left.
ALTER TABLE public.company_settings
  ADD COLUMN IF NOT EXISTS monitor_countries     TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS monitor_languages     TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS monitor_exclude_terms TEXT[] NOT NULL DEFAULT '{}';
