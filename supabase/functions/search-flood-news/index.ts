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
    // Parse request body with enhanced error handling
    let requestBody;
    try {
      requestBody = await req.json();
    } catch (parseError) {
      console.error('Failed to parse request body:', parseError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Invalid JSON in request body' 
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }
    
    console.log('Processing search request:', requestBody);
    
    // Extract and validate parameters
    const { searchLocation, searchRadius } = requestBody || {};
    
    // Enhanced parameter validation
    if (!searchLocation) {
      console.error('Missing searchLocation parameter');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'searchLocation parameter is required' 
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }
    
    if (typeof searchLocation.latitude !== 'number' || typeof searchLocation.longitude !== 'number') {
      console.error('Invalid coordinates in searchLocation:', searchLocation);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'searchLocation must contain valid numeric latitude and longitude coordinates' 
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }
    
    if (typeof searchRadius !== 'number' || searchRadius <= 0) {
      console.error('Invalid searchRadius parameter:', searchRadius);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'searchRadius must be a positive number' 
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }
    
    console.log('✅ Validated search parameters:', { 
      coordinates: `${searchLocation.latitude}, ${searchLocation.longitude}`,
      address: searchLocation.address,
      radius: `${searchRadius}m`
    });

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check existing searches and update/create search record
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
      console.log('📊 Updated existing search record:', searchId);
    } else {
      // Create new search record
      const { data: newSearch, error: insertError } = await supabase
        .from('flood_searches')
        .insert({
          location_name: searchLocation.address || `${searchLocation.latitude}, ${searchLocation.longitude}`,
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
      console.log('📝 Created new search record:', searchId);
    }

    // Check for existing recent news (within 24 hours)
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: existingNews, error: newsError } = await supabase
      .from('flood_news')
      .select('*')
      .eq('search_id', searchId)
      .gte('fetched_at', twentyFourHoursAgo)
      .order('publish_date', { ascending: false });

    if (newsError) {
      console.error('Error fetching existing news:', newsError);
    }

    // Return cached news if it's recent and substantial
    if (existingNews && existingNews.length >= 3) {
      console.log(`🔄 Returning ${existingNews.length} cached news items (fetched within 24h)`);
      const points = await generateHeatmapPoints(existingNews, searchLocation, searchRadius, supabase);
      return new Response(
        JSON.stringify({ 
          success: true, 
          news: existingNews,
          searchId: searchId,
          cached: true,
          points,
          dataSource: 'cached'
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Extract location information for search queries
    const address = searchLocation.address || '';
    const mainLocation = extractLocationKeywords(address);
    
    console.log('🎯 Extracted location keywords:', mainLocation);

    // Utility functions
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

    // Enhanced relevancy scoring algorithms
    const calculateLocationRelevance = (title: string, content: string, targetLocation: string): number => {
      let score = 0;
      const locationParts = targetLocation.split(/[,\s]+/).filter(p => p.length > 1);
      const textToCheck = (title + ' ' + content).toLowerCase();
      
      locationParts.forEach(part => {
        const partLower = part.toLowerCase();
        if (textToCheck.includes(partLower)) {
          // Higher score for longer, more specific location names
          score += partLower.length > 3 ? 3 : (partLower.length > 2 ? 2 : 1);
        }
        
        // Bonus for exact matches in title
        if (title.toLowerCase().includes(partLower)) {
          score += 2;
        }
      });
      
      return score;
    };

    const calculateFloodRelevance = (title: string, content: string): number => {
      const floodTerms = [
        { terms: ['淹水', '積水', '水災'], weight: 4 },
        { terms: ['豪雨', '暴雨', '洪水', '大雨'], weight: 3 },
        { terms: ['颱風', '颶風', '強降雨', '梅雨'], weight: 3 },
        { terms: ['排水', '下水道', '道路封閉', '交通中斷'], weight: 2 },
        { terms: ['災情', '災害', '受災'], weight: 2 },
        { terms: ['flood', 'flooding', 'inundation'], weight: 4 },
        { terms: ['heavy rain', 'storm', 'typhoon'], weight: 3 },
        { terms: ['drainage', 'sewer', 'road closure'], weight: 2 }
      ];
      
      let score = 0;
      const textToCheck = (title + ' ' + content).toLowerCase();
      
      floodTerms.forEach(({ terms, weight }) => {
        terms.forEach(term => {
          if (textToCheck.includes(term.toLowerCase())) {
            score += weight;
            // Bonus for terms in title
            if (title.toLowerCase().includes(term.toLowerCase())) {
              score += 1;
            }
          }
        });
      });
      
      return score;
    };

    // Enhanced Government Open Data API integration
    const fetchGovernmentFloodData = async (): Promise<any[]> => {
      console.log('🏛️ Fetching government flood data...');
      try {
        const results: any[] = [];
        
        // Taiwan Water Resources Agency flood alerts
        try {
          const waterResponse = await fetch('https://data.gov.tw/api/v1/rest/datastore/FLOODING_ALERT', {
            headers: {
              'User-Agent': 'TaiwanFloodMonitor/1.0',
              'Accept': 'application/json'
            },
            signal: AbortSignal.timeout(8000)
          });
          
          if (waterResponse.ok) {
            const waterData = await waterResponse.json();
            console.log('💧 Water agency data:', waterData.result?.results?.length || 0, 'records');
            
            if (waterData.result?.results) {
              const waterNews = waterData.result.results
                .filter((item: any) => item.location?.includes(mainLocation))
                .map((item: any) => ({
                  search_id: searchId,
                  title: `${item.location} 淹水警報 - ${item.level}`,
                  url: item.url || `https://data.gov.tw/dataset/flooding-alert`,
                  source: '水利署',
                  content_snippet: `警戒等級: ${item.level}, 發布時間: ${item.publish_time}`,
                  publish_date: parseDate(item.publish_time),
                  content_type: '政府公開資料',
                  location_match_level: 'high_relevance',
                  relevance_score: 10,
                  created_at: new Date().toISOString()
                }));
              
              results.push(...waterNews);
            }
          }
        } catch (waterError) {
          console.warn('💧 Water agency API failed:', waterError.message);
        }

        // Central Weather Bureau disaster warnings
        try {
          const cwbResponse = await fetch('https://opendata.cwb.gov.tw/api/v1/rest/datastore/W-C0033-001?Authorization=CWB-YOUR-API-KEY', {
            headers: {
              'User-Agent': 'TaiwanFloodMonitor/1.0',
              'Accept': 'application/json'
            },
            signal: AbortSignal.timeout(8000)
          });
          
          if (cwbResponse.ok) {
            const cwbData = await cwbResponse.json();
            console.log('🌦️ Weather bureau data:', cwbData.records?.length || 0, 'records');
          }
        } catch (cwbError) {
          console.warn('🌦️ Weather bureau API failed:', cwbError.message);
        }

        console.log(`✅ Government data: ${results.length} flood alerts`);
        return results;
      } catch (error) {
        console.error('❌ Government API fetch failed:', error);
        return [];
      }
    };

    // Enhanced GDELT news fetching with better filtering
    const fetchFromGDELT = async (): Promise<any[]> => {
      try {
        const taiwanRegionFilter = 'Taiwan OR 台灣 OR 臺灣';
        const locationFilter = mainLocation ? `"${mainLocation}"` : '';
        const floodKeywords = '(淹水 OR 積水 OR 水災 OR 豪雨 OR 暴雨 OR 洪水 OR flood OR flooding)';
        
        // Build comprehensive query
        const gdeltQuery = `${locationFilter} AND ${floodKeywords} AND (${taiwanRegionFilter})`;
        console.log(`🔍 GDELT query: ${gdeltQuery}`);
        
        const response = await fetch(`https://api.gdeltproject.org/api/v2/doc/doc?query=${encodeURIComponent(gdeltQuery)}&mode=artlist&maxrecords=50&sort=datedesc&format=json&TIMESPAN=90DAYS&SOURCECOUNTRY=TW`, {
          headers: {
            'User-Agent': 'FloodMonitor/1.0 Taiwan Flood Alert System',
            'Accept': 'application/json'
          },
          signal: AbortSignal.timeout(15000)
        });
        
        if (!response.ok) {
          console.warn(`GDELT API request failed: ${response.status}`);
          return [];
        }
        
        const data = await response.json();
        console.log(`📄 GDELT found ${data.articles?.length || 0} total articles`);
        
        if (!data.articles || !Array.isArray(data.articles)) {
          console.warn('GDELT response missing articles array');
          return [];
        }
        
        const mapped = data.articles
          .filter((article: any) => {
            const title = article.title || '';
            const url = article.url || '';
            
            if (!title || !url) return false;
            
            // Calculate relevance scores
            const locationScore = calculateLocationRelevance(title, '', address);
            const floodScore = calculateFloodRelevance(title, '');
            
            // Require higher relevance for GDELT
            return locationScore >= 2 && floodScore >= 3;
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
          .slice(0, 20); // Take top 20 most relevant
        
        console.log(`✅ GDELT processed ${mapped.length} highly relevant articles`);
        return dedupeByUrl(mapped);
      } catch (e) {
        console.error('❌ GDELT fetch failed:', e);
        return [];
      }
    };

    // Enhanced Google News RSS with multiple precise queries
    const fetchFromGoogleNewsRSS = async (): Promise<any[]> => {
      try {
        // More precise and diverse search queries
        const precisQueries = [
          `"${mainLocation}" 淹水 OR 積水`,
          `"${mainLocation}" 豪雨 OR 暴雨`,
          `"${mainLocation}" 水災 OR 洪水`,
          `${address.split(',')[0]} 淹水`,
          `台灣 淹水 ${mainLocation}`,
          `${mainLocation} 災情`,
          `${mainLocation} 排水 問題`
        ].filter(query => query.includes(mainLocation) && mainLocation !== '該地區');
        
        let allResults: any[] = [];
        
        for (const query of precisQueries) {
          try {
            const rssUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=zh-TW&gl=TW&ceid=TW:zh-Hant&num=20`;
            console.log(`🔍 Google News query: "${query}"`);
            
            const resp = await fetch(rssUrl, {
              headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; TaiwanFloodAlert/1.0)',
                'Accept': 'application/rss+xml, application/xml, text/xml',
                'Accept-Language': 'zh-TW,zh;q=0.9,en;q=0.8'
              },
              signal: AbortSignal.timeout(12000)
            });
            
            if (!resp.ok) {
              console.warn(`Google RSS query "${query}" failed: ${resp.status}`);
              continue;
            }
            
            const xml = await resp.text();
            const doc = new DOMParser().parseFromString(xml, 'text/xml');
            
            if (!doc) {
              console.warn(`Failed to parse XML for query: "${query}"`);
              continue;
            }
            
            const items = Array.from(doc.getElementsByTagName('item'));
            console.log(`📰 Found ${items.length} RSS items for: "${query}"`);
            
            const mapped = items
              .map((item) => {
                const title = item.getElementsByTagName('title')[0]?.textContent || '無標題';
                const link = item.getElementsByTagName('link')[0]?.textContent || '';
                const pubDate = item.getElementsByTagName('pubDate')[0]?.textContent || '';
                const description = item.getElementsByTagName('description')[0]?.textContent || '';
                const sourceEl = item.getElementsByTagName('source')[0];
                const source = sourceEl?.textContent || sourceEl?.getAttribute('url')?.split('/')[2] || 'Google News';
                
                // Calculate comprehensive relevance
                const locationScore = calculateLocationRelevance(title, description, address);
                const floodScore = calculateFloodRelevance(title, description);
                const totalScore = locationScore + floodScore;
                
                return {
                  search_id: searchId,
                  title,
                  url: link,
                  source,
                  content_snippet: description.substring(0, 250),
                  publish_date: parseDate(pubDate),
                  content_type: 'Google News',
                  location_match_level: totalScore >= 5 ? 'high_relevance' : 'medium_relevance',
                  relevance_score: totalScore,
                  created_at: new Date().toISOString()
                };
              })
              .filter((n) => {
                // Higher quality filter for Google News
                return n.url && 
                       n.title !== '無標題' && 
                       (n.relevance_score || 0) >= 3 &&
                       !n.title.toLowerCase().includes('廣告');
              });
            
            allResults = allResults.concat(mapped);
            
            // Small delay between requests to be respectful
            await new Promise(resolve => setTimeout(resolve, 500));
            
          } catch (queryError) {
            console.error(`Query "${query}" failed:`, queryError);
          }
        }
        
        // Sort by relevance and dedupe
        const sortedResults = dedupeByUrl(allResults)
          .sort((a, b) => (b.relevance_score || 0) - (a.relevance_score || 0));
        
        console.log(`✅ Google News processed ${sortedResults.length} relevant articles`);
        return sortedResults.slice(0, 20); // Top 20 most relevant
      } catch (e) {
        console.error('❌ Google News RSS fetch failed:', e);
        return [];
      }
    };

    // Yahoo News RSS integration
    const fetchFromYahooNews = async (): Promise<any[]> => {
      try {
        const queries = [
          `${mainLocation} 淹水`,
          `${mainLocation} 豪雨`,
          `台灣 淹水 災情`
        ].filter(query => mainLocation !== '該地區');

        let allResults: any[] = [];

        for (const query of queries) {
          try {
            // Yahoo News RSS endpoint (if available)
            const rssUrl = `https://tw.news.yahoo.com/rss/search?p=${encodeURIComponent(query)}`;
            console.log(`🔍 Yahoo News query: "${query}"`);
            
            const resp = await fetch(rssUrl, {
              headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; TaiwanFloodAlert/1.0)',
                'Accept': 'application/rss+xml, application/xml'
              },
              signal: AbortSignal.timeout(10000)
            });
            
            if (resp.ok) {
              const xml = await resp.text();
              const doc = new DOMParser().parseFromString(xml, 'text/xml');
              
              if (doc) {
                const items = Array.from(doc.getElementsByTagName('item'));
                console.log(`📰 Yahoo News found ${items.length} items`);
                
                const mapped = items.map((item) => {
                  const title = item.getElementsByTagName('title')[0]?.textContent || '無標題';
                  const link = item.getElementsByTagName('link')[0]?.textContent || '';
                  const description = item.getElementsByTagName('description')[0]?.textContent || '';
                  const pubDate = item.getElementsByTagName('pubDate')[0]?.textContent || '';
                  
                  return {
                    search_id: searchId,
                    title,
                    url: link,
                    source: 'Yahoo News',
                    content_snippet: description.substring(0, 200),
                    publish_date: parseDate(pubDate),
                    content_type: 'Yahoo News',
                    location_match_level: 'medium_relevance',
                    relevance_score: calculateLocationRelevance(title, description, address) + calculateFloodRelevance(title, description),
                    created_at: new Date().toISOString()
                  };
                }).filter(item => item.url && (item.relevance_score || 0) >= 2);
                
                allResults = allResults.concat(mapped);
              }
            }
          } catch (error) {
            console.warn(`Yahoo query "${query}" failed:`, error.message);
          }
        }

        console.log(`✅ Yahoo News processed ${allResults.length} articles`);
        return dedupeByUrl(allResults);
      } catch (e) {
        console.error('❌ Yahoo News fetch failed:', e);
        return [];
      }
    };

    // Fetch news from all sources with improved error handling
    console.log('🚀 Starting comprehensive news fetch from multiple sources...');
    
    const [govResults, gdeltResults, googleResults, yahooResults] = await Promise.allSettled([
      fetchGovernmentFloodData(),
      fetchFromGDELT(),
      fetchFromGoogleNewsRSS(),
      fetchFromYahooNews()
    ]);

    let externalNews: any[] = [];
    
    // Combine results from all sources
    if (govResults.status === 'fulfilled') {
      externalNews = externalNews.concat(govResults.value);
      console.log(`✅ Government data: ${govResults.value.length} articles`);
    } else {
      console.error('❌ Government data failed:', govResults.reason);
    }
    
    if (gdeltResults.status === 'fulfilled') {
      externalNews = externalNews.concat(gdeltResults.value);
      console.log(`✅ GDELT: ${gdeltResults.value.length} articles`);
    } else {
      console.error('❌ GDELT failed:', gdeltResults.reason);
    }
    
    if (googleResults.status === 'fulfilled') {
      externalNews = externalNews.concat(googleResults.value);
      console.log(`✅ Google News: ${googleResults.value.length} articles`);
    } else {
      console.error('❌ Google News failed:', googleResults.reason);
    }

    if (yahooResults.status === 'fulfilled') {
      externalNews = externalNews.concat(yahooResults.value);
      console.log(`✅ Yahoo News: ${yahooResults.value.length} articles`);
    } else {
      console.error('❌ Yahoo News failed:', yahooResults.reason);
    }

    // Enhanced deduplication and relevance sorting
    externalNews = dedupeByUrl(externalNews)
      .sort((a, b) => (b.relevance_score || 0) - (a.relevance_score || 0))
      .slice(0, 30); // Take top 30 most relevant from all sources

    console.log(`📊 Combined external sources: ${externalNews.length} unique, highly relevant articles`);

    // Only use mock data if no relevant news is found from any source
    if (externalNews.length === 0) {
      console.log('📝 No relevant external news found, generating contextual mock data...');
      externalNews = generateMockFloodNews(address, searchId, searchRadius);
      // Mark mock data clearly
      externalNews.forEach(item => {
        item.content_type = 'Mock Data';
        item.location_match_level = 'simulated';
        item.relevance_score = 1;
      });
    } else {
      console.log(`🎯 Found ${externalNews.length} highly relevant news articles - using real data`);
    }

    // Store the news in the database
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
        console.log(`💾 Stored ${inserted.length} news items in database`);
      }
    }

    // Generate enhanced heatmap points
    const points = await generateHeatmapPoints(externalNews, searchLocation, searchRadius, supabase);

    return new Response(
      JSON.stringify({ 
        success: true, 
        news: externalNews,
        searchId: searchId,
        cached: false,
        points,
        dataSource: externalNews.length > 0 && externalNews[0].content_type !== 'Mock Data' ? 'real' : 'mock',
        stats: {
          totalSources: 4,
          articlesFound: externalNews.length,
          relevanceRange: externalNews.length > 0 ? 
            `${Math.min(...externalNews.map(n => n.relevance_score || 0))}-${Math.max(...externalNews.map(n => n.relevance_score || 0))}` : 
            '0'
        }
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('💥 Critical error in search-flood-news:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        stack: error.stack
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

// Enhanced location keyword extraction
function extractLocationKeywords(address: string): string {
  if (!address) return '該地區';
  
  // Extract Taiwan location patterns
  const patterns = [
    /([台臺][北中南東]?[縣市])/,
    /([新基][北竹][縣市])/,
    /([高桃嘉宜花][雄園義蘭蓮][縣市])/,
    /([苗彰投雲屏澎金連][栗化投林東湖門江][縣市])/,
    /([^\s,]{2,4}[區鄉鎮市])/,
    /([^\s,]{2,8}[路街大道])/
  ];
  
  for (const pattern of patterns) {
    const match = address.match(pattern);
    if (match) {
      return match[1];
    }
  }
  
  // Fallback: return first meaningful part
  const parts = address.split(/[,\s]+/).filter(p => p.length > 1);
  return parts[0] || '該地區';
}

// Enhanced heatmap generation with real flood incident data
async function generateHeatmapPoints(
  newsItems: any[], 
  searchLocation: any, 
  searchRadius: number, 
  supabase: any
): Promise<any[]> {
  try {
    console.log('🗺️ Generating enhanced heatmap with real flood data...');
    
    // Fetch real flood incidents within radius
    const { data: floodIncidents, error } = await supabase.rpc('get_flood_incidents_within_radius', {
      center_lat: searchLocation.latitude,
      center_lon: searchLocation.longitude,
      radius_meters: searchRadius
    });

    if (error) {
      console.error('Error fetching flood incidents:', error);
    }

    let points: any[] = [];

    // Add real flood incident points with higher priority
    if (floodIncidents && floodIncidents.length > 0) {
      console.log(`📍 Found ${floodIncidents.length} real flood incidents within radius`);
      
      const incidentPoints = floodIncidents.map((incident: any) => {
        // Weight by recency and severity
        const daysSince = Math.floor((Date.now() - new Date(incident.incident_date).getTime()) / (1000 * 60 * 60 * 24));
        const recencyWeight = Math.max(0.1, 1 - (daysSince / 365)); // Decay over year
        const severityWeight = (incident.severity_level || 1) / 5; // Normalize to 0-1
        const distanceWeight = Math.max(0.1, 1 - (incident.distance_meters / searchRadius)); // Closer = higher weight
        
        const weight = Math.min(1.0, (severityWeight + recencyWeight + distanceWeight) / 3);
        
        return {
          lat: parseFloat(incident.latitude),
          lng: parseFloat(incident.longitude),
          weight: weight,
          type: 'historical_incident',
          date: incident.incident_date,
          severity: incident.severity_level,
          source: incident.data_source,
          address: incident.address
        };
      });
      
      points = points.concat(incidentPoints);
    }

    // Add news-based points for recent activity
    if (newsItems && newsItems.length > 0) {
      console.log(`📰 Processing ${newsItems.length} news items for heatmap`);
      
      const newsPoints = newsItems
        .filter(item => item.location_match_level !== 'simulated') // Skip mock data
        .slice(0, 15) // Limit news points
        .map((item, index) => {
          // Weight by relevance and recency
          const relevanceWeight = Math.min(1.0, (item.relevance_score || 1) / 10);
          const daysSincePublish = Math.floor((Date.now() - new Date(item.publish_date).getTime()) / (1000 * 60 * 60 * 24));
          const recencyWeight = Math.max(0.2, 1 - (daysSincePublish / 30)); // Decay over month
          
          const weight = Math.min(0.8, (relevanceWeight + recencyWeight) / 2); // Cap news weight lower than incidents
          
          // Generate location near search center with some variance
          const offsetLat = (Math.random() - 0.5) * 0.01 * (searchRadius / 1000);
          const offsetLng = (Math.random() - 0.5) * 0.01 * (searchRadius / 1000);
          
          return {
            lat: searchLocation.latitude + offsetLat,
            lng: searchLocation.longitude + offsetLng,
            weight: weight,
            type: 'news_activity',
            title: item.title,
            source: item.source,
            date: item.publish_date,
            relevance: item.relevance_score
          };
        });
      
      points = points.concat(newsPoints);
    }

    // If no real data, generate fallback points
    if (points.length === 0) {
      console.log('📍 No real data found, generating fallback heatmap points');
      points = generateFallbackHeatmapPoints(searchLocation, searchRadius);
    }

    // Sort by weight (highest first) and limit total points
    points = points
      .sort((a, b) => b.weight - a.weight)
      .slice(0, 50); // Limit for performance
    
    console.log(`✅ Generated ${points.length} heatmap points (${points.filter(p => p.type === 'historical_incident').length} incidents, ${points.filter(p => p.type === 'news_activity').length} news)`);
    
    return points;
  } catch (error) {
    console.error('❌ Error generating heatmap points:', error);
    return generateFallbackHeatmapPoints(searchLocation, searchRadius);
  }
}

// Fallback heatmap generation
function generateFallbackHeatmapPoints(searchLocation: any, searchRadius: number): any[] {
  console.log('📍 Generating fallback heatmap points');
  
  const points = [];
  const numPoints = Math.min(15, Math.max(5, Math.floor(searchRadius / 200)));
  
  for (let i = 0; i < numPoints; i++) {
    const angle = (Math.PI * 2 * i) / numPoints + Math.random() * 0.5;
    const distance = Math.random() * (searchRadius * 0.8);
    const distanceKm = distance / 1000;
    
    const lat = searchLocation.latitude + (distanceKm / 111) * Math.cos(angle);
    const lng = searchLocation.longitude + (distanceKm / (111 * Math.cos(searchLocation.latitude * Math.PI / 180))) * Math.sin(angle);
    
    points.push({
      lat: lat,
      lng: lng,
      weight: Math.random() * 0.6 + 0.2, // Random weight between 0.2-0.8
      type: 'fallback',
      synthetic: true
    });
  }
  
  return points;
}

// Enhanced mock news generation for areas with no real data
function generateMockFloodNews(address: string, searchId: string, searchRadius: number) {
  console.log('📝 Generating enhanced mock flood news for:', address);
  
  const location = extractLocationKeywords(address);
  const currentDate = new Date();
  const recentDates = Array.from({length: 7}, (_, i) => {
    const date = new Date(currentDate);
    date.setDate(date.getDate() - Math.floor(Math.random() * 30)); // Past 30 days
    return date;
  });

  const mockTemplates = [
    {
      title: `${location}地區豪雨積水 市府啟動抽水設備`,
      content: `受到梅雨鋒面影響，${location}地區出現短時間強降雨，部分低窪地區有積水情形。市府已立即啟動移動式抽水機，並派遣清潔隊清理水溝落葉，確保排水順暢。目前積水已逐漸消退，交通恢復正常。`,
      source: '台灣新聞網',
      type: '梅雨積水'
    },
    {
      title: `${location}排水系統改善工程完工 提升防洪能力`,
      content: `${location}地區的排水系統改善工程已順利完工，新增大型雨水下水道及滯洪池，大幅提升該區域的防洪排水能力。工程總投資5億元，預計可有效降低未來豪雨時的淹水風險。`,
      source: '公共電視',
      type: '防洪建設'
    },
    {
      title: `${location}水患防治計畫獲中央補助 預計明年動工`,
      content: `${location}地區水患防治計畫獲得中央政府3億元補助，將興建抽水站及改善排水設施。計畫預計明年初動工，工期約18個月，完工後可大幅提升該地區的防洪韌性。`,
      source: '聯合新聞網',
      type: '政府建設'
    },
    {
      title: `${location}區公所舉辦防災演練 加強居民應變能力`,
      content: `${location}區公所今日舉辦水災防災演練，模擬豪雨來襲時的緊急應變措施。演練包括疏散路線規劃、沙包堆疊、抽水設備操作等項目，約200名居民參與，提升社區防災意識。`,
      source: '民視新聞',
      type: '防災演練'
    },
    {
      title: `${location}智慧防汛系統上線 即時監控水位變化`,
      content: `${location}地區新設置的智慧防汛系統正式啟用，透過IoT感測器即時監控河川及下水道水位。系統整合氣象資料進行預警分析，可提前2-4小時發布淹水警報，讓民眾有充足時間應變。`,
      source: '科技新報',
      type: '智慧防汛'
    },
    {
      title: `${location}綠建築雨水回收計畫 減緩都市洪患`,
      content: `${location}推動綠建築雨水回收計畫，鼓勵建築物設置雨水貯留設施。計畫已有50棟建築參與，總雨水回收量達10萬噸，有效減少暴雨時的地表逕流，降低都市洪患風險。`,
      source: '環境資訊中心',
      type: '環保建設'
    }
  ];

  return mockTemplates.map((template, index) => ({
    search_id: searchId,
    title: template.title,
    url: `https://mock-news-${location}-${index + 1}.tw/articles/${Date.now() + index}`,
    source: template.source,
    content_snippet: template.content,
    publish_date: recentDates[index % recentDates.length].toISOString(),
    content_type: '模擬新聞',
    location_match_level: 'simulated',
    relevance_score: 5,
    created_at: new Date().toISOString()
  }));
}