-- A watched topic that only counts when the company is named with it.
--
-- "fire", "humo", "mayday", "emergency landing" are the earliest signals an
-- airline gets and the most useless to search for on their own: every fire on
-- earth comes back. Arajet had all six of them switched off, which is the only
-- sensible thing to do with a term that would flood the workspace — and it
-- meant the highest-value keywords in the list were doing nothing.
--
-- The rule a topic needs is the one sources already have: watch this
-- everywhere, or only where we are named. A crisis hashtag still defaults to
-- everywhere — that is the whole reason to watch a hashtag, because the
-- company is not named in it yet — and a word like "smoke" is marked the other
-- way and becomes usable.
ALTER TABLE public.monitor_topics
  ADD COLUMN IF NOT EXISTS only_with_brand BOOLEAN NOT NULL DEFAULT false;

-- A hashtag cannot hold a space or an accent: the query builder strips both,
-- so "Arajet República Dominicana" was searched as #ArajetRepblicaDominicana
-- and matched nothing, as did "Ara Jet" and "aterrizaje de emergencia". Those
-- are phrases, and were only ever stored as hashtags because that was the
-- default in the form.
UPDATE public.monitor_topics
   SET kind = 'phrase'
 WHERE kind = 'hashtag'
   AND (value ~ '\s' OR value ~ '[^A-Za-z0-9_#]');

-- Generic single words are hazardous alone and valuable beside the company
-- name, so they are turned on with that restriction rather than left off.
UPDATE public.monitor_topics
   SET only_with_brand = true,
       active = true
 WHERE lower(value) IN (
   'fire', 'smoke', 'humo', 'mayday', 'fuego', 'incendio',
   'emergency landing', 'aterrizaje de emergencia', 'pouso de emergência',
   'evacuation', 'evacuación', 'turbulence', 'turbulencia'
 );

-- Once a word is only searched beside the company name, the hashtag form is
-- the wrong one: "#fire Arajet" is a narrower thing than "fire" near
-- "Arajet", and the plain word is what people actually write when a plane is
-- on fire. These become phrases.
UPDATE public.monitor_topics
   SET kind = 'phrase'
 WHERE only_with_brand AND kind = 'hashtag';
