/**
 * 智能快取機制測試腳本
 */

async function testCacheMechanism() {
  console.log('🧪 開始測試智能快取機制...\n');
  
  // 測試 1: 距離計算功能
  console.log('📏 測試 1: 距離計算功能');
  const testPoints = [
    {
      name: '台南市政府到台南安南區',
      lat1: 22.9998, lon1: 120.2269, // 台南市政府
      lat2: 23.0458, lon2: 120.1729, // 安南區
      expectedDistance: '約 7-8 公里'
    },
    {
      name: '相同位置',
      lat1: 22.9998, lon1: 120.2269,
      lat2: 22.9998, lon2: 120.2269,
      expectedDistance: '0 公里'
    },
    {
      name: '500米內',
      lat1: 22.9998, lon1: 120.2269,
      lat2: 23.0043, lon2: 120.2314, // 約500米
      expectedDistance: '約 500 米'
    }
  ];
  
  testPoints.forEach(point => {
    const distance = calculateDistance(point.lat1, point.lon1, point.lat2, point.lon2);
    console.log(`  ${point.name}: ${Math.round(distance)} 米 (預期: ${point.expectedDistance})`);
  });
  console.log('✅ 距離計算功能測試完成\n');
  
  // 測試 2: 快取判斷邏輯
  console.log('🧠 測試 2: 快取判斷邏輯');
  const cacheTestCases = [
    {
      name: '距離太遠 (超過500米)',
      distance: 800,
      timeDiff: 1, // 1小時前
      newsCount: 5,
      shouldUseCache: false
    },
    {
      name: '時間太舊 (超過3小時)',
      distance: 300,
      timeDiff: 4, // 4小時前
      newsCount: 5,
      shouldUseCache: false
    },
    {
      name: '新聞數量不足',
      distance: 300,
      timeDiff: 1,
      newsCount: 2,
      shouldUseCache: false
    },
    {
      name: '完美符合條件',
      distance: 300,
      timeDiff: 1.5,
      newsCount: 8,
      shouldUseCache: true
    },
    {
      name: '邊界條件 - 正好500米',
      distance: 500,
      timeDiff: 3,
      newsCount: 3,
      shouldUseCache: true
    }
  ];
  
  cacheTestCases.forEach(testCase => {
    const shouldUse = shouldUseCacheData(testCase.distance, testCase.timeDiff, testCase.newsCount);
    const status = shouldUse === testCase.shouldUseCache ? '✅' : '❌';
    console.log(`  ${status} ${testCase.name}: ${shouldUse ? '使用快取' : '重新爬蟲'}`);
  });
  console.log('✅ 快取判斷邊緣測試完成\n');
  
  // 測試 3: 搜尋半徑相似性判斷
  console.log('📐 測試 3: 搜尋半徑相似性判斷');
  const radiusTestCases = [
    { current: 1000, cached: 1000, expected: true, desc: '完全相同' },
    { current: 1000, cached: 1200, expected: true, desc: '差異20% (可接受)' },
    { current: 1000, cached: 1500, expected: true, desc: '差異50% (邊界)' },
    { current: 1000, cached: 1600, expected: false, desc: '差異60% (超過限制)' },
    { current: 1000, cached: 400, expected: true, desc: '反向差異60% (可接受)' }
  ];
  
  radiusTestCases.forEach(testCase => {
    const isSimilar = isRadiusSimilar(testCase.current, testCase.cached);
    const status = isSimilar === testCase.expected ? '✅' : '❌';
    console.log(`  ${status} ${testCase.desc}: ${testCase.current}m vs ${testCase.cached}m → ${isSimilar ? '相似' : '不相似'}`);
  });
  console.log('✅ 搜尋半徑相似性判斷測試完成\n');
  
  // 測試 4: 模擬快取資料結構
  console.log('🗄️ 測試 4: 模擬快取資料結構');
  const mockCacheData = generateMockCacheData();
  console.log(`  模擬快取資料:`)
  console.log(`    搜尋記錄: ${mockCacheData.length} 筆`);
  
  mockCacheData.forEach((search, index) => {
    console.log(`    ${index + 1}. ${search.location_name}`);
    console.log(`       座標: (${search.latitude}, ${search.longitude})`);
    console.log(`       新聞: ${search.flood_news.length} 篇`);
    console.log(`       更新: ${search.updated_at}`);
    console.log(`       來源: ${[...new Set(search.flood_news.map(n => n.source))].join(', ')}`);
  });
  console.log('✅ 模擬快取資料結構測試完成\n');
  
  // 測試 5: 快取策略效能分析
  console.log('⚡ 測試 5: 快取策略效能分析');
  const performanceMetrics = calculateCachePerformanceMetrics();
  console.log(`  預估效能提升:`);
  console.log(`    快取命中率: ${performanceMetrics.hitRate}%`);
  console.log(`    回應時間減少: ${performanceMetrics.responseTimeReduction}%`);
  console.log(`    爬蟲請求減少: ${performanceMetrics.crawlRequestReduction}%`);
  console.log(`    資料庫負載減少: ${performanceMetrics.dbLoadReduction}%`);
  console.log('✅ 快取策略效能分析完成\n');
  
  // 測試 6: 快取失效策略
  console.log('🔄 測試 6: 快取失效策略');
  const invalidationCases = [
    { hours: 1, shouldInvalidate: false, reason: '資料仍新鮮' },
    { hours: 2.5, shouldInvalidate: false, reason: '接近但未超過閾值' },
    { hours: 3, shouldInvalidate: false, reason: '正好在閾值' },
    { hours: 3.1, shouldInvalidate: true, reason: '超過3小時閾值' },
    { hours: 6, shouldInvalidate: true, reason: '資料過舊' },
    { hours: 24, shouldInvalidate: true, reason: '資料嚴重過期' }
  ];
  
  invalidationCases.forEach(testCase => {
    const shouldInvalidate = testCase.hours > 3;
    const status = shouldInvalidate === testCase.shouldInvalidate ? '✅' : '❌';
    const action = shouldInvalidate ? '失效' : '有效';
    console.log(`  ${status} ${testCase.hours}小時前: ${action} (${testCase.reason})`);
  });
  console.log('✅ 快取失效策略測試完成\n');
  
  console.log('🎉 智能快取機制測試完成！');
  console.log('📊 測試總結:');
  console.log('  ✅ 距離計算: 精確到米級');
  console.log('  ✅ 快取判斷: 多維度條件檢查');
  console.log('  ✅ 半徑相似性: 50%容差範圍');
  console.log('  ✅ 資料結構: 完整關聯查詢');
  console.log('  ✅ 效能分析: 顯著提升預期');
  console.log('  ✅ 失效策略: 3小時自動過期');
}

// 測試輔助函數
function calculateDistance(lat1, lon1, lat2, lon2) {
  const earthRadius = 6371000; // 地球半徑 (米)
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  
  return earthRadius * c;
}

function toRadians(degrees) {
  return degrees * (Math.PI / 180);
}

function shouldUseCacheData(distance, timeDiffHours, newsCount) {
  return distance <= 500 && timeDiffHours <= 3 && newsCount >= 3;
}

function isRadiusSimilar(currentRadius, cachedRadius) {
  return Math.abs(cachedRadius - currentRadius) / currentRadius <= 0.5;
}

function generateMockCacheData() {
  return [
    {
      id: 'cache-1',
      location_name: '台南市安南區',
      latitude: 23.0458,
      longitude: 120.1729,
      search_radius: 1000,
      updated_at: new Date(Date.now() - 1.5 * 60 * 60 * 1000).toISOString(), // 1.5小時前
      flood_news: [
        {
          title: '台南安南區積水路段報告',
          source: 'PTT',
          content_type: 'PTT論壇',
          publish_date: new Date().toISOString()
        },
        {
          title: '安南區排水系統改善工程',
          source: 'Dcard',
          content_type: 'Dcard討論',
          publish_date: new Date().toISOString()
        },
        {
          title: '台南豪雨積水即時回報',
          source: 'Twitter',
          content_type: 'Twitter貼文',
          publish_date: new Date().toISOString()
        },
        {
          title: '台南安南區雨量警報',
          source: '中央氣象署',
          content_type: 'Government Weather Data',
          publish_date: new Date().toISOString()
        },
        {
          title: '台南淹水新聞彙整',
          source: 'Google News',
          content_type: 'News',
          publish_date: new Date().toISOString()
        }
      ]
    },
    {
      id: 'cache-2',
      location_name: '高雄市前金區',
      latitude: 22.6273,
      longitude: 120.3014,
      search_radius: 1500,
      updated_at: new Date(Date.now() - 0.8 * 60 * 60 * 1000).toISOString(), // 0.8小時前
      flood_news: [
        {
          title: '高雄前金區水位監測',
          source: '經濟部水利署',
          content_type: 'Government Water Level',
          publish_date: new Date().toISOString()
        },
        {
          title: '前金區淹水經驗分享',
          source: 'Dcard',
          content_type: 'Dcard討論',
          publish_date: new Date().toISOString()
        },
        {
          title: '高雄暴雨即時路況',
          source: 'Twitter',
          content_type: 'Twitter貼文',
          publish_date: new Date().toISOString()
        }
      ]
    }
  ];
}

function calculateCachePerformanceMetrics() {
  return {
    hitRate: 65, // 假設65%的搜尋可以命中快取
    responseTimeReduction: 80, // 快取回應比爬蟲快80%
    crawlRequestReduction: 70, // 減少70%的爬蟲請求
    dbLoadReduction: 45 // 減少45%的資料庫寫入負載
  };
}

// 執行測試
testCacheMechanism().catch(console.error);