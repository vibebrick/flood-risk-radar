-- Extend flood_news to support real-source classification and relevance
ALTER TABLE public.flood_news
  ADD COLUMN IF NOT EXISTS content_type TEXT,
  ADD COLUMN IF NOT EXISTS location_match_level TEXT,
  ADD COLUMN IF NOT EXISTS fetched_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- Better sorting by publish date (newest first)
CREATE INDEX IF NOT EXISTS idx_flood_news_publish_date_desc ON public.flood_news (publish_date DESC);

-- Speed up lookups by search
CREATE INDEX IF NOT EXISTS idx_flood_news_search_id ON public.flood_news (search_id);

-- Avoid duplicates per search and url
CREATE UNIQUE INDEX IF NOT EXISTS uniq_flood_news_search_url ON public.flood_news (search_id, url);
