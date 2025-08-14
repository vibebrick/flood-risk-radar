-- Create flood_incidents table for real flood hotspot data
CREATE TABLE public.flood_incidents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  latitude NUMERIC NOT NULL,
  longitude NUMERIC NOT NULL,
  address TEXT,
  incident_date TIMESTAMP WITH TIME ZONE NOT NULL,
  severity_level INTEGER DEFAULT 1 CHECK (severity_level BETWEEN 1 AND 5), -- 1=low, 5=severe
  data_source TEXT NOT NULL, -- 'news', 'social_media', 'government', 'user_report'
  source_url TEXT,
  source_title TEXT,
  source_content TEXT,
  verified BOOLEAN DEFAULT false,
  confidence_score NUMERIC DEFAULT 0.5 CHECK (confidence_score BETWEEN 0 AND 1),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.flood_incidents ENABLE ROW LEVEL SECURITY;

-- Create policies for flood_incidents
CREATE POLICY "Anyone can view flood incidents" 
ON public.flood_incidents 
FOR SELECT 
USING (true);

CREATE POLICY "Anyone can insert flood incidents" 
ON public.flood_incidents 
FOR INSERT 
WITH CHECK (true);

-- Create indexes for efficient geographical queries
CREATE INDEX idx_flood_incidents_location ON public.flood_incidents USING btree (latitude, longitude);
CREATE INDEX idx_flood_incidents_date ON public.flood_incidents (incident_date DESC);
CREATE INDEX idx_flood_incidents_source ON public.flood_incidents (data_source);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_flood_incidents_updated_at
BEFORE UPDATE ON public.flood_incidents
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add function to calculate distance between two points (in meters)
CREATE OR REPLACE FUNCTION public.calculate_distance(lat1 NUMERIC, lon1 NUMERIC, lat2 NUMERIC, lon2 NUMERIC)
RETURNS NUMERIC AS $$
DECLARE
    earth_radius NUMERIC := 6371000; -- Earth radius in meters
    dlat NUMERIC;
    dlon NUMERIC;
    a NUMERIC;
    c NUMERIC;
BEGIN
    dlat := radians(lat2 - lat1);
    dlon := radians(lon2 - lon1);
    a := sin(dlat/2) * sin(dlat/2) + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlon/2) * sin(dlon/2);
    c := 2 * atan2(sqrt(a), sqrt(1-a));
    RETURN earth_radius * c;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Add function to get flood incidents within radius
CREATE OR REPLACE FUNCTION public.get_flood_incidents_within_radius(
    center_lat NUMERIC,
    center_lon NUMERIC,
    radius_meters INTEGER
)
RETURNS TABLE(
    id UUID,
    latitude NUMERIC,
    longitude NUMERIC,
    address TEXT,
    incident_date TIMESTAMP WITH TIME ZONE,
    severity_level INTEGER,
    data_source TEXT,
    distance_meters NUMERIC
)
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
    SELECT 
        fi.id,
        fi.latitude,
        fi.longitude,
        fi.address,
        fi.incident_date,
        fi.severity_level,
        fi.data_source,
        calculate_distance(center_lat, center_lon, fi.latitude, fi.longitude) as distance_meters
    FROM public.flood_incidents fi
    WHERE calculate_distance(center_lat, center_lon, fi.latitude, fi.longitude) <= radius_meters
    AND fi.verified = true
    ORDER BY fi.incident_date DESC, distance_meters ASC;
$$;