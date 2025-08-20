/**
 * PTT 爬蟲功能測試腳本
 */

// 模擬 Deno 環境的基本 fetch 功能測試
async function testPTTCrawlerLogic() {
  console.log('🧪 開始測試 PTT 爬蟲邏輯...\n');
  
  // 測試 1: 地理位置識別
  console.log('📍 測試 1: 地理位置識別');
  const testLocations = ['台南安南區', '高雄鳳山區', '台北信義區', '桃園中壢區'];
  
  testLocations.forEach(location => {
    const expectedBoard = getBoardByLocation(location);
    console.log(`  ${location} → ${expectedBoard}`);
  });
  console.log('✅ 地理位置識別測試完成\n');
  
  // 測試 2: 關鍵字相關性評分
  console.log('📊 測試 2: 關鍵字相關性評分');
  const testCases = [
    {
      title: '[問卦] 台南安南區現在是不是又在淹水了？',
      content: '剛剛路過台南安南區，看到很多地方都積水了',
      location: '台南安南區',
      expected: '高分 (地理+淹水關鍵字)'
    },
    {
      title: '[閒聊] 台南美食推薦',
      content: '請推薦台南好吃的小吃',
      location: '台南安南區', 
      expected: '低分 (只有地理，無淹水關鍵字)'
    },
    {
      title: '[新聞] 全台豪雨特報',
      content: '氣象局發布豪雨特報，請民眾注意',
      location: '台南安南區',
      expected: '中分 (有豪雨關鍵字，無明確地理)'
    }
  ];
  
  testCases.forEach((testCase, index) => {
    const score = calculateRelevance(testCase.title, testCase.content, testCase.location);
    console.log(`  測試案例 ${index + 1}: 評分 ${score}/10 - ${testCase.expected}`);
    console.log(`    標題: ${testCase.title}`);
    console.log(`    內容: ${testCase.content}`);
    console.log('');
  });
  console.log('✅ 關鍵字相關性評分測試完成\n');
  
  // 測試 3: 智能模擬資料生成
  console.log('🤖 測試 3: 智能模擬資料生成');
  const simulatedPosts = generateIntelligentSimulation('台南安南區');
  console.log(`  生成貼文數量: ${simulatedPosts.length}`);
  console.log('  範例貼文:');
  simulatedPosts.slice(0, 2).forEach((post, index) => {
    console.log(`    ${index + 1}. ${post.title}`);
    console.log(`       板名: ${post.board} | 評分: ${post.relevance_score}`);
    console.log(`       內容: ${post.content_snippet.substring(0, 50)}...`);
    console.log('');
  });
  console.log('✅ 智能模擬資料生成測試完成\n');
  
  // 測試 4: 搜尋查詢生成
  console.log('🔍 測試 4: 搜尋查詢生成');
  const searchQueries = generateSearchQueries('台南安南區');
  console.log('  生成的搜尋查詢:');
  searchQueries.forEach((query, index) => {
    console.log(`    ${index + 1}. "${query}"`);
  });
  console.log('✅ 搜尋查詢生成測試完成\n');
  
  console.log('🎉 所有 PTT 爬蟲邏輯測試完成！');
}

// 測試輔助函數 (從 PTT 爬蟲中複製的邏輯)
function getBoardByLocation(locationKeywords) {
  const location = locationKeywords.toLowerCase();
  
  if (location.includes('高雄')) return 'Kaohsiung';
  if (location.includes('台南') || location.includes('臺南')) return 'Tainan';
  if (location.includes('台中') || location.includes('臺中')) return 'TaichungBun';
  if (location.includes('桃園')) return 'Taoyuan';
  
  return 'Gossiping';
}

function calculateRelevance(title, content, locationKeywords) {
  const floodKeywords = [
    '淹水', '積水', '水災', '豪雨', '暴雨', 
    '洪水', '排水', '下水道', '看海', '划船',
    '水深', '封閉', '停班停課', '災情'
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
  
  return Math.min(score, 10);
}

function generateIntelligentSimulation(locationKeywords) {
  const intelligentTemplates = [
    {
      titleTemplate: `[問卦] ${locationKeywords}怎麼又淹水了？`,
      contentTemplate: `如題，剛剛經過${locationKeywords}發現又開始積水了，是不是排水系統有問題？有沒有八卦？`,
      board: 'Gossiping',
      probability: 0.8
    },
    {
      titleTemplate: `[情報] ${locationKeywords}積水路段回報`,
      contentTemplate: `${locationKeywords}目前積水路段：請用路人注意安全，建議改道行駛`,
      board: getBoardByLocation(locationKeywords),
      probability: 0.9
    },
    {
      titleTemplate: `[心得] ${locationKeywords}買房要注意淹水問題`,
      contentTemplate: `最近在看${locationKeywords}的房子，但聽說那邊容易淹水，想請教版友經驗`,
      board: 'home-sale',
      probability: 0.6
    }
  ];
  
  const results = [];
  
  for (const template of intelligentTemplates) {
    if (Math.random() < template.probability) {
      const postId = `M.${Date.now() + Math.random() * 1000}.A.${Math.random().toString(36).substr(2, 3)}`;
      
      results.push({
        title: template.titleTemplate,
        url: `https://www.ptt.cc/bbs/${template.board}/${postId}.html`,
        content_snippet: template.contentTemplate,
        source: 'PTT',
        content_type: 'PTT論壇',
        publish_date: new Date().toISOString(),
        relevance_score: 3 + Math.floor(Math.random() * 4),
        board: template.board,
        author: 'PTT用戶'
      });
    }
  }
  
  return results;
}

function generateSearchQueries(locationKeywords) {
  const floodKeywords = ['淹水', '積水', '水災', '豪雨', '暴雨'];
  const queries = [];
  
  for (const keyword of floodKeywords) {
    queries.push(`${locationKeywords} ${keyword}`);
  }
  
  return queries;
}

// 執行測試
if (typeof module !== 'undefined' && require.main === module) {
  testPTTCrawlerLogic().catch(console.error);
} else {
  // 在瀏覽器環境中執行
  testPTTCrawlerLogic().catch(console.error);
}

// 模組導出 (供其他測試使用)
if (typeof module !== 'undefined') {
  module.exports = {
    testPTTCrawlerLogic,
    getBoardByLocation,
    calculateRelevance,
    generateIntelligentSimulation,
    generateSearchQueries
  };
}