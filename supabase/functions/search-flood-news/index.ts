import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { DOMParser } from "https://deno.land/x/deno_dom@v0.1.45/deno-dom-wasm.ts"

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
      const points = await generateHeatmapPoints(existingNews, searchLocation, searchRadius, supabase);
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

    // Extract location information
    const address = searchLocation.address;
    const mainLocation = extractLocationKeywords(address) || '該地區';

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

    // Enhanced location relevancy scoring
    const calculateLocationRelevance = (title: string, content: string, targetLocation: string): number => {
      let score = 0;
      const locationParts = targetLocation.split(/[,\s]+/).filter(p => p.length > 1);
      const textToCheck = (title + ' ' + content).toLowerCase();
      
      locationParts.forEach(part => {
        if (textToCheck.includes(part.toLowerCase())) {
          score += part.length > 2 ? 2 : 1;
        }
      });
      
      return score;
    };

    // Enhanced flood relevancy scoring
    const calculateFloodRelevance = (title: string, content: string): number => {
      const floodTerms = [
        { terms: ['淹水', '積水', '水災'], weight: 3 },
        { terms: ['豪雨', '暴雨', '洪水'], weight: 2 },
        { terms: ['颱風', '颶風', '強降雨'], weight: 2 },
        { terms: ['排水', '下水道', '道路封閉'], weight: 1 },
        { terms: ['flood', 'flooding', 'inundation'], weight: 3 },
        { terms: ['heavy rain', 'storm', 'typhoon'], weight: 2 }
      ];
      
      let score = 0;
      const textToCheck = (title + ' ' + content).toLowerCase();
      
      floodTerms.forEach(({ terms, weight }) => {
        terms.forEach(term => {
          if (textToCheck.includes(term.toLowerCase())) {
            score += weight;
          }
        });
      });
      
      return score;
    };

    const fetchFromGDELT = async (): Promise<any[]> => {
      try {
        // More precise GDELT query focused on Taiwan and specific location
        const taiwanRegionFilter = 'Taiwan OR 台灣 OR 臺灣';
        const floodKeywords = '(淹水 OR 積水 OR 水災 OR 豪雨 OR 暴雨 OR 洪水 OR flood OR flooding)';
        
        // Build query with location AND flood terms
        const gdeltQuery = `"${mainLocation}" AND ${floodKeywords} AND (${taiwanRegionFilter})`;
        console.log(`🔍 Fetching from GDELT with precise query: ${gdeltQuery}`);
        
        const response = await fetch(`https://api.gdeltproject.org/api/v2/doc/doc?query=${encodeURIComponent(gdeltQuery)}&mode=artlist&maxrecords=40&sort=datedesc&format=json&TIMESPAN=60DAYS&SOURCECOUNTRY=TW`, {
          headers: {
            'User-Agent': 'FloodMonitor/1.0 Taiwan Flood Alert System',
            'Accept': 'application/json'
          },
          timeout: 12000
        });
        
        if (!response.ok) {
          console.warn(`GDELT API request failed: ${response.status}`);
          return [];
        }
        
        const data = await response.json();
        console.log(`📄 GDELT raw response structure: ${JSON.stringify(Object.keys(data))}`);
        
        if (!data.articles || !Array.isArray(data.articles)) {
          console.warn('GDELT response missing articles array');
          return [];
        }
        
        console.log(`📰 Found ${data.articles.length} articles from GDELT`);
        
        const mapped = data.articles
          .filter((article: any) => {
            const title = article.title || '';
            const url = article.url || '';
            
            if (!title || !url) return false;
            
            // Calculate relevance scores
            const locationScore = calculateLocationRelevance(title, '', address);
            const floodScore = calculateFloodRelevance(title, '');
            
            // Require minimum relevance
            return locationScore >= 1 && floodScore >= 1;
          })
          .map((article: any) => {
            const title = article.title || '無標題';
            const content = article.socialimage?.description || '';
            
            return {
              search_id: searchId,
              title,
              url: article.url || '',
              source: article.domain || 'GDELT',
              content_snippet: content.substring(0, 200),
              publish_date: article.seendate ? new Date(article.seendate) : new Date(),
              content_type: 'GDELT',
              location_match_level: 'high_relevance',
              relevance_score: calculateLocationRelevance(title, content, address) + calculateFloodRelevance(title, content),
              created_at: new Date().toISOString()
            };
          })
          .sort((a, b) => (b.relevance_score || 0) - (a.relevance_score || 0))
          .slice(0, 25); // Take top 25 most relevant
        
        console.log(`✅ Successfully processed ${mapped.length} highly relevant GDELT articles`);
        return dedupeByUrl(mapped);
      } catch (e) {
        console.error('❌ GDELT fetch failed:', e);
        return [];
      }
    };

    const fetchFromGoogleNewsRSS = async (): Promise<any[]> => {
      try {
        // Precise location-based flood news queries
        const precisQueries = [
          `"${mainLocation}" 淹水`,
          `"${mainLocation}" 積水`,
          `"${mainLocation}" 豪雨`,
          `"${address.split(',')[0]}" 水災`
        ];
        
        let allResults: any[] = [];
        
        for (const query of precisQueries) {
          try {
            const rssUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=zh-TW&gl=TW&ceid=TW:zh-Hant&num=15`;
            console.log(`🔍 Fetching Google News RSS: "${query}"`);
            
            const resp = await fetch(rssUrl, {
              headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; TaiwanFloodAlert/1.0)',
                'Accept': 'application/rss+xml, application/xml, text/xml',
                'Accept-Language': 'zh-TW,zh;q=0.9,en;q=0.8'
              },
              timeout: 10000
            });
            
            if (!resp.ok) {
              console.warn(`Google RSS query "${query}" failed: ${resp.status}`);
              continue;
            }
            
            const xml = await resp.text();
            
            // Use the imported DOMParser from deno_dom
            const doc = new DOMParser().parseFromString(xml, 'text/xml');
            
            if (!doc) {
              console.warn(`Failed to parse XML for query: "${query}"`);
              continue;
            }
            
            const items = Array.from(doc.getElementsByTagName('item'));
            console.log(`📰 Found ${items.length} RSS items for query: "${query}"`);
            
            const mapped = items
              .map((item) => {
                const title = item.getElementsByTagName('title')[0]?.textContent || '無標題';
                const link = item.getElementsByTagName('link')[0]?.textContent || '';
                const pubDate = item.getElementsByTagName('pubDate')[0]?.textContent || '';
                const description = item.getElementsByTagName('description')[0]?.textContent || '';
                const sourceEl = item.getElementsByTagName('source')[0];
                const source = sourceEl?.textContent || sourceEl?.getAttribute('url')?.split('/')[2] || 'Google News';
                
                // Calculate relevance for this article
                const locationScore = calculateLocationRelevance(title, description, address);
                const floodScore = calculateFloodRelevance(title, description);
                
                return {
                  search_id: searchId,
                  title,
                  url: link,
                  source,
                  content_snippet: description.substring(0, 200),
                  publish_date: parseDate(pubDate),
                  content_type: 'Google News',
                  location_match_level: locationScore >= 2 ? 'high_relevance' : 'medium_relevance',
                  relevance_score: locationScore + floodScore,
                  created_at: new Date().toISOString()
                };
              })
              .filter((n) => {
                // Only include articles with minimum relevance
                return n.url && n.title !== '無標題' && (n.relevance_score || 0) >= 2;
              });
            
            allResults = allResults.concat(mapped);
          } catch (queryError) {
            console.error(`Query "${query}" failed:`, queryError);
          }
        }
        
        // Sort by relevance and take top results
        const sortedResults = dedupeByUrl(allResults).sort((a, b) => (b.relevance_score || 0) - (a.relevance_score || 0));
        console.log(`✅ Successfully processed ${sortedResults.length} relevant Google News articles`);
        return sortedResults.slice(0, 15);
      } catch (e) {
        console.error('❌ Google News RSS fetch failed:', e);
        return [];
      }
    };

    // Fetch news from external sources with enhanced relevancy
    console.log('🚀 Starting enhanced news fetch with relevancy filtering...');
    const [gdeltResults, googleResults] = await Promise.allSettled([
      fetchFromGDELT(),
      fetchFromGoogleNewsRSS()
    ]);

    let externalNews: any[] = [];
    
    if (gdeltResults.status === 'fulfilled') {
      externalNews = externalNews.concat(gdeltResults.value);
      console.log(`✅ GDELT returned ${gdeltResults.value.length} relevant articles`);
    } else {
      console.error('❌ GDELT failed:', gdeltResults.reason);
    }
    
    if (googleResults.status === 'fulfilled') {
      externalNews = externalNews.concat(googleResults.value);
      console.log(`✅ Google News returned ${googleResults.value.length} relevant articles`);
    } else {
      console.error('❌ Google News failed:', googleResults.reason);
    }

    // Remove duplicates and sort by relevance
    externalNews = dedupeByUrl(externalNews).sort((a, b) => (b.relevance_score || 0) - (a.relevance_score || 0));
    console.log(`📊 Combined external sources: ${externalNews.length} unique, relevant articles`);

    // Only use mock data if absolutely no relevant news is found
    if (externalNews.length === 0) {
      console.log('📝 No relevant external news found, generating contextual mock data...');
      externalNews = generateMockFloodNews(address, searchId, searchRadius);
      // Mark mock data clearly
      externalNews.forEach(item => {
        item.content_type = 'Mock Data';
        item.location_match_level = 'simulated';
      });
    } else {
      console.log(`🎯 Found ${externalNews.length} relevant news articles - no mock data needed`);
    }

    // Store the news in the database and return the inserted rows
    if (externalNews.length > 0) {
      const { data: inserted, error: insertNewsError } = await supabase
        .from('flood_news')
        .insert(externalNews)
        .select('*')
        .order('publish_date', { ascending: false });

      if (insertNewsError) {
        console.error('Error inserting news:', insertNewsError);
      } else if (inserted) {
        externalNews = inserted;
      }
    }

    console.log(`Prepared ${externalNews.length} news items (external or mock)`);

    // Generate heatmap points based on real flood incidents from the database
    const points = await generateHeatmapPoints(externalNews, searchLocation, searchRadius, supabase);

    return new Response(
      JSON.stringify({ 
        success: true, 
        news: externalNews,
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

/**
 * Generates heatmap points based on real flood incidents from the database
 */
async function generateHeatmapPoints(news: any[], searchLocation: any, searchRadius: number, supabaseClient: any): Promise<any[]> {
  console.log(`Generating heatmap points for search area...`);
  
  const centerLat = searchLocation.latitude;
  const centerLon = searchLocation.longitude;
  
  try {
    // Fetch real flood incidents within the search radius
    const { data: floodIncidents, error } = await supabaseClient.rpc('get_flood_incidents_within_radius', {
      center_lat: centerLat,
      center_lon: centerLon,
      radius_meters: searchRadius
    });

    if (error) {
      console.error('Error fetching flood incidents for heatmap:', error);
      return generateFallbackHeatmapPoints(searchLocation, searchRadius);
    }

    if (!floodIncidents || floodIncidents.length === 0) {
      console.log('No flood incidents found, generating fallback points');
      return generateFallbackHeatmapPoints(searchLocation, searchRadius);
    }

    console.log(`Found ${floodIncidents.length} real flood incidents for heatmap`);

    // Convert flood incidents to heatmap points
    const points = floodIncidents.map((incident: any) => {
      // Calculate time-based weight (more recent incidents have higher weight)
      const incidentDate = new Date(incident.incident_date);
      const now = new Date();
      const daysDiff = (now.getTime() - incidentDate.getTime()) / (1000 * 60 * 60 * 24);
      const timeWeight = Math.max(0.1, 1 - (daysDiff / 365)); // Decay over 1 year
      
      // Severity-based weight
      const severityWeight = (incident.severity_level || 1) / 3;
      
      // Distance-based weight (closer incidents have higher weight)
      const distanceWeight = Math.max(0.2, 1 - (incident.distance_meters / searchRadius));
      
      const combinedWeight = (timeWeight * 0.4) + (severityWeight * 0.4) + (distanceWeight * 0.2);
      
      return {
        latitude: parseFloat(incident.latitude),
        longitude: parseFloat(incident.longitude),
        weight: Math.min(1.0, Math.max(0.1, combinedWeight)),
        intensity: Math.min(1.0, Math.max(0.1, combinedWeight)),
        source: 'real_incident',
        severity: incident.severity_level,
        date: incident.incident_date
      };
    });

    console.log(`Generated ${points.length} heatmap points from real incidents`);
    return points;

  } catch (error) {
    console.error('Error generating heatmap points:', error);
    return generateFallbackHeatmapPoints(searchLocation, searchRadius);
  }
}

/**
 * Fallback heatmap generation when no real data is available
 */
function generateFallbackHeatmapPoints(searchLocation: any, searchRadius: number): any[] {
  console.log('Generating fallback heatmap points...');
  
  const points = [];
  const centerLat = searchLocation.latitude;
  const centerLon = searchLocation.longitude;
  
  // Generate fewer, more realistic points
  const pointCount = Math.floor(searchRadius / 200) + 2; // Scale with radius
  
  for (let i = 0; i < pointCount; i++) {
    const angle = Math.random() * 2 * Math.PI;
    const distance = Math.random() * searchRadius * 0.8; // Stay within 80% of radius
    
    const latOffset = (distance * Math.cos(angle)) / 111000;
    const lonOffset = (distance * Math.sin(angle)) / (111000 * Math.cos(centerLat * Math.PI / 180));
    
    const weight = Math.random() * 0.6 + 0.2; // Lower weights for fallback
    
    points.push({
      latitude: centerLat + latOffset,
      longitude: centerLon + lonOffset,
      weight: weight,
      intensity: weight,
      source: 'fallback'
    });
  }
  
  console.log(`Generated ${points.length} fallback heatmap points`);
  return points;
}