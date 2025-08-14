import { supabase } from '@/integrations/supabase/client';

export interface FloodIncident {
  id: string;
  latitude: number;
  longitude: number;
  address?: string;
  incident_date: string;
  severity_level?: number;
  verified?: boolean;
  confidence_score?: number;
  data_source: string;
  source_url?: string;
  source_title?: string;
  source_content?: string;
  distance_meters?: number;
}

export interface HeatmapPoint {
  latitude: number;
  longitude: number;
  weight?: number;
}

/**
 * Fetches flood incidents within a specified radius from a center point
 */
export async function getFloodIncidentsWithinRadius(
  centerLat: number,
  centerLon: number,
  radiusMeters: number
): Promise<FloodIncident[]> {
  try {
    const { data, error } = await supabase.rpc('get_flood_incidents_within_radius', {
      center_lat: centerLat,
      center_lon: centerLon,
      radius_meters: radiusMeters
    });

    if (error) {
      console.error('Error fetching flood incidents:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error fetching flood incidents:', error);
    return [];
  }
}

/**
 * Converts flood incidents to heatmap points for map visualization
 */
export function convertIncidentsToHeatmapPoints(incidents: FloodIncident[]): HeatmapPoint[] {
  return incidents.map(incident => ({
    latitude: incident.latitude,
    longitude: incident.longitude,
    weight: (incident.severity_level || 1) * (incident.confidence_score || 0.5)
  }));
}

/**
 * Inserts a new flood incident into the database
 */
export async function insertFloodIncident(incident: Omit<FloodIncident, 'id' | 'distance_meters'>) {
  try {
    const { data, error } = await supabase
      .from('flood_incidents')
      .insert({
        latitude: incident.latitude,
        longitude: incident.longitude,
        address: incident.address,
        incident_date: incident.incident_date,
        severity_level: incident.severity_level || 1,
        verified: incident.verified || false,
        confidence_score: incident.confidence_score || 0.5,
        data_source: incident.data_source,
        source_url: incident.source_url,
        source_title: incident.source_title,
        source_content: incident.source_content
      })
      .select()
      .single();

    if (error) {
      console.error('Error inserting flood incident:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error inserting flood incident:', error);
    return null;
  }
}

/**
 * Seeds the database with mock flood incidents for testing
 */
export async function seedMockFloodIncidents() {
  const mockIncidents = [
    {
      latitude: 25.033964,
      longitude: 121.564468,
      address: '台北市信義區信義路五段7號',
      incident_date: '2024-07-15T14:30:00Z',
      severity_level: 3,
      verified: true,
      confidence_score: 0.8,
      data_source: 'news_report',
      source_title: '信義區暴雨積水情況',
      source_content: '信義區因連日豪雨導致多處積水'
    },
    {
      latitude: 25.047924,
      longitude: 121.517081,
      address: '台北市中正區重慶南路一段122號',
      incident_date: '2024-06-20T09:15:00Z',
      severity_level: 2,
      verified: true,
      confidence_score: 0.7,
      data_source: 'government_report',
      source_title: '中正區淹水警報',
      source_content: '中正區部分路段因排水不良出現積水'
    },
    {
      latitude: 25.042393,
      longitude: 121.513016,
      address: '台北市中正區館前路8號',
      incident_date: '2024-08-01T16:45:00Z',
      severity_level: 1,
      verified: false,
      confidence_score: 0.6,
      data_source: 'social_media',
      source_title: '台北車站周邊積水',
      source_content: '民眾回報台北車站附近有輕微積水'
    }
  ];

  try {
    const { data, error } = await supabase
      .from('flood_incidents')
      .insert(mockIncidents)
      .select();

    if (error) {
      console.error('Error seeding mock data:', error);
      return [];
    }

    console.log('Mock flood incidents seeded successfully:', data);
    return data;
  } catch (error) {
    console.error('Error seeding mock data:', error);
    return [];
  }
}