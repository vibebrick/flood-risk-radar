import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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
    const { searchLocation, searchRadius } = await req.json();
    
    console.log('Searching for flood news:', { searchLocation, searchRadius });

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check if this location already exists in the database
    const { data: existingSearches, error: searchError } = await supabase
      .from('flood_searches')
      .select('*')
      .eq('latitude', searchLocation.latitude)
      .eq('longitude', searchLocation.longitude)
      .eq('search_radius', searchRadius);

    if (searchError) {
      console.error('Error checking existing searches:', searchError);
    }

    let searchId;
    
    if (existingSearches && existingSearches.length > 0) {
      // Update search count for existing location
      const existingSearch = existingSearches[0];
      const { data: updatedSearch, error: updateError } = await supabase
        .from('flood_searches')
        .update({ 
          search_count: existingSearch.search_count + 1,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingSearch.id)
        .select()
        .single();

      if (updateError) {
        console.error('Error updating search count:', updateError);
        throw updateError;
      }
      searchId = existingSearch.id;
    } else {
      // Create new search record
      const { data: newSearch, error: insertError } = await supabase
        .from('flood_searches')
        .insert({
          location_name: searchLocation.address,
          address: searchLocation.address,
          latitude: searchLocation.latitude,
          longitude: searchLocation.longitude,
          search_radius: searchRadius,
          search_count: 1
        })
        .select()
        .single();

      if (insertError) {
        console.error('Error creating search record:', insertError);
        throw insertError;
      }
      searchId = newSearch.id;
    }

    // Get existing news for this search
    const { data: existingNews, error: newsError } = await supabase
      .from('flood_news')
      .select('*')
      .eq('search_id', searchId);

    if (newsError) {
      console.error('Error fetching existing news:', newsError);
    }

    // If we already have news for this location, return it
    if (existingNews && existingNews.length > 0) {
      console.log(`Returning ${existingNews.length} existing news items`);
      return new Response(
        JSON.stringify({ 
          success: true, 
          news: existingNews,
          searchId: searchId,
          cached: true 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Search for flood-related news using simulated news search
    // In a real implementation, you would integrate with news APIs
    const mockNews = generateMockFloodNews(searchLocation.address, searchId);
    
    // Store the news in the database
    if (mockNews.length > 0) {
      const { error: insertNewsError } = await supabase
        .from('flood_news')
        .insert(mockNews);

      if (insertNewsError) {
        console.error('Error inserting news:', insertNewsError);
      }
    }

    console.log(`Generated ${mockNews.length} mock news items`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        news: mockNews,
        searchId: searchId,
        cached: false 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in search-flood-news function:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

function generateMockFloodNews(address: string, searchId: string) {
  // This is a mock implementation. In production, you would:
  // 1. Use Google News API or other news APIs
  // 2. Search for flood-related keywords + location
  // 3. Filter by date (last 5 years)
  // 4. Extract relevant information
  
  const locationKeywords = extractLocationKeywords(address);
  const mockNews = [];

  // Generate some sample news based on location
  if (Math.random() > 0.3) { // 70% chance of finding news
    const newsTemplates = [
      {
        title: `${locationKeywords}地區淹水風險評估報告`,
        source: "中央氣象署",
        content_snippet: "根據歷史降雨數據分析，該區域在颱風季節期間可能面臨輕微至中度淹水風險。建議居民注意排水系統維護。",
        url: "https://www.cwa.gov.tw/",
        publish_date: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        title: `${locationKeywords}排水系統改善工程完工`,
        source: "水利署",
        content_snippet: "為改善該區域淹水問題，政府投入大量資源進行排水系統升級改造，預期可大幅降低淹水機率。",
        url: "https://www.wra.gov.tw/",
        publish_date: new Date(Date.now() - Math.random() * 180 * 24 * 60 * 60 * 1000).toISOString()
      }
    ];

    const selectedNews = newsTemplates[Math.floor(Math.random() * newsTemplates.length)];
    mockNews.push({
      ...selectedNews,
      search_id: searchId,
      created_at: new Date().toISOString()
    });
  }

  return mockNews;
}

function extractLocationKeywords(address: string): string {
  // Extract meaningful location keywords from address
  const keywords = address.split(/[,，]/)[0]; // Get first part before comma
  return keywords.replace(/\d+號.*/, '').trim(); // Remove house numbers
}