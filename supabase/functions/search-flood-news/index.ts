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
  console.log(`Generating realistic flood news for address: ${address}`);
  
  const locationKeywords = extractLocationKeywords(address);
  const mainLocation = locationKeywords || '該地區';
  
  // Check if this is Tainan area for specific 2025/8/2 flood event
  const isTainan = address.includes('台南') || address.includes('臺南') || address.includes('Tainan');
  
  let newsTemplates = [];
  
  if (isTainan) {
    // Specific news for Tainan August 2025 flood event
    newsTemplates = [
      {
        title: `台南西南氣流重創！${mainLocation}積水深達50公分 居民急撤離`,
        content_snippet: `2025年8月2日西南氣流帶來強降雨，台南市多處嚴重積水，${mainLocation}一帶積水深度達50公分，多位居民緊急撤離。市府已啟動一級開設應變中心。`,
        source: '中央社',
        url: 'https://example.com/tainan-flood-1',
        publish_date: '2025-08-02T08:00:00.000Z'
      },
      {
        title: `【即時】台南豪雨不斷 ${mainLocation}道路成河流 車輛拋錨`,
        content_snippet: `持續性豪雨造成台南市區多處道路積水，${mainLocation}主要道路完全無法通行，已有多輛汽機車拋錨受困。`,
        source: '自由時報',
        url: 'https://example.com/tainan-flood-2',
        publish_date: '2025-08-02T10:30:00.000Z'
      },
      {
        title: `台南市民怨：${mainLocation}年年淹水何時了？排水系統亟需改善`,
        content_snippet: `西南氣流再度重創台南，${mainLocation}居民在社群媒體發聲，質疑市府治水政策效果，要求儘速改善排水設施。`,
        source: 'PTT八卦板',
        url: 'https://example.com/tainan-flood-3',
        publish_date: '2025-08-03T14:00:00.000Z'
      },
      {
        title: `台南災情慘重！${mainLocation}商家損失慘重 市府宣布災害補助`,
        content_snippet: `西南氣流造成的淹水災情，讓${mainLocation}多家商店泡水，估計損失上百萬元。台南市政府宣布啟動災害救助機制。`,
        source: '聯合新聞網',
        url: 'https://example.com/tainan-flood-4',
        publish_date: '2025-08-04T09:15:00.000Z'
      },
      {
        title: `台南淹水影片瘋傳 ${mainLocation}機車騎士涉水前進`,
        content_snippet: `網友在社群平台分享${mainLocation}淹水影片，只見機車騎士小心翼翼涉水前進，引發網友熱議台南排水問題。`,
        source: 'Dcard',
        url: 'https://example.com/tainan-flood-5',
        publish_date: '2025-08-02T16:45:00.000Z'
      }
    ];
  } else {
    // General flood-related news for other areas
    newsTemplates = [
      {
        title: `${mainLocation}豪雨成災 積水深度破紀錄`,
        content_snippet: `近日持續降雨造成${mainLocation}地區嚴重積水，部分路段積水深度超過40公分，影響交通及民眾生活。`,
        source: '台灣新聞網',
        url: 'https://example.com/flood-1',
        publish_date: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        title: `氣候變遷衝擊 ${mainLocation}淹水頻率增加`,
        content_snippet: `專家指出，極端氣候導致${mainLocation}淹水事件頻率明顯上升，呼籲政府應加強防災準備及基礎設施改善。`,
        source: '環境資訊中心',
        url: 'https://example.com/flood-2',
        publish_date: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        title: `${mainLocation}民眾自救！社區組織防汛志工隊`,
        content_snippet: `${mainLocation}居民因應淹水威脅，自發組織防汛志工隊，進行社區防災演練及緊急應變準備。`,
        source: '地方新聞台',
        url: 'https://example.com/flood-3',
        publish_date: new Date(Date.now() - Math.random() * 14 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        title: `${mainLocation}淹水警戒！水利署發布一級警報`,
        content_snippet: `因應持續降雨，水利署針對${mainLocation}地區發布淹水一級警報，呼籲民眾避免前往低窪地區。`,
        source: '水利署',
        url: 'https://example.com/flood-4',
        publish_date: new Date(Date.now() - Math.random() * 3 * 24 * 60 * 60 * 1000).toISOString()
      }
    ];
  }

  // For Tainan, always return multiple relevant news items
  // For other areas, vary the count but ensure at least some news
  const newsCount = isTainan ? Math.min(newsTemplates.length, 3 + Math.floor(Math.random() * 2)) : Math.floor(Math.random() * 3) + 1;
  const selectedNews = newsTemplates.slice(0, newsCount);
  
  console.log(`Generated ${selectedNews.length} realistic news items for ${isTainan ? 'Tainan flood event' : 'general flood news'}`);
  
  return selectedNews.map((news, index) => ({
    id: `${searchId}-${index}`,
    search_id: searchId,
    title: news.title,
    content_snippet: news.content_snippet,
    source: news.source,
    url: news.url,
    publish_date: news.publish_date,
    created_at: new Date().toISOString()
  }));
}

function extractLocationKeywords(address: string): string {
  // Extract meaningful location keywords from address
  const keywords = address.split(/[,，]/)[0]; // Get first part before comma
  return keywords.replace(/\d+號.*/, '').trim(); // Remove house numbers
}