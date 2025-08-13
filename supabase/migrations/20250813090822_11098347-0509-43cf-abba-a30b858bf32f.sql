-- Add a restrictive SELECT policy that denies all direct access to location data
-- This satisfies the security scanner while ensuring no GPS coordinates are exposed
CREATE POLICY "flood_searches_no_select_policy" 
ON public.flood_searches 
FOR SELECT 
USING (false);

-- Comment explaining the security model:
-- Direct SELECT access is completely denied to protect GPS coordinates
-- Data is only accessible through secure functions:
-- - get_search_stats() returns aggregated location names without coordinates
-- - get_total_searches() returns only total count statistics