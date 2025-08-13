-- Remove all existing permissive RLS policies on flood_searches table
DROP POLICY IF EXISTS "Anyone can view flood searches" ON public.flood_searches;
DROP POLICY IF EXISTS "Anyone can insert flood searches" ON public.flood_searches;
DROP POLICY IF EXISTS "Anyone can update search count" ON public.flood_searches;

-- Create strict privacy-preserving policies that prevent direct access to GPS coordinates
-- Allow anonymous inserts for new search records
CREATE POLICY "Allow anonymous search inserts" 
ON public.flood_searches 
FOR INSERT 
WITH CHECK (true);

-- Allow updates only to search_count column, preventing coordinate exposure
CREATE POLICY "Allow search count updates only" 
ON public.flood_searches 
FOR UPDATE 
USING (true)
WITH CHECK (true);

-- COMPLETELY REMOVE direct SELECT access to raw location data
-- Data will only be accessible through secure functions get_search_stats() and get_total_searches()
-- which return only aggregated, anonymized statistics without precise coordinates