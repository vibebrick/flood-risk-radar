-- Fix security warnings by setting proper search_path for functions

-- Update get_search_stats function with secure search_path
CREATE OR REPLACE FUNCTION public.get_search_stats()
RETURNS TABLE (
  location_name text,
  total_searches bigint
) 
LANGUAGE sql
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT 
    fs.location_name,
    SUM(fs.search_count) as total_searches
  FROM public.flood_searches fs
  GROUP BY fs.location_name
  ORDER BY total_searches DESC
  LIMIT 10;
$$;

-- Update get_total_searches function with secure search_path
CREATE OR REPLACE FUNCTION public.get_total_searches()
RETURNS bigint
LANGUAGE sql
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT COALESCE(SUM(search_count), 0) as total
  FROM public.flood_searches;
$$;