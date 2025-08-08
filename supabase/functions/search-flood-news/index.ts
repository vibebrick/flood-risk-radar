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
      .eq('search_id', searchId)
      .order('publish_date', { ascending: false });

    if (newsError) {
      console.error('Error fetching existing news:', newsError);
    }

    // If we already have news for this location, return it
    if (existingNews && existingNews.length > 0) {
      console.log(`Returning ${existingNews.length} existing news items`);
      const points = generateHeatmapPoints(existingNews, searchLocation, searchRadius);
      return new Response(
        JSON.stringify({ 
          success: true, 
          news: existingNews,
          searchId: searchId,
          cached: true,
          points
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Search for flood-related news using simulated news search
    // In a real implementation, you would integrate with news APIs
    const mockNews = generateMockFloodNews(searchLocation.address, searchId, searchRadius);
    
    // Store the news in the database and return the inserted rows
    let resultNews = mockNews;
    if (mockNews.length > 0) {
      const { data: insertedNews, error: insertNewsError } = await supabase
        .from('flood_news')
        .insert(mockNews)
        .select('*')
        .order('publish_date', { ascending: false });

      if (insertNewsError) {
        console.error('Error inserting news:', insertNewsError);
      } else if (insertedNews) {
        resultNews = insertedNews;
      }
    }

    console.log(`Generated ${resultNews.length} mock news items`);

    const points = generateHeatmapPoints(resultNews, searchLocation, searchRadius);

    return new Response(
      JSON.stringify({ 
        success: true, 
        news: resultNews,
        searchId: searchId,
        cached: false,
        points
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

function generateMockFloodNews(address: string, searchId: string, searchRadius: number) {
  console.log(`Generating realistic flood news for address: ${address}`);
  
  const locationKeywords = extractLocationKeywords(address);
  const mainLocation = locationKeywords || '該地區';
  
  const isTainan = address.includes('台南') || address.includes('臺南') || address.includes('Tainan');

  // Helper to get a random date within a past-day window
  const days = 24 * 60 * 60 * 1000;
  const randInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
  const randomPastISO = (minDaysAgo: number, maxDaysAgo: number) => {
    const delta = randInt(minDaysAgo, maxDaysAgo) * days;
    return new Date(Date.now() - delta).toISOString();
  };

  // Radius-aware date windows
  const radius = Math.max(0, Number(searchRadius) || 0);
  const tainanMax = radius > 700 ? 21 : radius > 400 ? 14 : 10; // days back
  const otherMin = radius > 700 ? 45 : radius > 400 ? 30 : 15;   // min days back
  const otherMax = radius > 700 ? 90 : radius > 400 ? 60 : 45;   // max days back

  const tainanDate = () => randomPastISO(0, tainanMax);
  const otherDate = () => randomPastISO(otherMin, otherMax);
  
  let newsTemplates = [] as Array<{
    title: string;
    content_snippet: string;
    source: string;
    url: string;
    content_type?: string;
  }>;
  
  if (isTainan) {
    newsTemplates = [
      {
        title: `台南西南氣流重創！${mainLocation}積水深達50公分 居民急撤離`,
        content_snippet: `台南市多處嚴重積水，${mainLocation}一帶積水深度達50公分，多位居民緊急撤離。市府已啟動一級開設應變中心。`,
        source: '中央社',
        url: 'https://example.com/tainan-flood-1',
        content_type: '官方新聞'
      },
      {
        title: `[爆卦] 台南${mainLocation}根本變成威尼斯了！！！`,
        content_snippet: `本魯家住${mainLocation}附近，今天早上起床發現外面根本是海啊！機車全部都泡水了QQ 市長治水政策到底在幹嘛？`,
        source: 'PTT八卦板',
        url: 'https://example.com/tainan-flood-ptt',
        content_type: 'PTT討論'
      },
      {
        title: `台南${mainLocation}淹水實況 - 媽媽我想回家😭`,
        content_snippet: `今天經過${mainLocation}嚇死我了，水淹到小腿肚了還有人騎車過去。`,
        source: 'Dcard',
        url: 'https://example.com/tainan-flood-dcard',
        content_type: 'Dcard分享'
      },
      {
        title: `【台南${mainLocation}淹水】里長緊急通報：請大家避開這些路段！`,
        content_snippet: `${mainLocation}多處道路積水嚴重，請大家盡量避開以下路段：... 有需要協助的長輩請聯繫里辦公處。`,
        source: `台南${mainLocation}里Facebook社團`,
        url: 'https://example.com/tainan-flood-fb',
        content_type: 'Facebook社團'
      },
      {
        title: `#台南淹水 #${mainLocation} 網友直播淹水實況獲萬人觀看`,
        content_snippet: `直播中可見道路積水嚴重，部分車輛拋錨，網友留言：希望大家都平安。`,
        source: 'Instagram直播',
        url: 'https://example.com/tainan-flood-ig',
        content_type: 'Instagram直播'
      },
      {
        title: `台南災情慘重！${mainLocation}商家損失慘重 市府宣布災害補助`,
        content_snippet: `西南氣流造成的淹水災情讓${mainLocation}多家商店泡水，市府宣布啟動災害救助機制。`,
        source: '聯合新聞網',
        url: 'https://example.com/tainan-flood-gov',
        content_type: '官方新聞'
      }
    ];
  } else {
    newsTemplates = [
      {
        title: `${mainLocation}豪雨成災 積水深度破紀錄`,
        content_snippet: `近日降雨造成${mainLocation}嚴重積水，部分路段積水超過40公分。`,
        source: '台灣新聞網',
        url: 'https://example.com/flood-1',
        content_type: '官方新聞'
      },
      {
        title: `[分享] ${mainLocation}淹水了...大家小心啊`,
        content_snippet: `剛才經過${mainLocation}，整條路都是水，建議大家繞路。`,
        source: 'Dcard',
        url: 'https://example.com/flood-dcard',
        content_type: 'Dcard分享'
      },
      {
        title: `${mainLocation}居民Line群組：「又淹了！大家互相照應」`,
        content_snippet: `${mainLocation}社區Line群組回報淹水狀況並互相提醒注意安全。`,
        source: '在地社區Line群組',
        url: 'https://example.com/flood-line',
        content_type: 'Line群組討論'
      },
      {
        title: `${mainLocation}Facebook社團爆料：「排水系統到底什麼時候要修？」`,
        content_snippet: `${mainLocation}社團出現大量淹水抱怨文，居民質疑排水設施長期未改善。`,
        source: '地區Facebook社團',
        url: 'https://example.com/flood-fb',
        content_type: 'Facebook社團'
      },
      {
        title: `氣候變遷衝擊 ${mainLocation}淹水頻率增加`,
        content_snippet: `專家指出極端氣候導致${mainLocation}淹水事件頻率上升。`,
        source: '環境資訊中心',
        url: 'https://example.com/flood-expert',
        content_type: '專家分析'
      },
      {
        title: `${mainLocation}淹水警戒！水利署發布一級警報`,
        content_snippet: `因應持續降雨，水利署針對${mainLocation}發布淹水一級警報。`,
        source: '水利署',
        url: 'https://example.com/flood-alert',
        content_type: '官方警報'
      }
    ];
  }

  const newsCount = isTainan ? Math.min(newsTemplates.length, 3 + Math.floor(Math.random() * 3)) : Math.floor(Math.random() * 3) + 2;
  const selectedNews = newsTemplates.slice(0, newsCount);

  console.log(`Generated ${selectedNews.length} realistic news items for ${isTainan ? 'Tainan flood event' : 'general flood news'}`);

  return selectedNews.map((news) => ({
    search_id: searchId,
    title: news.title,
    content_snippet: news.content_snippet,
    source: news.source,
    url: news.url,
    publish_date: (isTainan ? tainanDate() : otherDate()),
    content_type: news.content_type || '一般新聞',
    created_at: new Date().toISOString()
  }));
}

function extractLocationKeywords(address: string): string {
  // Extract meaningful location keywords from address
  const keywords = address.split(/[,，]/)[0]; // Get first part before comma
  return keywords.replace(/\d+號.*/, '').trim(); // Remove house numbers
}

function generateHeatmapPoints(news: any[], center: { latitude: number; longitude: number }, radiusMeters: number) {
  const R = 6371000; // Earth radius in meters
  const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));
  const maxDist = Math.max(50, Math.min(radiusMeters, 1500)); // cap spread for focus

  return news.map((n) => {
    const angle = Math.random() * 2 * Math.PI;
    const dist = Math.random() * maxDist;
    const dByR = dist / R;

    const lat1 = center.latitude * Math.PI / 180;
    const lon1 = center.longitude * Math.PI / 180;

    const lat2 = Math.asin(Math.sin(lat1) * Math.cos(dByR) + Math.cos(lat1) * Math.sin(dByR) * Math.cos(angle));
    const lon2 = lon1 + Math.atan2(Math.sin(angle) * Math.sin(dByR) * Math.cos(lat1), Math.cos(dByR) - Math.sin(lat1) * Math.sin(lat2));

    const latitude = lat2 * 180 / Math.PI;
    const longitude = lon2 * 180 / Math.PI;

    let weight = 0.7;
    try {
      if (n.publish_date) {
        const days = Math.max(0, (Date.now() - new Date(n.publish_date).getTime()) / (1000 * 60 * 60 * 24));
        weight = clamp(1 - days / 30, 0.3, 1);
      }
    } catch (_e) { /* ignore */ }

    return { latitude, longitude, weight: Number(weight.toFixed(2)) };
  });
}