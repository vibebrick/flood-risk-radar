-- Create the missing get_total_searches function
CREATE OR REPLACE FUNCTION public.get_total_searches()
RETURNS bigint
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT COALESCE(SUM(search_count), 0) as total
  FROM public.flood_searches;
$$;