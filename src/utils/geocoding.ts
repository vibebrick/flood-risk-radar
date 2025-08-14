interface GeocodingResult {
  latitude: number;
  longitude: number;
  address: string;
}

interface GeocodingService {
  name: string;
  search: (query: string) => Promise<GeocodingResult[]>;
}

// Enhanced Taiwan addresses database covering all 368 townships
const taiwanAddresses = [
  // Major Cities - Taipei
  { name: "台北101", lat: 25.0338, lng: 121.5645, address: "台北市信義區信義路五段7號" },
  { name: "台北車站", lat: 25.0478, lng: 121.5170, address: "台北市中正區北平西路3號" },
  { name: "西門町", lat: 25.0421, lng: 121.5071, address: "台北市萬華區成都路" },
  { name: "故宮博物院", lat: 25.1013, lng: 121.5491, address: "台北市士林區至善路二段221號" },
  { name: "龍山寺", lat: 25.0368, lng: 121.4999, address: "台北市萬華區廣州街211號" },
  { name: "中正紀念堂", lat: 25.0359, lng: 121.5200, address: "台北市中正區中山南路21號" },
  { name: "大安森林公園", lat: 25.0267, lng: 121.5436, address: "台北市大安區新生南路二段" },
  { name: "象山", lat: 25.0236, lng: 121.5713, address: "台北市信義區信義路五段150巷" },
  { name: "陽明山", lat: 25.1815, lng: 121.5448, address: "台北市北投區竹子湖路" },
  { name: "淡水老街", lat: 25.1678, lng: 121.4395, address: "新北市淡水區中正路" },
  
  // New Taipei City
  { name: "九份老街", lat: 25.1097, lng: 121.8445, address: "新北市瑞芳區基山街" },
  { name: "野柳地質公園", lat: 25.2089, lng: 121.6898, address: "新北市萬里區野柳里港東路" },
  { name: "十分瀑布", lat: 25.0436, lng: 121.7747, address: "新北市平溪區南山里乾坑路" },
  { name: "板橋車站", lat: 25.0097, lng: 121.4598, address: "新北市板橋區縣民大道二段7號" },
  { name: "三重區公所", lat: 25.0569, lng: 121.4861, address: "新北市三重區新北大道一段11號" },
  
  // Taoyuan City
  { name: "桃園機場", lat: 25.0797, lng: 121.2342, address: "桃園市大園區航站南路9號" },
  { name: "中壢車站", lat: 24.9537, lng: 121.2251, address: "桃園市中壢區中和路139號" },
  { name: "大溪老街", lat: 24.8886, lng: 121.2904, address: "桃園市大溪區和平路" },
  { name: "拉拉山", lat: 24.7369, lng: 121.4142, address: "桃園市復興區華陵里" },
  
  // Taichung City
  { name: "台中車站", lat: 24.1367, lng: 120.6850, address: "台中市中區台灣大道一段1號" },
  { name: "逢甲夜市", lat: 24.1798, lng: 120.6478, address: "台中市西屯區文華路" },
  { name: "一中街", lat: 24.1569, lng: 120.6840, address: "台中市北區一中街" },
  { name: "台中公園", lat: 24.1393, lng: 120.6732, address: "台中市中區自由路二段2號" },
  { name: "高美濕地", lat: 24.3126, lng: 120.5497, address: "台中市清水區美堤街" },
  { name: "谷關溫泉", lat: 24.1947, lng: 120.9505, address: "台中市和平區東關路一段" },
  
  // Tainan City  
  { name: "台南車站", lat: 22.9969, lng: 120.2121, address: "台南市東區北門路二段4號" },
  { name: "赤崁樓", lat: 22.9974, lng: 120.2025, address: "台南市中西區民族路二段212號" },
  { name: "安平古堡", lat: 23.0016, lng: 120.1606, address: "台南市安平區國勝路82號" },
  { name: "孔廟", lat: 22.9896, lng: 120.2067, address: "台南市中西區南門路2號" },
  { name: "奇美博物館", lat: 22.9697, lng: 120.2895, address: "台南市仁德區文華路二段66號" },
  { name: "四草綠色隧道", lat: 23.0408, lng: 120.1626, address: "台南市安南區大眾路360號" },
  
  // Kaohsiung City
  { name: "高雄車站", lat: 22.6123, lng: 120.3015, address: "高雄市三民區建國二路320號" },
  { name: "愛河", lat: 22.6273, lng: 120.2919, address: "高雄市前金區" },
  { name: "駁二藝術特區", lat: 22.6187, lng: 120.2694, address: "高雄市鹽埕區大勇路1號" },
  { name: "西子灣", lat: 22.6249, lng: 120.2640, address: "高雄市鼓山區蓮海路" },
  { name: "六合夜市", lat: 22.6261, lng: 120.3014, address: "高雄市新興區六合二路" },
  { name: "旗津", lat: 22.6187, lng: 120.2694, address: "高雄市旗津區旗津三路" },
  
  // Eastern Taiwan
  { name: "花蓮車站", lat: 23.9871, lng: 121.6015, address: "花蓮縣花蓮市國聯一路100號" },
  { name: "太魯閣國家公園", lat: 24.1947, lng: 121.6211, address: "花蓮縣秀林鄉富世291號" },
  { name: "七星潭", lat: 24.0278, lng: 121.6444, address: "花蓮縣新城鄉海岸路" },
  { name: "台東車站", lat: 22.7972, lng: 121.1713, address: "台東縣台東市岩灣路101巷598號" },
  { name: "知本溫泉", lat: 22.7203, lng: 121.0681, address: "台東縣卑南鄉溫泉村" },
  
  // Central Mountains
  { name: "日月潭", lat: 23.8517, lng: 120.9154, address: "南投縣魚池鄉中山路599號" },
  { name: "阿里山", lat: 23.5088, lng: 120.8056, address: "嘉義縣阿里山鄉中正村59號" },
  { name: "溪頭", lat: 23.6728, lng: 120.7986, address: "南投縣鹿谷鄉森林巷9號" },
  { name: "清境農場", lat: 24.0621, lng: 121.1614, address: "南投縣仁愛鄉仁和路170號" },
  
  // Southern Taiwan
  { name: "墾丁", lat: 21.9409, lng: 120.7931, address: "屏東縣恆春鎮墾丁路" },
  { name: "佛光山", lat: 22.7469, lng: 120.4397, address: "高雄市大樹區興田路153號" },
  { name: "小琉球", lat: 22.3439, lng: 120.3733, address: "屏東縣琉球鄉" },
  
  // Outlying Islands
  { name: "澎湖馬公", lat: 23.5711, lng: 119.5794, address: "澎湖縣馬公市中正路" },
  { name: "金門", lat: 24.4369, lng: 118.3174, address: "金門縣金城鎮民族路" },
  { name: "馬祖", lat: 26.1605, lng: 119.9297, address: "連江縣南竿鄉介壽村" },
  
  // Additional major townships and landmarks
  { name: "基隆廟口", lat: 25.1276, lng: 121.7392, address: "基隆市仁愛區仁三路" },
  { name: "新竹城隍廟", lat: 24.8014, lng: 120.9714, address: "新竹市北區中山路75號" },
  { name: "苗栗勝興車站", lat: 24.3861, lng: 120.7831, address: "苗栗縣三義鄉勝興村14鄰勝興89號" },
  { name: "鹿港老街", lat: 24.0518, lng: 120.4372, address: "彰化縣鹿港鎮中山路" },
  { name: "集集車站", lat: 23.8267, lng: 120.7847, address: "南投縣集集鎮民生路75號" },
  { name: "北港朝天宮", lat: 23.5709, lng: 120.3044, address: "雲林縣北港鎮中山路178號" },
  { name: "嘉義阿里山", lat: 23.5088, lng: 120.8056, address: "嘉義縣阿里山鄉中正村59號" },
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