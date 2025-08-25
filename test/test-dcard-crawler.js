/**
 * Dcard 爬蟲功能測試腳本
 */

async function testDcardCrawlerLogic() {
  console.log('🧪 開始測試 Dcard 爬蟲邏輯...\n');
  
  // 測試 1: 地理位置看板識別
  console.log('📍 測試 1: 地理位置看板識別');
  const testLocations = ['台南安南區', '高雄鳳山區', '台北信義區', '桃園中壢區', '彰化員林市'];
  
  testLocations.forEach(location => {
    const locationForum = getLocationSpecificForum(location);
    const relevantForums = getRelevantForums(location);
    console.log(`  ${location}:`);
    console.log(`    專門看板: ${locationForum ? locationForum.name : '無'}`);
    console.log(`    相關看板: ${relevantForums.map(f => f.name).join(', ')}`);
    console.log('');
  });
  console.log('✅ 地理位置看板識別測試完成\n');
  
  // 測試 2: 搜尋查詢生成
  console.log('🔍 測試 2: 搜尋查詢生成');
  const searchQueries = generateSearchQueries('台南安南區');
  const locationTerms = generateLocationSpecificTerms('台南安南區');
  
  console.log('  一般搜尋查詢:');
  searchQueries.slice(0, 5).forEach((query, index) => {
    console.log(`    ${index + 1}. "${query}"`);
  });
  
  console.log('  地理特定查詢:');
  locationTerms.forEach((term, index) => {
    console.log(`    ${index + 1}. "${term}"`);
  });
  console.log('✅ 搜尋查詢生成測試完成\n');
  
  // 測試 3: 相關性評分算法
  console.log('📊 測試 3: 相關性評分算法');
  const testCases = [
    {
      title: '台南安南區淹水問題嚴重嗎？',
      content: '最近在考慮在台南安南區租房，但聽說那邊容易淹水，有當地人可以分享經驗嗎？',
      location: '台南安南區',
      expected: '高分 (地理+淹水+租屋情境)'
    },
    {
      title: '台南美食推薦',
      content: '請推薦台南好吃的小吃和餐廳',
      location: '台南安南區', 
      expected: '低分 (只有地理，無淹水關鍵字)'
    },
    {
      title: '機車族雨季困擾',
      content: '每次豪雨天騎車都超緊張，積水深度完全無法預測',
      location: '台南安南區',
      expected: '中分 (有豪雨積水關鍵字，但無明確地理)'
    },
    {
      title: '買房要注意什麼？',
      content: '第一次買房，想請教大家有什麼需要注意的地方',
      location: '台南安南區',
      expected: '極低分 (有買房情境但無地理和淹水關鍵字)'
    }
  ];
  
  testCases.forEach((testCase, index) => {
    const score = calculateRelevance(testCase.title, testCase.content, testCase.location);
    console.log(`  測試案例 ${index + 1}: 評分 ${score}/10 - ${testCase.expected}`);
    console.log(`    標題: ${testCase.title}`);
    console.log(`    內容: ${testCase.content.substring(0, 50)}...`);
    console.log('');
  });
  console.log('✅ 相關性評分算法測試完成\n');
  
  // 測試 4: 智能模擬資料生成
  console.log('🤖 測試 4: 智能模擬資料生成');
  const simulatedPosts = generateIntelligentSimulation('台南安南區');
  console.log(`  生成貼文數量: ${simulatedPosts.length}`);
  console.log('  範例貼文:');
  simulatedPosts.slice(0, 3).forEach((post, index) => {
    console.log(`    ${index + 1}. [${post.forum}] ${post.title}`);
    console.log(`       評分: ${post.relevance_score} | 讚數: ${post.like_count} | 留言: ${post.comment_count}`);
    console.log(`       內容: ${post.content_snippet.substring(0, 60)}...`);
    console.log('');
  });
  console.log('✅ 智能模擬資料生成測試完成\n');
  
  // 測試 5: 看板貼文相關性
  console.log('🎯 測試 5: 看板貼文相關性檢查');
  const postExamples = [
    {
      title: '台南租房經驗分享',
      content: '在台南租房三年了，想分享一些經驗給大家',
      location: '台南安南區'
    },
    {
      title: '豪雨天騎車注意事項',
      content: '分享一些雨天騎車的安全小撇步',
      location: '台南安南區'
    },
    {
      title: '推薦好看的電影',
      content: '最近看了幾部不錯的電影，推薦給大家',
      location: '台南安南區'
    }
  ];
  
  postExamples.forEach((post, index) => {
    const isRelevant = isRelevantPost(post.title, post.content, post.location);
    const status = isRelevant ? '✅ 相關' : '❌ 不相關';
    console.log(`  ${index + 1}. ${status} - ${post.title}`);
  });
  console.log('✅ 看板貼文相關性檢查完成\n');
  
  console.log('🎉 所有 Dcard 爬蟲邏輯測試完成！');
}

// 測試輔助函數 (從 Dcard 爬蟲中複製的邏輯)
function getLocationSpecificForum(locationKeywords) {
  const location = locationKeywords.toLowerCase();
  
  if (location.includes('台南') || location.includes('臺南')) return { name: '台南', slug: 'tainan' };
  if (location.includes('高雄')) return { name: '高雄', slug: 'kaohsiung' };
  if (location.includes('台中') || location.includes('臺中')) return { name: '台中', slug: 'taichung' };
  if (location.includes('桃園')) return { name: '桃園', slug: 'taoyuan' };
  
  return null;
}

function getRelevantForums(locationKeywords) {
  const defaultForums = [
    { name: '租屋', slug: 'rent' },
    { name: '心情', slug: 'mood' },
    { name: '時事', slug: 'trending' },
    { name: '房屋', slug: 'home' }
  ];
  
  const locationForum = getLocationSpecificForum(locationKeywords);
  if (locationForum) {
    defaultForums.unshift(locationForum);
  }
  
  return defaultForums;
}

function generateSearchQueries(locationKeywords) {
  const floodKeywords = [
    '淹水', '積水', '水災', '豪雨', '暴雨', 
    '洪水', '排水', '下水道', '看海', '划船'
  ];
  
  const queries = [];
  
  // 基本地理 + 淹水關鍵字組合
  for (const keyword of floodKeywords.slice(0, 5)) {
    queries.push(`${locationKeywords} ${keyword}`);
  }
  
  // 特殊情境組合
  queries.push(`${locationKeywords} 租屋 積水`);
  queries.push(`${locationKeywords} 買房 淹水`);
  queries.push(`${locationKeywords} 下雨 煩惱`);
  
  return queries;
}

function generateLocationSpecificTerms(locationKeywords) {
  return [
    `${locationKeywords} 積水`,
    `${locationKeywords} 排水`,
    `${locationKeywords} 豪雨`,
    `${locationKeywords} 淹水 經驗`,
    `${locationKeywords} 雨季 困擾`
  ];
}

function calculateRelevance(title, content, locationKeywords) {
  const floodKeywords = [
    '淹水', '積水', '水災', '豪雨', '暴雨', 
    '洪水', '排水', '下水道', '看海', '划船',
    '水深', '封閉', '停班停課', '災情', '滯洪'
  ];
  
  let score = 0;
  const text = (title + ' ' + content).toLowerCase();
  const location = locationKeywords.toLowerCase();
  
  // 地理相關性
  if (text.includes(location)) score += 3;
  if (title.toLowerCase().includes(location)) score += 2;
  
  // 淹水關鍵字相關性
  for (const keyword of floodKeywords) {
    if (text.includes(keyword.toLowerCase())) {
      score += 1;
      if (title.toLowerCase().includes(keyword.toLowerCase())) {
        score += 1;
      }
    }
  }
  
  // Dcard 特有的情境關鍵字
  const contextKeywords = ['租屋', '買房', '居住', '生活', '困擾', '經驗', '建議'];
  for (const keyword of contextKeywords) {
    if (text.includes(keyword)) {
      score += 0.5;
    }
  }
  
  return Math.min(score, 10);
}

function isRelevantPost(title, content, locationKeywords) {
  const floodKeywords = [
    '淹水', '積水', '水災', '豪雨', '暴雨', 
    '洪水', '排水', '下水道', '看海', '划船',
    '水深', '封閉', '停班停課', '災情'
  ];
  
  const text = (title + ' ' + content).toLowerCase();
  const location = locationKeywords.toLowerCase();
  
  const hasLocation = text.includes(location);
  const hasFloodKeyword = floodKeywords.some(keyword => 
    text.includes(keyword.toLowerCase())
  );
  
  return hasLocation || hasFloodKeyword; // Dcard 的相關性要求較寬鬆
}

function generateIntelligentSimulation(locationKeywords) {
  const intelligentTemplates = [
    {
      titleTemplate: `${locationKeywords}淹水問題嚴重嗎？`,
      contentTemplate: `最近在考慮在${locationKeywords}租房，但聽說那邊容易淹水，有當地人可以分享經驗嗎？想了解一下實際狀況`,
      forum: '租屋',
      probability: 0.9
    },
    {
      titleTemplate: `${locationKeywords}又開始積水了...`,
      contentTemplate: `住在${locationKeywords}的痛苦，每次下雨就要煩惱出門問題，政府什麼時候要改善排水啊😭`,
      forum: '心情',
      probability: 0.8
    },
    {
      titleTemplate: `${locationKeywords}機車族的惡夢`,
      contentTemplate: `每次豪雨天騎車經過${locationKeywords}都超緊張，積水深度完全無法預測，有人知道哪些路段比較安全嗎？`,
      forum: '機車',
      probability: 0.6
    }
  ];
  
  const results = [];
  
  for (const template of intelligentTemplates) {
    if (Math.random() < template.probability) {
      const postId = Math.floor(Math.random() * 900000) + 100000;
      
      results.push({
        title: template.titleTemplate,
        url: `https://www.dcard.tw/f/${template.forum}/p/${postId}`,
        content_snippet: template.contentTemplate,
        source: 'Dcard',
        content_type: 'Dcard討論',
        publish_date: new Date().toISOString(),
        relevance_score: 4 + Math.floor(Math.random() * 3),
        forum: template.forum,
        author: 'Dcard用戶',
        like_count: Math.floor(Math.random() * 100),
        comment_count: Math.floor(Math.random() * 50)
      });
    }
  }
  
  return results;
}

// 執行測試
testDcardCrawlerLogic().catch(console.error);