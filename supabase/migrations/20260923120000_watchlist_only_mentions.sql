-- Watching a news account should not mean reading the news.
--
-- from:handle collects everything that account publishes. For an outlet or a
-- busy commentator that is a few hundred posts a day, almost none of them
-- about this client — and every one of them is analysed, costing money and
-- burying the post that mattered.
--
-- So an account entry now says what it is for: the posts where that account
-- names the company (the default, and what anyone means by "watch this
-- journalist"), or everything it publishes, which is occasionally the point —
-- a regulator, or an activist running a campaign about the sector where the
-- company may not be named until the day it is.
--
-- Hashtags and words are never narrowed this way. A crisis hashtag is watched
-- precisely because the company is not named in it yet.

ALTER TABLE public.monitor_watchlist
  ADD COLUMN IF NOT EXISTS only_mentions BOOLEAN NOT NULL DEFAULT true;

COMMENT ON COLUMN public.monitor_watchlist.only_mentions IS
  'For an account: collect only its posts that name the company, rather than everything it publishes.';
