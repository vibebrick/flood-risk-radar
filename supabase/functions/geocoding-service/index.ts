import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { address, content } = await req.json();
    
    let targetAddress = address;
    
    // If no direct address, extract from content using NLP
    if (!targetAddress && content) {
      targetAddress = extractAddressFromContent(content);
    }

    if (!targetAddress) {
      return new Response(JSON.stringify({ error: 'No address provided' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Geocoding address: ${targetAddress}`);

    // Normalize Taiwan address format
    const normalizedAddress = normalizeAddress(targetAddress);
    
    // Try geocoding with multiple services
    const geocodingResult = await geocodeAddress(normalizedAddress);

    if (!geocodingResult) {
      return new Response(JSON.stringify({ error: 'Failed to geocode address' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({
      success: true,
      originalAddress: targetAddress,
      normalizedAddress,
      latitude: geocodingResult.latitude,
      longitude: geocodingResult.longitude,
      confidence: geocodingResult.confidence
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in geocoding-service:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function extractAddressFromContent(content: string): string | null {
  console.log('Extracting address from content...');
  
  // Enhanced Taiwan address patterns for full coverage
  const patterns = [
    // Full address with county/city + district + road
    /[台臺]?([北中南高屏]?[縣市])?([^\s]{1,4}[區鄉鎮市])[^\s]{1,15}?[路街巷弄大道][一二三四五六七八九十\d]*?段?[\d]*號?/g,
    // Road only with number
    /[^\s]{1,15}?[路街巷弄大道][一二三四五六七八九十\d]*?段?[\d]+號?/g,
    // District + Road combination
    /[^\s]{1,4}[區鄉鎮市][^\s]{1,15}?[路街巷弄大道]/g,
    // County/City patterns
    /[台臺]?[北中南高屏新雲嘉彰投苗竹桃宜花東澎金馬連][縣市]/g
  ];

  for (const pattern of patterns) {
    const matches = content.match(pattern);
    if (matches && matches.length > 0) {
      // Return the longest match (most specific)
      const longest = matches.reduce((a, b) => a.length > b.length ? a : b);
      console.log(`Extracted address: ${longest}`);
      return longest;
    }
  }

  return null;
}

function normalizeAddress(address: string): string {
  console.log(`Normalizing address: ${address}`);
  
  let normalized = address.trim();
  
  // Standardize Taiwan region names
  const regionMapping = {
    '台北': '台北市',
    '新北': '新北市',
    '桃園': '桃園市',
    '台中': '台中市',
    '台南': '台南市',
    '高雄': '高雄市',
    '基隆': '基隆市',
    '新竹市': '新竹市',
    '嘉義市': '嘉義市',
    '新竹': '新竹縣',
    '苗栗': '苗栗縣',
    '彰化': '彰化縣',
    '南投': '南投縣',
    '雲林': '雲林縣',
    '嘉義': '嘉義縣',
    '屏東': '屏東縣',
    '宜蘭': '宜蘭縣',
    '花蓮': '花蓮縣',
    '台東': '台東縣',
    '澎湖': '澎湖縣',
    '金門': '金門縣',
    '連江': '連江縣'
  };

  // Apply region mapping
  Object.entries(regionMapping).forEach(([short, full]) => {
    if (normalized.includes(short) && !normalized.includes(full)) {
      normalized = normalized.replace(short, full);
    }
  });

  // Standardize format
  normalized = normalized
    .replace(/台/g, '台')  // Standardize Taiwan character
    .replace(/縣市/g, '縣')
    .replace(/市區/g, '市')
    .replace(/巿/g, '市');  // Fix common typo

  console.log(`Normalized address: ${normalized}`);
  return normalized;
}

async function geocodeAddress(address: string) {
  console.log(`Geocoding normalized address: ${address}`);
  
  // First try Nominatim (OpenStreetMap) for precise geocoding
  try {
    const nominatimResult = await tryNominatimGeocoding(address);
    if (nominatimResult) {
      console.log('Successfully geocoded with Nominatim');
      return nominatimResult;
    }
  } catch (error) {
    console.warn('Nominatim geocoding failed:', error.message);
  }

  // Second try: Enhanced local Taiwan database
  const localResult = tryLocalDatabase(address);
  if (localResult) {
    console.log('Found match in local database');
    return localResult;
  }

  // Third try: Regional fallback based on city/county
  const regionalResult = tryRegionalFallback(address);
  if (regionalResult) {
    console.log('Using regional fallback coordinates');
    return regionalResult;
  }

  // Default fallback
  console.log('Using default fallback coordinates');
  return {
    latitude: 23.8,  // Central Taiwan
    longitude: 120.9,
    confidence: 0.3
  };
}

async function tryNominatimGeocoding(address: string) {
  try {
    const query = `${address}, Taiwan`;
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&countrycodes=tw&limit=1&accept-language=zh-TW,zh,en`,
      { 
        signal: AbortSignal.timeout(8000),
        headers: {
          'User-Agent': 'TaiwanFloodMonitor/1.0'
        }
      }
    );
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    if (data && data.length > 0) {
      const result = data[0];
      return {
        latitude: parseFloat(result.lat),
        longitude: parseFloat(result.lon),
        confidence: 0.9
      };
    }
  } catch (error) {
    console.error('Nominatim API error:', error);
  }
  
  return null;
}

function tryLocalDatabase(address: string) {
  // Comprehensive Taiwan locations database covering all major cities and landmarks
  const taiwanLocations = [
    // Taipei City
    { pattern: /台北市.*信義區/, lat: 25.0338, lng: 121.5645, conf: 0.9 },
    { pattern: /台北市.*中正區/, lat: 25.0359, lng: 121.5200, conf: 0.9 },
    { pattern: /台北市.*大安區/, lat: 25.0267, lng: 121.5436, conf: 0.9 },
    { pattern: /台北市.*松山區/, lat: 25.0569, lng: 121.5657, conf: 0.9 },
    { pattern: /台北市.*中山區/, lat: 25.0636, lng: 121.5264, conf: 0.9 },
    { pattern: /台北市.*萬華區/, lat: 25.0368, lng: 121.4999, conf: 0.9 },
    { pattern: /台北市.*士林區/, lat: 25.1013, lng: 121.5491, conf: 0.9 },
    { pattern: /台北市.*北投區/, lat: 25.1315, lng: 121.5018, conf: 0.9 },
    { pattern: /台北市.*內湖區/, lat: 25.0820, lng: 121.5940, conf: 0.9 },
    { pattern: /台北市.*南港區/, lat: 25.0554, lng: 121.6078, conf: 0.9 },
    { pattern: /台北市.*文山區/, lat: 24.9889, lng: 121.5709, conf: 0.9 },
    { pattern: /台北市.*大同區/, lat: 25.0636, lng: 121.5151, conf: 0.9 },

    // New Taipei City
    { pattern: /新北市.*板橋區/, lat: 25.0097, lng: 121.4598, conf: 0.9 },
    { pattern: /新北市.*三重區/, lat: 25.0569, lng: 121.4861, conf: 0.9 },
    { pattern: /新北市.*中和區/, lat: 24.9999, lng: 121.4991, conf: 0.9 },
    { pattern: /新北市.*永和區/, lat: 25.0139, lng: 121.5156, conf: 0.9 },
    { pattern: /新北市.*新莊區/, lat: 25.0375, lng: 121.4318, conf: 0.9 },
    { pattern: /新北市.*新店區/, lat: 24.9675, lng: 121.5373, conf: 0.9 },
    { pattern: /新北市.*樹林區/, lat: 24.9939, lng: 121.4203, conf: 0.9 },
    { pattern: /新北市.*鶯歌區/, lat: 24.9543, lng: 121.3548, conf: 0.9 },
    { pattern: /新北市.*三峽區/, lat: 24.9347, lng: 121.3686, conf: 0.9 },
    { pattern: /新北市.*淡水區/, lat: 25.1678, lng: 121.4395, conf: 0.9 },

    // Taoyuan City
    { pattern: /桃園市.*桃園區/, lat: 24.9936, lng: 121.3010, conf: 0.9 },
    { pattern: /桃園市.*中壢區/, lat: 24.9537, lng: 121.2251, conf: 0.9 },
    { pattern: /桃園市.*大溪區/, lat: 24.8886, lng: 121.2904, conf: 0.9 },
    { pattern: /桃園市.*楊梅區/, lat: 24.9112, lng: 121.1464, conf: 0.9 },
    { pattern: /桃園市.*蘆竹區/, lat: 25.0455, lng: 121.2918, conf: 0.9 },

    // Taichung City
    { pattern: /台中市.*中區/, lat: 24.1367, lng: 120.6850, conf: 0.9 },
    { pattern: /台中市.*西區/, lat: 24.1393, lng: 120.6732, conf: 0.9 },
    { pattern: /台中市.*南區/, lat: 24.1223, lng: 120.6864, conf: 0.9 },
    { pattern: /台中市.*北區/, lat: 24.1569, lng: 120.6840, conf: 0.9 },
    { pattern: /台中市.*西屯區/, lat: 24.1798, lng: 120.6478, conf: 0.9 },
    { pattern: /台中市.*南屯區/, lat: 24.1286, lng: 120.6467, conf: 0.9 },
    { pattern: /台中市.*北屯區/, lat: 24.1810, lng: 120.7013, conf: 0.9 },
    { pattern: /台中市.*豐原區/, lat: 24.2567, lng: 120.7239, conf: 0.9 },

    // Tainan City
    { pattern: /台南市.*中西區/, lat: 22.9974, lng: 120.2025, conf: 0.9 },
    { pattern: /台南市.*東區/, lat: 22.9969, lng: 120.2121, conf: 0.9 },
    { pattern: /台南市.*南區/, lat: 22.9735, lng: 120.1922, conf: 0.9 },
    { pattern: /台南市.*北區/, lat: 23.0124, lng: 120.2087, conf: 0.9 },
    { pattern: /台南市.*安平區/, lat: 23.0016, lng: 120.1606, conf: 0.9 },
    { pattern: /台南市.*安南區/, lat: 23.0408, lng: 120.1876, conf: 0.9 },
    { pattern: /台南市.*永康區/, lat: 23.0264, lng: 120.2572, conf: 0.9 },
    { pattern: /台南市.*歸仁區/, lat: 22.9697, lng: 120.2895, conf: 0.9 },
    { pattern: /台南市.*新化區/, lat: 23.0386, lng: 120.3117, conf: 0.9 },
    { pattern: /台南市.*左鎮區/, lat: 23.0575, lng: 120.4075, conf: 0.9 },

    // Kaohsiung City
    { pattern: /高雄市.*新興區/, lat: 22.6273, lng: 120.3015, conf: 0.9 },
    { pattern: /高雄市.*前金區/, lat: 22.6273, lng: 120.2919, conf: 0.9 },
    { pattern: /高雄市.*苓雅區/, lat: 22.6123, lng: 120.3015, conf: 0.9 },
    { pattern: /高雄市.*鹽埕區/, lat: 22.6261, lng: 120.2823, conf: 0.9 },
    { pattern: /高雄市.*鼓山區/, lat: 22.6406, lng: 120.2740, conf: 0.9 },
    { pattern: /高雄市.*旗津區/, lat: 22.6187, lng: 120.2694, conf: 0.9 },
    { pattern: /高雄市.*前鎮區/, lat: 22.5949, lng: 120.3190, conf: 0.9 },
    { pattern: /高雄市.*三民區/, lat: 22.6568, lng: 120.3252, conf: 0.9 },
    { pattern: /高雄市.*左營區/, lat: 22.6742, lng: 120.2942, conf: 0.9 },

    // Other major counties and cities
    { pattern: /基隆市/, lat: 25.1276, lng: 121.7392, conf: 0.8 },
    { pattern: /新竹市/, lat: 24.8014, lng: 120.9714, conf: 0.8 },
    { pattern: /新竹縣/, lat: 24.8387, lng: 121.0177, conf: 0.8 },
    { pattern: /苗栗縣/, lat: 24.5602, lng: 120.8214, conf: 0.8 },
    { pattern: /彰化縣/, lat: 24.0518, lng: 120.5161, conf: 0.8 },
    { pattern: /南投縣/, lat: 23.9609, lng: 120.9718, conf: 0.8 },
    { pattern: /雲林縣/, lat: 23.7092, lng: 120.4313, conf: 0.8 },
    { pattern: /嘉義縣/, lat: 23.4518, lng: 120.2554, conf: 0.8 },
    { pattern: /嘉義市/, lat: 23.4801, lng: 120.4491, conf: 0.8 },
    { pattern: /屏東縣/, lat: 22.5519, lng: 120.5487, conf: 0.8 },
    { pattern: /宜蘭縣/, lat: 24.7021, lng: 121.7378, conf: 0.8 },
    { pattern: /花蓮縣/, lat: 23.9871, lng: 121.6015, conf: 0.8 },
    { pattern: /台東縣/, lat: 22.7972, lng: 121.1713, conf: 0.8 },
    { pattern: /澎湖縣/, lat: 23.5711, lng: 119.5794, conf: 0.8 },
    { pattern: /金門縣/, lat: 24.4369, lng: 118.3174, conf: 0.8 },
    { pattern: /連江縣/, lat: 26.1605, lng: 119.9297, conf: 0.8 },

    // Famous landmarks and tourist attractions
    { pattern: /台北101/, lat: 25.0338, lng: 121.5645, conf: 0.95 },
    { pattern: /故宮博物院/, lat: 25.1013, lng: 121.5491, conf: 0.95 },
    { pattern: /中正紀念堂/, lat: 25.0359, lng: 121.5200, conf: 0.95 },
    { pattern: /龍山寺/, lat: 25.0368, lng: 121.4999, conf: 0.95 },
    { pattern: /西門町/, lat: 25.0421, lng: 121.5071, conf: 0.95 },
    { pattern: /日月潭/, lat: 23.8517, lng: 120.9154, conf: 0.95 },
    { pattern: /阿里山/, lat: 23.5088, lng: 120.8056, conf: 0.95 },
    { pattern: /太魯閣/, lat: 24.1947, lng: 121.6211, conf: 0.95 },
    { pattern: /墾丁/, lat: 21.9409, lng: 120.7931, conf: 0.95 },
    { pattern: /九份/, lat: 25.1097, lng: 121.8445, conf: 0.95 },
    { pattern: /淡水老街/, lat: 25.1678, lng: 121.4395, conf: 0.95 },
    { pattern: /逢甲夜市/, lat: 24.1798, lng: 120.6478, conf: 0.95 },
    { pattern: /赤崁樓/, lat: 22.9974, lng: 120.2025, conf: 0.95 },
    { pattern: /安平古堡/, lat: 23.0016, lng: 120.1606, conf: 0.95 },
    { pattern: /愛河/, lat: 22.6273, lng: 120.2919, conf: 0.95 }
  ];

  // Check against local database
  for (const location of taiwanLocations) {
    if (location.pattern.test(address)) {
      console.log(`Found matching location in database`);
      return {
        latitude: location.lat,
        longitude: location.lng,
        confidence: location.conf
      };
    }
  }

  return null;
}

function tryRegionalFallback(address: string) {
  // Regional center coordinates for fallback
  const regionalCenters = [
    { pattern: /台北|新北/, lat: 25.0330, lng: 121.5654, name: 'Northern Taiwan' },
    { pattern: /桃園|新竹|苗栗/, lat: 24.8014, lng: 120.9714, name: 'Northwestern Taiwan' },
    { pattern: /台中|彰化|南投/, lat: 24.1477, lng: 120.6736, name: 'Central Taiwan' },
    { pattern: /雲林|嘉義/, lat: 23.5518, lng: 120.4313, name: 'South-Central Taiwan' },
    { pattern: /台南/, lat: 22.9997, lng: 120.2270, name: 'Tainan Region' },
    { pattern: /高雄|屏東/, lat: 22.6273, lng: 120.3014, name: 'Southern Taiwan' },
    { pattern: /宜蘭/, lat: 24.7021, lng: 121.7378, name: 'Yilan County' },
    { pattern: /花蓮/, lat: 23.9871, lng: 121.6015, name: 'Hualien County' },
    { pattern: /台東/, lat: 22.7972, lng: 121.1713, name: 'Taitung County' },
    { pattern: /澎湖/, lat: 23.5711, lng: 119.5794, name: 'Penghu County' },
    { pattern: /金門/, lat: 24.4369, lng: 118.3174, name: 'Kinmen County' },
    { pattern: /連江|馬祖/, lat: 26.1605, lng: 119.9297, name: 'Lienchiang County' }
  ];

  for (const region of regionalCenters) {
    if (region.pattern.test(address)) {
      console.log(`Using regional fallback for ${region.name}`);
      return {
        latitude: region.lat + (Math.random() - 0.5) * 0.1,  // Add small random offset
        longitude: region.lng + (Math.random() - 0.5) * 0.1,
        confidence: 0.7
      };
    }
  }

  return null;
}
