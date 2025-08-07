interface GeocodingResult {
  latitude: number;
  longitude: number;
  address: string;
}

interface GeocodingService {
  name: string;
  search: (query: string) => Promise<GeocodingResult[]>;
}

// Taiwan common addresses database for offline search
const taiwanAddresses = [
  { name: "台北101", lat: 25.0338, lng: 121.5645, address: "台北市信義區信義路五段7號" },
  { name: "台北車站", lat: 25.0478, lng: 121.5170, address: "台北市中正區北平西路3號" },
  { name: "西門町", lat: 25.0421, lng: 121.5071, address: "台北市萬華區成都路" },
  { name: "故宮博物院", lat: 25.1013, lng: 121.5491, address: "台北市士林區至善路二段221號" },
  { name: "龍山寺", lat: 25.0368, lng: 121.4999, address: "台北市萬華區廣州街211號" },
  { name: "中正紀念堂", lat: 25.0359, lng: 121.5200, address: "台北市中正區中山南路21號" },
  { name: "高雄85大樓", lat: 22.6123, lng: 120.3015, address: "高雄市苓雅區自強三路5號" },
  { name: "愛河", lat: 22.6273, lng: 120.2919, address: "高雄市前金區" },
  { name: "日月潭", lat: 23.8517, lng: 120.9154, address: "南投縣魚池鄉中山路599號" },
  { name: "阿里山", lat: 23.5088, lng: 120.8056, address: "嘉義縣阿里山鄉中正村59號" },
  { name: "台中車站", lat: 24.1367, lng: 120.6850, address: "台中市中區台灣大道一段1號" },
  { name: "逢甲夜市", lat: 24.1798, lng: 120.6478, address: "台中市西屯區文華路" },
  { name: "台南車站", lat: 22.9969, lng: 120.2121, address: "台南市東區北門路二段4號" },
  { name: "赤崁樓", lat: 22.9974, lng: 120.2025, address: "台南市中西區民族路二段212號" },
  { name: "安平古堡", lat: 23.0016, lng: 120.1606, address: "台南市安平區國勝路82號" },
];

// Nominatim geocoding service
const nominatimService: GeocodingService = {
  name: "Nominatim",
  search: async (query: string) => {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&countrycodes=tw&limit=5&accept-language=zh-TW,zh,en`,
      { 
        signal: AbortSignal.timeout(8000),
        headers: {
          'User-Agent': 'FloodRiskApp/1.0'
        }
      }
    );
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    return data.map((item: any) => ({
      latitude: parseFloat(item.lat),
      longitude: parseFloat(item.lon),
      address: item.display_name
    }));
  }
};

// Local Taiwan address service
const localService: GeocodingService = {
  name: "Local",
  search: async (query: string) => {
    const normalizedQuery = query.toLowerCase().trim();
    const matches = taiwanAddresses.filter(addr => 
      addr.name.toLowerCase().includes(normalizedQuery) ||
      addr.address.toLowerCase().includes(normalizedQuery) ||
      normalizedQuery.includes(addr.name.toLowerCase())
    );
    
    return matches.map(addr => ({
      latitude: addr.lat,
      longitude: addr.lng,
      address: addr.address
    }));
  }
};

// Services in order of preference
const services: GeocodingService[] = [
  nominatimService,
  localService
];

interface SearchOptions {
  retries?: number;
  timeout?: number;
}

export async function searchLocation(
  query: string, 
  options: SearchOptions = {}
): Promise<{ results: GeocodingResult[]; service: string }> {
  const { retries = 2, timeout = 8000 } = options;
  
  if (!query.trim()) {
    throw new Error("請輸入搜尋關鍵字");
  }

  let lastError: Error | null = null;
  
  // Try each service
  for (const service of services) {
    let attempts = 0;
    
    // Retry mechanism for each service
    while (attempts <= retries) {
      try {
        const results = await service.search(query);
        
        if (results.length > 0) {
          return { results, service: service.name };
        }
        
        break; // No results, try next service
      } catch (error) {
        lastError = error as Error;
        attempts++;
        
        if (attempts <= retries) {
          // Exponential backoff
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempts - 1) * 1000));
        }
      }
    }
  }
  
  // If we get here, all services failed
  if (lastError) {
    if (lastError.message.includes('Failed to fetch') || lastError.message.includes('NetworkError')) {
      throw new Error("網路連線問題，請檢查網路連線後重試");
    } else if (lastError.message.includes('timeout') || lastError.name === 'TimeoutError') {
      throw new Error("搜尋請求超時，請稍後再試");
    } else if (lastError.message.includes('HTTP 429')) {
      throw new Error("搜尋請求過於頻繁，請稍後再試");
    } else {
      throw new Error("搜尋服務暫時無法使用，請稍後再試");
    }
  }
  
  throw new Error("找不到相關地址，請嘗試其他關鍵字或選擇地圖上的位置");
}

export async function getSuggestions(
  query: string
): Promise<{ suggestions: GeocodingResult[]; service: string }> {
  if (query.length < 2) {
    return { suggestions: [], service: "none" };
  }
  
  try {
    // First try local suggestions for fast response
    const localResults = await localService.search(query);
    if (localResults.length > 0) {
      return { suggestions: localResults.slice(0, 3), service: "Local" };
    }
    
    // Then try Nominatim with shorter timeout
    try {
      const nominatimResults = await nominatimService.search(query);
      return { suggestions: nominatimResults.slice(0, 5), service: "Nominatim" };
    } catch (error) {
      // Return local results even if they're empty
      return { suggestions: localResults, service: "Local" };
    }
  } catch (error) {
    return { suggestions: [], service: "error" };
  }
}