import { supabase } from "@/integrations/supabase/client";

export const testEdgeFunctions = {
  async seedHistoricalData() {
    console.log('Triggering seed-historical-flood-data...');
    const { data, error } = await supabase.functions.invoke('seed-historical-flood-data');
    if (error) throw error;
    return data;
  },

  async syncGovernmentData() {
    console.log('Triggering sync-government-flood-data...');
    const { data, error } = await supabase.functions.invoke('sync-government-flood-data');
    if (error) throw error;
    return data;
  },

  async testGeocoding(address: string) {
    console.log(`Testing geocoding for: ${address}`);
    const { data, error } = await supabase.functions.invoke('geocoding-service', {
      body: { address }
    });
    if (error) throw error;
    return data;
  },

  async testFloodSearch(locationName: string, latitude: number, longitude: number, radiusKm: number = 5) {
    console.log(`Testing flood search for: ${locationName}`);
    const { data, error } = await supabase.functions.invoke('search-flood-news', {
      body: {
        searchLocation: {
          latitude,
          longitude,
          address: locationName
        },
        searchRadius: radiusKm * 1000 // Convert km to meters
      }
    });
    if (error) throw error;
    return data;
  },

  async getFloodIncidentsCount() {
    const { count, error } = await supabase
      .from('flood_incidents')
      .select('*', { count: 'exact', head: true });
    if (error) throw error;
    return count || 0;
  },

  async getSampleFloodIncidents(limit = 5) {
    const { data, error } = await supabase
      .from('flood_incidents')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return data;
  }
};