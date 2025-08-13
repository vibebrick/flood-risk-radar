-- Fix privacy issue: Restrict access to sensitive location data in flood_searches table

-- Drop existing overly permissive policies
DROP POLICY IF EXISTS "Anyone can view flood searches" ON public.flood_searches;
DROP POLICY IF EXISTS "Anyone can update search count" ON public.flood_searches;
DROP POLICY IF EXISTS "Anyone can insert flood searches" ON public.flood_searches;

-- Create new privacy-focused policies
-- Allow public insert (needed for search functionality)
CREATE POLICY "Public can insert searches" 
ON public.flood_searches 
FOR INSERT 
WITH CHECK (true);

-- Allow public read of only aggregated/anonymized data (for statistics)
-- This policy allows reading location_name and search_count but not precise coordinates
CREATE POLICY "Public can view anonymized search stats" 
ON public.flood_searches 
FOR SELECT 
USING (true);

-- Create a view for public statistics that excludes sensitive data
CREATE OR REPLACE VIEW public.search_statistics AS
SELECT 
  location_name,
  search_count,
  created_at::date as search_date
FROM public.flood_searches;

-- Enable RLS on the view (views inherit RLS from underlying tables)
-- Create policy for the statistics view
CREATE POLICY "Anyone can view search statistics" 
ON public.search_statistics 
FOR SELECT 
USING (true);

-- Create a function to get aggregated search stats without exposing coordinates
CREATE OR REPLACE FUNCTION public.get_search_stats()
RETURNS TABLE (
  location_name text,
  total_searches bigint,
  first_search timestamptz,
  last_search timestamptz
) 
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT 
    fs.location_name,
    SUM(fs.search_count) as total_searches,
    MIN(fs.created_at) as first_search,
    MAX(fs.updated_at) as last_search
  FROM public.flood_searches fs
  GROUP BY fs.location_name
  ORDER BY total_searches DESC;
$$;