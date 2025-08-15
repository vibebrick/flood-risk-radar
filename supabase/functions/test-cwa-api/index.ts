import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { location = '台北市' } = await req.json().catch(() => ({}));
    
    const cwbApiKey = Deno.env.get('CWA_API_KEY');
    console.log(`🔍 Checking CWA_API_KEY availability...`);
    console.log(`🔑 API Key status: ${cwbApiKey ? 'Found' : 'Not found'}`);
    
    // Enhanced environment variable debugging
    console.log(`🔧 Environment debug:`, {
      hasKey: !!cwbApiKey,
      keyLength: cwbApiKey?.length || 0,
      keyFormat: cwbApiKey?.startsWith('CWA-') || false,
      envVarCount: Object.keys(Deno.env.toObject()).length
    });
    
    if (!cwbApiKey) {
      console.log(`❌ CWA_API_KEY environment variable is not set`);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'CWA_API_KEY not configured',
          hasApiKey: false,
          debug: {
            env_check: 'CWA_API_KEY not found in environment variables',
            timestamp: new Date().toISOString(),
            availableEnvs: Object.keys(Deno.env.toObject()).filter(k => k.includes('API') || k.includes('KEY'))
          }
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Validate API Key format
    if (!cwbApiKey.match(/^CWA-[0-9A-F]{8}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{12}$/i)) {
      console.log(`⚠️ API Key format appears invalid`);
      console.log(`🔍 Key format: ${cwbApiKey.substring(0, 20)}...`);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Invalid CWA API Key format',
          hasApiKey: true,
          debug: {
            format_check: 'Key does not match expected CWA-XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX format',
            keyPrefix: cwbApiKey.substring(0, 4),
            timestamp: new Date().toISOString()
          }
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log(`🧪 Testing CWA API with location: ${location}`);
    console.log(`🔑 API Key available: ${cwbApiKey.substring(0, 20)}...`);

    // Test 1: O-A0002-001 即時雨量資料
    const rainfallUrl = `https://opendata.cwa.gov.tw/api/v1/rest/datastore/O-A0002-001?Authorization=${cwbApiKey}&format=JSON&elementName=RAIN`;
    
    console.log(`📡 Testing URL: ${rainfallUrl.substring(0, 100)}...`);
    
    // Add timeout handling
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout
    
    try {
      const response = await fetch(rainfallUrl, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'FloodRiskApp/1.0',
          'Accept': 'application/json'
        }
      });
      
      clearTimeout(timeoutId);

    console.log(`📊 Response status: ${response.status} ${response.statusText}`);
    console.log(`📋 Response headers:`, Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const errorText = await response.text();
      console.log(`❌ Error response body: ${errorText.substring(0, 500)}`);
      
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `API request failed: ${response.status} ${response.statusText}`,
          errorDetails: errorText.substring(0, 200),
          hasApiKey: true,
          apiUrl: rainfallUrl.substring(0, 100) + '...'
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const data = await response.json();
    console.log(`✅ API response received successfully`);
    console.log(`📊 Response structure:`, Object.keys(data));

    if (data.success === 'true' && data.records?.Station) {
      console.log(`🌧️ Found ${data.records.Station.length} rainfall stations`);
      
      // 分析與目標地點相關的測站
      const relevantStations = data.records.Station.filter((station: any) => {
        const stationName = station.StationName || '';
        return stationName.includes(location.slice(0, 2)) || 
               location.slice(0, 2).includes(stationName.slice(0, 2));
      });

      console.log(`📍 Found ${relevantStations.length} stations near ${location}`);
      
      // Enhanced station analysis
      const stationSummary = relevantStations.slice(0, 5).map((station: any) => {
        const rain1hr = parseFloat(station.WeatherElement?.RainElement?.Past1hr?.Precipitation || 
                                  station.RainElement?.Past1hr?.Precipitation || 0);
        const rain24hr = parseFloat(station.WeatherElement?.RainElement?.Past24hr?.Precipitation || 
                                   station.RainElement?.Past24hr?.Precipitation || 0);
        
        return {
          name: station.StationName,
          rain1hr,
          rain24hr,
          obsTime: station.ObsTime?.DateTime,
          coordinates: {
            lat: parseFloat(station.GeoInfo?.Coordinates?.[0]?.StationLatitude || 0),
            lng: parseFloat(station.GeoInfo?.Coordinates?.[0]?.StationLongitude || 0)
          }
        };
      });

      return new Response(
        JSON.stringify({
          success: true,
          message: 'CWA API 連接成功！',
          testResults: {
            totalStations: data.records.Station.length,
            relevantStations: relevantStations.length,
            stationSample: stationSummary,
            apiEndpoint: 'O-A0002-001 即時雨量資料',
            testTime: new Date().toISOString()
          },
          hasApiKey: true,
          apiResponse: {
            success: data.success,
            statusCode: response.status
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      console.log(`⚠️ API response structure analysis:`);
      console.log(`📋 Response success:`, data.success);
      console.log(`📋 Has records:`, !!data.records);
      console.log(`📋 Records keys:`, data.records ? Object.keys(data.records) : 'null');
      console.log(`📋 Station count:`, data.records?.Station?.length || 'no Station data');
      
      return new Response(
        JSON.stringify({
          success: false,
          error: data.success !== 'true' ? 'API returned error status' : 'API response missing Station data',
          hasApiKey: true,
          debug: {
            apiSuccess: data.success,
            hasRecords: !!data.records,
            recordsKeys: data.records ? Object.keys(data.records) : null,
            stationCount: data.records?.Station?.length || 0,
            errorMessage: data.message || 'No error message provided'
          },
          responseStructure: Object.keys(data),
          timestamp: new Date().toISOString()
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }
    
    } catch (timeoutError) {
      clearTimeout(timeoutId);
      if (timeoutError.name === 'AbortError') {
        console.error('🕐 Request timeout after 15 seconds');
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Request timeout after 15 seconds',
            hasApiKey: true,
            debug: {
              timeout: true,
              duration: '15000ms',
              timestamp: new Date().toISOString()
            }
          }),
          { 
            status: 408, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }
      throw timeoutError;
    }

  } catch (error) {
    console.error('🚨 Test CWA API error:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        hasApiKey: !!Deno.env.get('CWA_API_KEY'),
        stack: error.stack
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});