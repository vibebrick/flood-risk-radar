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

    // Try free data sources first (GDELT Doc API -> Google News RSS), then fallback to mock
    const getTimespanDays = (r: number) => (r <= 300 ? 10 : r <= 700 ? 30 : 60);
    const mainLocation = extractLocationKeywords(searchLocation.address) || '該地區';
    const keywords = ['淹水','積水','水災','水患','豪雨','暴雨','排水','抽水','淹沒'];
    const queryTerm = `${mainLocation} (${keywords.join(' OR ')})`;
    const timespanDays = getTimespanDays(Number(searchRadius) || 0);

    const dedupeByUrl = (list: any[]) => {
      const seen = new Set<string>();
      return list.filter((item) => {
        const u = (item?.url || '').trim();
        if (!u || seen.has(u)) return false;
        seen.add(u);
        return true;
      });
    };

    const parseDate = (s: any) => {
      try {
        const d = new Date(s);
        if (!isNaN(d.getTime())) return d.toISOString();
      } catch (_) { /* ignore */ }
      return new Date().toISOString();
    };

    const fetchFromGDELT = async (): Promise<any[]> => {
      try {
        // Improve search query with more relevant terms
        const floodKeywords = ['flood', 'flooding', 'water', 'rain', 'storm', 'weather', '淹水', '積水', '水災', '豪雨'];
        const enhancedQuery = `${mainLocation} (${floodKeywords.join(' OR ')})`;
        const url = `https://api.gdeltproject.org/api/v2/doc/doc?query=${encodeURIComponent(enhancedQuery)}&format=json&timespan=${timespanDays}d&maxrecords=50&sort=datedesc&mode=artlist`;
        
        console.log('🔍 Fetching from GDELT with enhanced query:', enhancedQuery);
        const resp = await fetch(url, {
          headers: {
            'User-Agent': 'FloodRiskMonitor/1.0 (Education Research)',
            'Accept': 'application/json',
          },
          timeout: 10000
        });
        
        if (!resp.ok) {
          console.error(`GDELT API error: ${resp.status} ${resp.statusText}`);
          throw new Error(`GDELT HTTP ${resp.status}`);
        }
        
        const data = await resp.json();
        console.log('📄 GDELT raw response structure:', Object.keys(data));
        
        const articles = (data.articles || data.documents || []) as any[];
        console.log(`📰 Found ${articles.length} articles from GDELT`);
        
        const mapped = articles.map((a) => {
          const title = a.title || a.sourceArticleTitle || a.documentTitle || '無標題';
          const url = a.url || a.documentURL || a.sourceArticleURL;
          const source = a.sourceCommonName || a.domain || a.source || 'GDELT';
          const dateRaw = a.seendate || a.date || a.publishedDate || a.publishDate || a.datetime;
          const snippet = a.excerpt || a.snippet || a.summary || '';
          return {
            search_id: searchId,
            title,
            url,
            source,
            content_snippet: snippet,
            publish_date: parseDate(dateRaw),
            content_type: 'GDELT新聞',
            location_match_level: 'external_api',
            created_at: new Date().toISOString()
          };
        }).filter((n) => n.url && n.title !== '無標題');
        
        console.log(`✅ Successfully processed ${mapped.length} valid GDELT articles`);
        return dedupeByUrl(mapped);
      } catch (e) {
        console.error('❌ GDELT fetch failed:', e);
        return [];
      }
    };

    const fetchFromGoogleNewsRSS = async (): Promise<any[]> => {
      try {
        // Use more specific flood-related keywords for Taiwan news
        const floodTerms = ['淹水', '積水', '水災', '豪雨', '暴雨', '洪水', '排水'];
        const locationTerms = [mainLocation];
        
        // Create multiple search queries for better coverage
        const queries = [
          `${mainLocation} ${floodTerms.slice(0, 3).join(' OR ')}`,
          `${mainLocation} 淹水`,
          `${mainLocation} 豪雨`
        ];
        
        let allResults: any[] = [];
        
        for (const query of queries) {
          try {
            const rssUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=zh-TW&gl=TW&ceid=TW:zh-Hant&num=20`;
            console.log(`🔍 Fetching Google News RSS: "${query}"`);
            
            const resp = await fetch(rssUrl, {
              headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; FloodMonitor/1.0)',
                'Accept': 'application/rss+xml, application/xml, text/xml'
              },
              timeout: 8000
            });
            
            if (!resp.ok) {
              console.warn(`Google RSS query "${query}" failed: ${resp.status}`);
              continue;
            }
            
            const xml = await resp.text();
            const doc = new DOMParser().parseFromString(xml, 'text/xml');
            const items = Array.from(doc.getElementsByTagName('item'));
            
            console.log(`📰 Found ${items.length} RSS items for query: "${query}"`);
            
            const mapped = items.map((item) => {
              const title = item.getElementsByTagName('title')[0]?.textContent || '無標題';
              const link = item.getElementsByTagName('link')[0]?.textContent || '';
              const pubDate = item.getElementsByTagName('pubDate')[0]?.textContent || '';
              const description = item.getElementsByTagName('description')[0]?.textContent || '';
              const sourceEl = item.getElementsByTagName('source')[0];
              const source = sourceEl?.textContent || sourceEl?.getAttribute('url')?.split('/')[2] || 'Google News';
              
              return {
                search_id: searchId,
                title,
                url: link,
                source,
                content_snippet: description.substring(0, 200),
                publish_date: parseDate(pubDate),
                content_type: 'Google News',
                location_match_level: 'rss_search',
                created_at: new Date().toISOString()
              };
            }).filter((n) => n.url && n.title !== '無標題');
            
            allResults = allResults.concat(mapped);
          } catch (queryError) {
            console.warn(`Query "${query}" failed:`, queryError);
          }
        }
        
        const uniqueResults = dedupeByUrl(allResults);
        console.log(`✅ Successfully processed ${uniqueResults.length} unique Google News articles`);
        return uniqueResults.slice(0, 30);
        
      } catch (e) {
        console.error('❌ Google News RSS fetch failed:', e);
        return [];
      }
    };

    // Try multiple external sources and combine results
    let externalNews: any[] = [];
    
    console.log('🚀 Starting news fetch from external sources...');
    
    // Try both sources in parallel for better results
    const [gdeltNews, rssNews] = await Promise.allSettled([
      fetchFromGDELT(),
      fetchFromGoogleNewsRSS()
    ]);
    
    if (gdeltNews.status === 'fulfilled' && gdeltNews.value.length > 0) {
      console.log(`✅ GDELT returned ${gdeltNews.value.length} articles`);
      externalNews = externalNews.concat(gdeltNews.value);
    }
    
    if (rssNews.status === 'fulfilled' && rssNews.value.length > 0) {
      console.log(`✅ Google News returned ${rssNews.value.length} articles`);
      externalNews = externalNews.concat(rssNews.value);
    }
    
    // Deduplicate combined results
    externalNews = dedupeByUrl(externalNews);
    console.log(`📊 Combined external sources: ${externalNews.length} unique articles`);
    
    let resultNews = externalNews;

    // Only fallback to mock if no external sources returned any results
    if (resultNews.length === 0) {
      console.log('⚠️ No external news found, generating mock data...');
      const mockNews = generateMockFloodNews(searchLocation.address, searchId, searchRadius);
      // Mark mock news clearly
      const markedMockNews = mockNews.map(news => ({
        ...news,
        location_match_level: 'mock_data',
        content_type: `${news.content_type || '模擬新聞'} (示範資料)`
      }));
      resultNews = markedMockNews;
    }

    // Store the news in the database and return the inserted rows
    if (resultNews.length > 0) {
      const { data: inserted, error: insertNewsError } = await supabase
        .from('flood_news')
        .insert(resultNews)
        .select('*')
        .order('publish_date', { ascending: false });

      if (insertNewsError) {
        console.error('Error inserting news:', insertNewsError);
      } else if (inserted) {
        resultNews = inserted;
      }
    }

    console.log(`Prepared ${resultNews.length} news items (external or mock)`);

    // proceed to build heatmap points

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