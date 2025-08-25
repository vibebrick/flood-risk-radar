/**
 * Twitter 爬蟲功能測試腳本
 */

async function testTwitterCrawlerLogic() {
  console.log('🧪 開始測試 Twitter 爬蟲邏輯...\n');
  
  // 測試 1: 地理位置 hashtag 生成
  console.log('📍 測試 1: 地理位置 hashtag 生成');
  const testLocations = ['台南安南區', '高雄鳳山區', '台北信義區', '桃園中壢區', '新竹東區'];
  
  testLocations.forEach(location => {
    const hashtag = getLocationHashtag(location);
    console.log(`  ${location} → #${hashtag}`);
  });
  console.log('✅ 地理位置 hashtag 生成測試完成\n');
  
  // 測試 2: 搜尋查詢生成（含中英文）
  console.log('🔍 測試 2: 搜尋查詢生成');
  const searchQueries = generateSearchQueries('台南安南區');
  console.log('  生成的搜尋查詢:');
  searchQueries.forEach((query, index) => {
    console.log(`    ${index + 1}. "${query}"`);
  });
  console.log('✅ 搜尋查詢生成測試完成\n');
  
  // 測試 3: Twitter URL 建構
  console.log('🌐 測試 3: Twitter 搜尋 URL 建構');
  const testQueries = ['台南安南區 淹水', '高雄 flooding', '積水 traffic'];
  testQueries.forEach(query => {
    const url = buildTwitterSearchUrl(query);
    console.log(`  查詢: "${query}"`);
    console.log(`  URL: ${url}`);
    console.log('');
  });
  console.log('✅ Twitter URL 建構測試完成\n');
  
  // 測試 4: 相關性評分算法
  console.log('📊 測試 4: 相關性評分算法');
  const testCases = [
    {
      content: '台南安南區又開始淹水了 😭 每次下雨都這樣 #淹水 #台南',
      location: '台南安南區',
      expected: '高分 (地理+淹水+hashtag)'
    },
    {
      content: '剛經過台南，積水真的很嚴重 🚗💦 #交通警報',
      location: '台南安南區',
      expected: '中高分 (地理+積水+hashtag)'
    },
    {
      content: '今天台南天氣不錯，適合出遊 ☀️',
      location: '台南安南區', 
      expected: '低分 (只有地理，無淹水關鍵字)'
    },
    {
      content: 'Heavy rain causing flooding in the area now! #flood #weather',
      location: '台南安南區',
      expected: '中分 (英文淹水關鍵字，但無地理)'
    },
    {
      content: '即時路況：xx路段積水 20cm，請注意安全 📍 #即時 #live',
      location: '台南安南區',
      expected: '中高分 (積水+即時性關鍵字)'
    }
  ];
  
  testCases.forEach((testCase, index) => {
    const score = calculateRelevance(testCase.content, testCase.location);
    console.log(`  測試案例 ${index + 1}: 評分 ${score}/10 - ${testCase.expected}`);
    console.log(`    內容: ${testCase.content}`);
    console.log('');
  });
  console.log('✅ 相關性評分算法測試完成\n');
  
  // 測試 5: 智能模擬資料生成
  console.log('🤖 測試 5: 智能模擬資料生成');
  const simulatedPosts = generateIntelligentSimulation('台南安南區');
  console.log(`  生成貼文數量: ${simulatedPosts.length}`);
  console.log('  範例貼文:');
  simulatedPosts.slice(0, 3).forEach((post, index) => {
    console.log(`    ${index + 1}. @${post.author.replace('@', '')}`);
    console.log(`       內容: ${post.content_snippet}`);
    console.log(`       評分: ${post.relevance_score} | 讚數: ${post.like_count} | 轉推: ${post.retweet_count}`);
    console.log('');
  });
  console.log('✅ 智能模擬資料生成測試完成\n');
  
  // 測試 6: 使用者名稱生成
  console.log('👤 測試 6: 使用者名稱生成');
  const userTypes = ['local_resident', 'commuter', 'weather_info', 'property_advice', 'civic_concern'];
  userTypes.forEach(userType => {
    const username = generateRealisticUsername(userType);
    console.log(`  ${userType}: @${username}`);
  });
  console.log('✅ 使用者名稱生成測試完成\n');
  
  // 測試 7: 相關性檢查
  console.log('🎯 測試 7: 貼文相關性檢查');
  const postExamples = [
    {
      content: '台南安南區積水狀況嚴重，請大家小心 #淹水',
      location: '台南安南區'
    },
    {
      content: 'Flooding in Tainan area, heavy rain continues #flood',
      location: '台南安南區'
    },
    {
      content: '今天心情很好，天氣晴朗 ☀️',
      location: '台南安南區'
    },
    {
      content: '豪雨特報，低窪地區請注意 ⛈️ #weather',
      location: '台南安南區'
    }
  ];
  
  postExamples.forEach((post, index) => {
    const isRelevant = isRelevantPost(post.content, post.location);
    const status = isRelevant ? '✅ 相關' : '❌ 不相關';
    console.log(`  ${index + 1}. ${status} - ${post.content.substring(0, 30)}...`);
  });
  console.log('✅ 貼文相關性檢查完成\n');
  
  console.log('🎉 所有 Twitter 爬蟲邏輯測試完成！');
}

// 測試輔助函數 (從 Twitter 爬蟲中複製的邏輯)
function getLocationHashtag(locationKeywords) {
  const location = locationKeywords.toLowerCase();
  
  if (location.includes('台南') || location.includes('臺南')) return '台南';
  if (location.includes('高雄')) return '高雄';
  if (location.includes('台中') || location.includes('臺中')) return '台中';
  if (location.includes('桃園')) return '桃園';
  if (location.includes('台北') || location.includes('臺北')) return '台北';
  
  return '台灣';
}

function generateSearchQueries(locationKeywords) {
  const floodKeywords = [
    '淹水', '積水', '水災', '豪雨', '暴雨', 
    '洪水', '排水', '下水道', '看海', '划船',
    '水深', '封閉', '停班停課', '災情', '滯洪',
    '排水溝', '水溝蓋', '地下道', '涵洞'
  ];

  const englishFloodKeywords = [
    'flood', 'flooding', 'waterlogged', 'heavy rain',
    'storm', 'drainage', 'water level', 'inundation'
  ];
  
  const queries = [];
  
  // 中文關鍵字組合
  for (const keyword of floodKeywords.slice(0, 5)) {
    queries.push(`${locationKeywords} ${keyword}`);
  }
  
  // 英文關鍵字組合
  for (const keyword of englishFloodKeywords.slice(0, 3)) {
    queries.push(`${locationKeywords} ${keyword}`);
  }
  
  // 特殊情境組合
  queries.push(`${locationKeywords} 淹水 即時`);
  queries.push(`${locationKeywords} flooding now`);
  queries.push(`${locationKeywords} 積水 路況`);
  
  return queries;
}

function buildTwitterSearchUrl(query) {
  const encodedQuery = encodeURIComponent(query);
  return `https://twitter.com/search?q=${encodedQuery}&src=typed_query&f=live`;
}

function calculateRelevance(content, locationKeywords) {
  const floodKeywords = [
    '淹水', '積水', '水災', '豪雨', '暴雨', 
    '洪水', '排水', '下水道', '看海', '划船',
    '水深', '封閉', '停班停課', '災情', '滯洪',
    '排水溝', '水溝蓋', '地下道', '涵洞'
  ];

  const englishFloodKeywords = [
    'flood', 'flooding', 'waterlogged', 'heavy rain',
    'storm', 'drainage', 'water level', 'inundation'
  ];
  
  let score = 0;
  const text = content.toLowerCase();
  const location = locationKeywords.toLowerCase();
  
  // 地理相關性
  if (text.includes(location)) score += 3;
  
  // 中文淹水關鍵字相關性
  for (const keyword of floodKeywords) {
    if (text.includes(keyword.toLowerCase())) {
      score += 1;
    }
  }
  
  // 英文淹水關鍵字相關性
  for (const keyword of englishFloodKeywords) {
    if (text.includes(keyword.toLowerCase())) {
      score += 1;
    }
  }
  
  // Twitter 特有的緊急性關鍵字
  const urgencyKeywords = ['即時', '現在', '剛剛', 'now', 'live', '警報'];
  for (const keyword of urgencyKeywords) {
    if (text.includes(keyword.toLowerCase())) {
      score += 1;
    }
  }
  
  // Hashtag 加分
  if (text.includes('#')) score += 0.5;
  
  return Math.min(score, 10);
}

function isRelevantPost(content, locationKeywords) {
  const floodKeywords = [
    '淹水', '積水', '水災', '豪雨', '暴雨', 
    '洪水', '排水', '下水道', '看海', '划船',
    '水深', '封閉', '停班停課', '災情', '滯洪'
  ];

  const englishFloodKeywords = [
    'flood', 'flooding', 'waterlogged', 'heavy rain',
    'storm', 'drainage', 'water level', 'inundation'
  ];
  
  const text = content.toLowerCase();
  const location = locationKeywords.toLowerCase();
  
  const hasLocation = text.includes(location);
  const hasFloodKeyword = [...floodKeywords, ...englishFloodKeywords]
    .some(keyword => text.includes(keyword.toLowerCase()));
  
  return hasLocation && hasFloodKeyword; // Twitter 要求較嚴格的相關性
}

function generateIntelligentSimulation(locationKeywords) {
  const intelligentTemplates = [
    {
      contentTemplate: `${locationKeywords}又開始淹水了 😭 每次下雨都這樣，什麼時候才能改善排水系統啊 #淹水 #${getLocationHashtag(locationKeywords)}`,
      userType: 'local_resident',
      probability: 0.9
    },
    {
      contentTemplate: `剛經過${locationKeywords}，積水真的很嚴重，建議大家小心駕駛 🚗💦 #交通 #積水警報`,
      userType: 'commuter',
      probability: 0.8
    },
    {
      contentTemplate: `${locationKeywords}的朋友們注意了！豪雨特報，低窪地區請提早做好防水準備 ⛈️ #防災 #豪雨`,
      userType: 'weather_info',
      probability: 0.7
    },
    {
      contentTemplate: `機車族的痛！${locationKeywords}某些路段一下雨就變小河，根本無法通行 🏍️💦 #機車族辛酸`,
      userType: 'motorcycle_rider',
      probability: 0.5
    }
  ];
  
  const results = [];
  
  for (const template of intelligentTemplates) {
    if (Math.random() < template.probability) {
      const tweetId = Math.floor(Math.random() * 9000000000000000) + 1000000000000000;
      const publishTime = generateRealisticTimestamp();
      const username = generateRealisticUsername(template.userType);
      
      results.push({
        title: template.contentTemplate.split(' ').slice(0, 8).join(' ') + '...',
        url: `https://twitter.com/${username}/status/${tweetId}`,
        content_snippet: template.contentTemplate,
        source: 'Twitter',
        content_type: 'Twitter貼文',
        publish_date: publishTime,
        relevance_score: 3 + Math.floor(Math.random() * 4),
        author: `@${username}`,
        retweet_count: Math.floor(Math.random() * 50),
        like_count: Math.floor(Math.random() * 200),
        reply_count: Math.floor(Math.random() * 30)
      });
    }
  }
  
  return results;
}

function generateRealisticUsername(userType) {
  const usernames = {
    local_resident: ['TainanLocal123', 'KaohsiungLife', 'LocalResident88', 'CityDweller2024'],
    commuter: ['DailyCommuter', 'TrafficWatcher', 'RoadWarrior2024', 'CarDriver123'],
    weather_info: ['WeatherAlert_TW', 'StormTracker', 'RainWatcher', 'WeatherTW'],
    property_advice: ['PropertyGuide', 'RealEstateTips', 'HouseBuyer2024', 'PropertyExpert'],
    civic_concern: ['CivicWatch', 'CityImprovement', 'PublicConcern', 'UrbanPlanner'],
    motorcycle_rider: ['BikerTW', 'ScooterRider', 'MotorcycleLife', 'TwoWheeler'],
    traffic_reporter: ['TrafficAlert', 'RoadUpdate', 'TrafficInfo_TW', 'LiveTraffic']
  };
  
  const typeUsernames = usernames[userType] || usernames.local_resident;
  return typeUsernames[Math.floor(Math.random() * typeUsernames.length)];
}

function generateRealisticTimestamp() {
  // 生成過去 7 天內的隨機時間 (Twitter 偏重即時性)
  const now = Date.now();
  const randomOffset = Math.random() * 7 * 24 * 60 * 60 * 1000; // 7 天
  return new Date(now - randomOffset).toISOString();
}

// 執行測試
testTwitterCrawlerLogic().catch(console.error);