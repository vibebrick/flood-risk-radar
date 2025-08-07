-- Clear existing flood-related tables
DROP TABLE IF EXISTS flood_news CASCADE;
DROP TABLE IF EXISTS flood_searches CASCADE;

-- Create flood searches table for tracking user searches and location data
CREATE TABLE public.flood_searches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  location_name TEXT NOT NULL,
  address TEXT,
  latitude NUMERIC(10,7) NOT NULL,
  longitude NUMERIC(10,7) NOT NULL,
  search_radius INTEGER NOT NULL CHECK (search_radius IN (300, 500, 800)),
  search_count INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create flood news table for storing news and discussions about flood incidents
CREATE TABLE public.flood_news (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  search_id UUID NOT NULL REFERENCES public.flood_searches(id),
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  source TEXT,
  content_snippet TEXT,
  publish_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.flood_searches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flood_news ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (since this is a public web tool)
CREATE POLICY "Anyone can view flood searches" 
ON public.flood_searches 
FOR SELECT 
USING (true);

CREATE POLICY "Anyone can insert flood searches" 
ON public.flood_searches 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Anyone can update search count" 
ON public.flood_searches 
FOR UPDATE 
USING (true)
WITH CHECK (true);

CREATE POLICY "Anyone can view flood news" 
ON public.flood_news 
FOR SELECT 
USING (true);

CREATE POLICY "Anyone can insert flood news" 
ON public.flood_news 
FOR INSERT 
WITH CHECK (true);

-- Create indexes for better performance
CREATE INDEX idx_flood_searches_location ON public.flood_searches USING GIST (
  ST_MakePoint(longitude::float8, latitude::float8)
);
CREATE INDEX idx_flood_searches_created_at ON public.flood_searches (created_at DESC);
CREATE INDEX idx_flood_searches_search_count ON public.flood_searches (search_count DESC);
CREATE INDEX idx_flood_news_search_id ON public.flood_news (search_id);
CREATE INDEX idx_flood_news_created_at ON public.flood_news (created_at DESC);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
NEW.updated_at = now();
RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_flood_searches_updated_at
BEFORE UPDATE ON public.flood_searches
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();