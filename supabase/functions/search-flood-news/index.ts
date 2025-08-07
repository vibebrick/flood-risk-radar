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
    // Specific news for Tainan August 2025 flood event with social media discussions
    newsTemplates = [
      {
        title: `台南西南氣流重創！${mainLocation}積水深達50公分 居民急撤離`,
        content_snippet: `2025年8月2日西南氣流帶來強降雨，台南市多處嚴重積水，${mainLocation}一帶積水深度達50公分，多位居民緊急撤離。市府已啟動一級開設應變中心。`,
        source: '中央社',
        url: 'https://example.com/tainan-flood-1',
        publish_date: '2025-08-02T08:00:00.000Z',
        content_type: '官方新聞'
      },
      {
        title: `[爆卦] 台南${mainLocation}根本變成威尼斯了！！！`,
        content_snippet: `本魯家住${mainLocation}附近，今天早上起床發現外面根本是海啊！機車全部都泡水了QQ 市長治水政策到底在幹嘛？每年都說要改善結果咧？ 推文：噓 god123: 又在亂 08/02 10:23 → rain456: 真的誇張，我家也淹了 08/02 10:24`,
        source: 'PTT八卦板',
        url: 'https://example.com/tainan-flood-ptt',
        publish_date: '2025-08-02T10:15:00.000Z',
        content_type: 'PTT討論'
      },
      {
        title: `台南${mainLocation}淹水實況 - 媽媽我想回家😭`,
        content_snippet: `ㄨㄚˊ賽！今天經過${mainLocation}嚇死我了，水淹到小腿肚了還有人騎車過去，根本玩命關頭台南版。拍了影片給大家看看現況... B1: 太扯了吧 B2: 政府快出來負責啊 B3: 台南治水真的要加油了`,
        source: 'Dcard',
        url: 'https://example.com/tainan-flood-dcard',
        publish_date: '2025-08-02T14:30:00.000Z',
        content_type: 'Dcard分享'
      },
      {
        title: `【台南${mainLocation}淹水】里長緊急通報：請大家避開這些路段！`,
        content_snippet: `各位里民大家好！因為西南氣流影響，${mainLocation}多處道路積水嚴重，請大家盡量避開以下路段：... 有需要協助的長輩請聯繫里辦公處，我們有志工可以幫忙。大家互相幫忙，平安度過這次風雨！`,
        source: '台南${mainLocation}里Facebook社團',
        url: 'https://example.com/tainan-flood-fb',
        publish_date: '2025-08-02T11:45:00.000Z',
        content_type: 'Facebook社團'
      },
      {
        title: `Line群組瘋傳！${mainLocation}淹水照片集 居民互助自救`,
        content_snippet: `台南${mainLocation}居民Line群組瘋傳淹水現況照片，群組內居民紛紛分享即時路況、提供載送服務，展現鄰里互助精神。有居民表示：「雖然淹水很慘，但看到大家互相幫忙很感動」`,
        source: '在地生活Line群組',
        url: 'https://example.com/tainan-flood-line',
        publish_date: '2025-08-02T16:20:00.000Z',
        content_type: 'Line群組討論'
      },
      {
        title: `#台南淹水 #${mainLocation} 網友直播淹水實況獲萬人觀看`,
        content_snippet: `網友在IG直播${mainLocation}淹水實況，吸引上萬人觀看。直播中可見道路積水嚴重，部分車輛拋錨，網友留言：「台南治水真的要加油」、「希望大家都平安」。直播主呼籲大家注意安全。`,
        source: 'Instagram直播',
        url: 'https://example.com/tainan-flood-ig',
        publish_date: '2025-08-02T13:15:00.000Z',
        content_type: 'Instagram直播'
      },
      {
        title: `台南災情慘重！${mainLocation}商家損失慘重 市府宣布災害補助`,
        content_snippet: `西南氣流造成的淹水災情，讓${mainLocation}多家商店泡水，估計損失上百萬元。台南市政府宣布啟動災害救助機制，受災戶可申請相關補助。`,
        source: '聯合新聞網',
        url: 'https://example.com/tainan-flood-gov',
        publish_date: '2025-08-04T09:15:00.000Z',
        content_type: '官方新聞'
      }
    ];
  } else {
    // General flood-related news for other areas with social media content
    newsTemplates = [
      {
        title: `${mainLocation}豪雨成災 積水深度破紀錄`,
        content_snippet: `近日持續降雨造成${mainLocation}地區嚴重積水，部分路段積水深度超過40公分，影響交通及民眾生活。當地里長呼籲居民注意安全。`,
        source: '台灣新聞網',
        url: 'https://example.com/flood-1',
        publish_date: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
        content_type: '官方新聞'
      },
      {
        title: `[分享] ${mainLocation}淹水了...大家小心啊`,
        content_snippet: `剛才經過${mainLocation}，整條路都是水耶！看起來有膝蓋高，建議大家繞路。已經看到好幾台車在那邊拋錨了QQ 有人知道其他路況嗎？ 留言：真的假的？我等等要經過 / 謝謝分享，我改走別條路`,
        source: 'Dcard',
        url: 'https://example.com/flood-dcard',
        publish_date: new Date(Date.now() - Math.random() * 1 * 24 * 60 * 60 * 1000).toISOString(),
        content_type: 'Dcard分享'
      },
      {
        title: `${mainLocation}居民Line群組：「又淹了！大家互相照應」`,
        content_snippet: `${mainLocation}社區Line群組今天特別熱鬧，居民紛紛回報淹水狀況並互相提醒注意安全。有熱心鄰居主動提供接送服務，展現社區互助精神。`,
        source: '在地社區Line群組',
        url: 'https://example.com/flood-line',
        publish_date: new Date(Date.now() - Math.random() * 2 * 24 * 60 * 60 * 1000).toISOString(),
        content_type: 'Line群組討論'
      },
      {
        title: `${mainLocation}Facebook社團爆料：「排水系統到底什麼時候要修？」`,
        content_snippet: `${mainLocation}地區Facebook社團出現大量淹水抱怨文，居民質疑排水設施長期未改善，每逢大雨必淹。有網友整理歷年淹水照片對比，引發熱烈討論。`,
        source: '地區Facebook社團',
        url: 'https://example.com/flood-fb',
        publish_date: new Date(Date.now() - Math.random() * 3 * 24 * 60 * 60 * 1000).toISOString(),
        content_type: 'Facebook社團'
      },
      {
        title: `氣候變遷衝擊 ${mainLocation}淹水頻率增加`,
        content_snippet: `專家指出，極端氣候導致${mainLocation}淹水事件頻率明顯上升，呼籲政府應加強防災準備及基礎設施改善。`,
        source: '環境資訊中心',
        url: 'https://example.com/flood-expert',
        publish_date: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
        content_type: '專家分析'
      },
      {
        title: `${mainLocation}淹水警戒！水利署發布一級警報`,
        content_snippet: `因應持續降雨，水利署針對${mainLocation}地區發布淹水一級警報，呼籲民眾避免前往低窪地區。`,
        source: '水利署',
        url: 'https://example.com/flood-alert',
        publish_date: new Date(Date.now() - Math.random() * 3 * 24 * 60 * 60 * 1000).toISOString(),
        content_type: '官方警報'
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
    content_type: news.content_type || '一般新聞',
    created_at: new Date().toISOString()
  }));
}

function extractLocationKeywords(address: string): string {
  // Extract meaningful location keywords from address
  const keywords = address.split(/[,，]/)[0]; // Get first part before comma
  return keywords.replace(/\d+號.*/, '').trim(); // Remove house numbers
}