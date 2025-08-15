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
    if (!cwbApiKey) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'CWA_API_KEY not configured',
          hasApiKey: false
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
    
    const response = await fetch(rainfallUrl, {
      headers: {
        'User-Agent': 'FloodRiskApp/1.0',
        'Accept': 'application/json'
      }
    });

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

    if (data.records?.Station) {
      console.log(`🌧️ Found ${data.records.Station.length} rainfall stations`);
      
      // 分析與目標地點相關的測站
      const relevantStations = data.records.Station.filter((station: any) => {
        const stationName = station.StationName || '';
        return stationName.includes(location.slice(0, 2)) || 
               location.slice(0, 2).includes(stationName.slice(0, 2));
      });

      console.log(`📍 Found ${relevantStations.length} stations near ${location}`);
      
      const stationSummary = relevantStations.slice(0, 5).map((station: any) => ({
        name: station.StationName,
        rain1hr: parseFloat(station.RainElement?.Past1hr?.Precipitation || 0),
        rain24hr: parseFloat(station.RainElement?.Past24hr?.Precipitation || 0),
        obsTime: station.ObsTime?.DateTime,
        coordinates: {
          lat: parseFloat(station.GeoInfo?.Coordinates?.[0]?.StationLatitude || 0),
          lng: parseFloat(station.GeoInfo?.Coordinates?.[0]?.StationLongitude || 0)
        }
      }));

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
      console.log(`⚠️ Unexpected API response structure`);
      console.log(`📋 Response data keys:`, Object.keys(data));
      
      return new Response(
        JSON.stringify({
          success: false,
          error: 'API response missing Station data',
          hasApiKey: true,
          responseStructure: Object.keys(data),
          fullResponse: data
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
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