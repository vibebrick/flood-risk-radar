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
  },

  async testCWARainfallAPI(location: string = '台北市') {
    console.log(`Testing CWA rainfall API for: ${location}`);
    try {
      const { data, error } = await supabase.functions.invoke('test-cwa-api', {
        body: { location },
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (error) {
        console.error('Edge function invocation error:', error);
        return {
          success: false,
          error: `Function invocation failed: ${error.message}`,
          hasApiKey: false,
          debug: {
            invokeError: error,
            timestamp: new Date().toISOString()
          }
        };
      }

      // Ensure we return a valid object even if data is null
      return data || {
        success: false,
        error: 'No response data received',
        hasApiKey: false
      };
    } catch (error) {
      console.error('Network error calling test-cwa-api:', error);
      return {
        success: false,
        error: `Network error: ${error.message}`,
        hasApiKey: false,
        debug: {
          networkError: error.message,
          timestamp: new Date().toISOString()
        }
      };
    }
  }
};