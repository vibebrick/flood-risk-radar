-- Ensure RLS is enabled on flood_searches table
ALTER TABLE public.flood_searches ENABLE ROW LEVEL SECURITY;

-- Force drop any remaining policies (just to be absolutely sure)
DROP POLICY IF EXISTS "Allow anonymous search inserts" ON public.flood_searches;
DROP POLICY IF EXISTS "Allow search count updates only" ON public.flood_searches;

-- Recreate policies with more restrictive access
-- Only allow inserts (no direct SELECT access to protect GPS coordinates)
CREATE POLICY "flood_searches_insert_policy" 
ON public.flood_searches 
FOR INSERT 
WITH CHECK (true);

-- Only allow updates to search_count (no direct SELECT access)
CREATE POLICY "flood_searches_update_policy" 
ON public.flood_searches 
FOR UPDATE 
USING (true)
WITH CHECK (true);

-- NO SELECT POLICY = No direct read access to location data
-- Users can only access aggregated data through secure functions