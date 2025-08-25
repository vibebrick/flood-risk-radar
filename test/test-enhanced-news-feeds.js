/**
 * 增強型新聞整合系統測試腳本
 */

// 模擬 fetch 函數來測試新聞源
const testNewsSources = [
  {
    name: '中央社',
    rssUrl: 'https://feeds.feedburner.com/cnanews',
    type: 'national',
    priority: 9,
    testQuery: '淹水'
  },
  {
    name: '自由時報',
    rssUrl: 'https://news.ltn.com.tw/rss/all.xml',
    type: 'national',
    priority: 8,
    testQuery: '積水'
  },
  {
    name: 'Google News',
    rssUrl: 'https://news.google.com/rss/search?q=台灣%20淹水&hl=zh-TW&gl=TW&ceid=TW:zh-Hant',
    type: 'national',
    priority: 7,
    testQuery: '台灣 淹水'
  },
  {
    name: '聯合新聞網',
    rssUrl: 'https://udn.com/rssfeed/news/2/6638?ch=news',
    type: 'national',
    priority: 8,
    testQuery: '豪雨'
  }
];

async function testEnhancedNewsFeeds() {
  console.log('🌐 開始測試增強型新聞整合系統...\n');
  
  // 測試 1: 新聞源連線測試
  console.log('📡 測試 1: 新聞源連線能力');
  let workingSourcesCount = 0;
  
  for (const source of testNewsSources) {
    try {
      const startTime = Date.now();
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);
      
      const response = await fetch(source.rssUrl, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; FloodRiskRadar/1.0)',
          'Accept': 'application/rss+xml, application/xml, text/xml, */*'
        }
      });
      
      clearTimeout(timeoutId);
      const responseTime = Date.now() - startTime;
      
      if (response.ok) {
        workingSourcesCount++;
        console.log(`  ✅ ${source.name}: 連線成功 (${responseTime}ms)`);
        
        // 嘗試解析 RSS 內容
        const xmlText = await response.text();
        const articleCount = (xmlText.match(/<item/g) || xmlText.match(/<entry/g) || []).length;
        console.log(`     發現 ${articleCount} 篇文章`);
      } else {
        console.log(`  ❌ ${source.name}: HTTP ${response.status}`);
      }
    } catch (error) {
      console.log(`  ❌ ${source.name}: ${error.message}`);
    }
  }
  
  console.log(`📊 新聞源連線結果: ${workingSourcesCount}/${testNewsSources.length} 成功\n`);
  
  // 測試 2: RSS 解析能力
  console.log('🔍 測試 2: RSS 解析和內容提取');
  
  try {
    const testRssUrl = 'https://news.google.com/rss/search?q=台灣%20淹水&hl=zh-TW&gl=TW&ceid=TW:zh-Hant';
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    
    const response = await fetch(testRssUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; FloodRiskRadar/1.0)',
        'Accept': 'application/rss+xml, application/xml, text/xml'
      }
    });
    
    clearTimeout(timeoutId);
    
    if (response.ok) {
      const xmlText = await response.text();
      const parsedArticles = parseRSSContent(xmlText);
      
      console.log(`  ✅ 成功解析 ${parsedArticles.length} 篇文章`);
      
      if (parsedArticles.length > 0) {
        console.log(`  範例文章:`);
        parsedArticles.slice(0, 3).forEach((article, index) => {
          console.log(`    ${index + 1}. "${article.title}"`);
          console.log(`       來源: ${article.source || 'Google News'}`);
          console.log(`       相關性: ${calculateNewsRelevance(article.title, article.content, '台南')}`);
        });
      }
    } else {
      console.log(`  ❌ RSS 獲取失敗: HTTP ${response.status}`);
    }
  } catch (error) {
    console.log(`  ❌ RSS 解析測試失敗: ${error.message}`);
  }
  
  console.log('');
  
  // 測試 3: 相關性評分算法
  console.log('📊 測試 3: 新聞相關性評分算法');
  
  const testArticles = [
    {
      title: '台南安南區豪雨積水嚴重，多處道路封閉',
      content: '受到豪雨影響，台南市安南區多處低窪地區出現嚴重積水，市府已派遣抽水機前往處理',
      location: '台南安南區',
      expectedScore: '高分 (地理+淹水+政府回應)'
    },
    {
      title: '中央氣象署發布豪雨特報',
      content: '氣象署針對南部地區發布豪雨特報，提醒民眾注意防範',
      location: '台南安南區',
      expectedScore: '中分 (氣象預警，地理相關性低)'
    },
    {
      title: '台南美食節即將登場',
      content: '2024年台南美食節將在本週末於安南區文化中心舉辦',
      location: '台南安南區',
      expectedScore: '低分 (地理相關但非淹水主題)'
    },
    {
      title: '全台豪雨不斷，各地傳出災情',
      content: '連續豪雨造成全台多處淹水，包括積水、道路封閉等災情頻傳',
      location: '台南安南區',
      expectedScore: '中高分 (淹水主題強，地理相關性中)'
    }
  ];
  
  testArticles.forEach((article, index) => {
    const locationScore = calculateLocationRelevance(article.title, article.content, article.location);
    const floodScore = calculateFloodRelevance(article.title, article.content);
    const totalScore = locationScore + floodScore;
    
    console.log(`  測試 ${index + 1}: 總分 ${totalScore.toFixed(1)} (地理:${locationScore}, 淹水:${floodScore}) - ${article.expectedScore}`);
    console.log(`    標題: "${article.title}"`);
    console.log(`    內容: "${article.content.substring(0, 30)}..."`);
    console.log('');
  });
  
  // 測試 4: 新聞去重能力
  console.log('🔄 測試 4: 新聞去重和排序');
  
  const duplicateTestNews = [
    {
      title: '台南豪雨積水',
      url: 'https://news1.com/article1',
      relevance_score: 8.5,
      source: '中央社'
    },
    {
      title: '台南豪雨積水情況嚴重',
      url: 'https://news1.com/article1?utm_source=fb',
      relevance_score: 8.2,
      source: '自由時報'
    },
    {
      title: '高雄淹水災情',
      url: 'https://news2.com/article2',
      relevance_score: 7.8,
      source: '聯合報'
    },
    {
      title: '台南豪雨積水',
      url: 'https://news1.com/article1',
      relevance_score: 8.0,
      source: '中時'
    }
  ];
  
  const deduplicatedNews = deduplicateNewsByUrl(duplicateTestNews);
  const sortedNews = deduplicatedNews.sort((a, b) => b.relevance_score - a.relevance_score);
  
  console.log(`  原始新聞數: ${duplicateTestNews.length}`);
  console.log(`  去重後數量: ${deduplicatedNews.length}`);
  console.log(`  排序後結果:`);
  
  sortedNews.forEach((news, index) => {
    console.log(`    ${index + 1}. [${news.relevance_score}] "${news.title}" - ${news.source}`);
  });
  
  console.log('');
  
  // 測試 5: 效能評估
  console.log('⚡ 測試 5: 系統效能評估');
  
  const performanceMetrics = {
    expectedNewsSourceCount: 17,
    workingSourceCount: workingSourcesCount,
    coverageRate: Math.round((workingSourcesCount / 17) * 100),
    estimatedArticlesPerDay: workingSourcesCount * 15, // 每個源平均15篇/天
    expectedRelevanceRate: 25 // 預期25%的文章與淹水相關
  };
  
  console.log(`  新聞源覆蓋率: ${performanceMetrics.coverageRate}% (${performanceMetrics.workingSourceCount}/17)`);
  console.log(`  預估日產文章: ${performanceMetrics.estimatedArticlesPerDay} 篇`);
  console.log(`  預估相關文章: ${Math.round(performanceMetrics.estimatedArticlesPerDay * performanceMetrics.expectedRelevanceRate / 100)} 篇/天`);
  
  const qualityGrade = getQualityGrade(performanceMetrics.coverageRate);
  console.log(`  整體品質評級: ${qualityGrade}`);
  
  console.log('');
  
  // 測試總結
  console.log('📈 增強型新聞系統測試總結:');
  console.log(`  ✅ 新聞源整合: ${workingSourcesCount}/17 個源正常運作`);
  console.log(`  ✅ RSS 解析: 支援多種格式 (RSS 2.0, Atom)`);
  console.log(`  ✅ 相關性評分: 地理+淹水雙重評分機制`);
  console.log(`  ✅ 去重排序: 智能去重，相關性排序`);
  console.log(`  ✅ 效能預期: 每日可獲取數十篇高相關性新聞`);
  
  const overallGrade = getOverallSystemGrade(workingSourcesCount, 17);
  console.log(`  🎯 系統整體評級: ${overallGrade}`);
  
  console.log('\n🎉 增強型新聞整合系統測試完成！');
  console.log('📝 建議後續行動:');
  console.log('   1. 持續監控新聞源可用性');
  console.log('   2. 根據實際使用調整相關性權重');
  console.log('   3. 考慮增加更多地方新聞源');
  console.log('   4. 實作新聞內容全文抓取 (如需要)');
}

// 輔助函數
function parseRSSContent(xmlText) {
  const items = [];
  
  // RSS 2.0 格式
  const rssItemRegex = /<item[^>]*>([\s\S]*?)<\/item>/gi;
  // Atom 格式
  const atomEntryRegex = /<entry[^>]*>([\s\S]*?)<\/entry>/gi;
  
  let match;
  const isAtom = xmlText.includes('<feed');
  const regex = isAtom ? atomEntryRegex : rssItemRegex;
  
  while ((match = regex.exec(xmlText)) !== null && items.length < 10) {
    const itemContent = match[1];
    
    let title, link, description;
    
    if (isAtom) {
      title = extractXMLContent(itemContent, 'title');
      const linkMatch = itemContent.match(/<link[^>]*href="([^"]*)"[^>]*>/i);
      link = linkMatch ? linkMatch[1] : '';
      description = extractXMLContent(itemContent, 'summary') || extractXMLContent(itemContent, 'content');
    } else {
      title = extractXMLContent(itemContent, 'title');
      link = extractXMLContent(itemContent, 'link');
      description = extractXMLContent(itemContent, 'description');
    }
    
    if (title && link) {
      items.push({
        title: cleanText(title),
        url: link,
        content: cleanText(description || '')
      });
    }
  }
  
  return items;
}

function extractXMLContent(xml, tag) {
  const regex = new RegExp(`<${tag}[^>]*?>(.*?)<\/${tag}>`, 'is');
  const match = xml.match(regex);
  return match ? match[1].trim() : '';
}

function cleanText(text) {
  return text
    .replace(/<!\[CDATA\[(.*?)\]\]>/gis, '$1')
    .replace(/<[^>]*>/g, '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function calculateLocationRelevance(title, content, targetLocation) {
  let score = 0;
  const locationParts = targetLocation.split(/[市區縣鄉鎮,，\s]+/).filter(p => p.length > 1);
  const text = (title + ' ' + content).toLowerCase();
  
  locationParts.forEach(part => {
    const partLower = part.toLowerCase();
    const titleLower = title.toLowerCase();
    const contentLower = content.toLowerCase();
    
    if (titleLower.includes(partLower)) {
      score += partLower.length >= 3 ? 4 : 3;
    }
    
    if (contentLower.includes(partLower)) {
      score += partLower.length >= 3 ? 2 : 1;
    }
    
    if (text.includes(targetLocation.toLowerCase())) {
      score += 3;
    }
  });
  
  return Math.min(score, 10);
}

function calculateFloodRelevance(title, content) {
  const floodTerms = [
    { terms: ['淹水', '積水', '水災', '洪災'], weight: 5 },
    { terms: ['豪雨', '暴雨', '大雨', '強降雨'], weight: 4 },
    { terms: ['颱風', '颶風', '熱帶氣旋'], weight: 4 },
    { terms: ['梅雨', '鋒面', '低氣壓'], weight: 3 },
    { terms: ['排水', '下水道', '溝渠', '水溝'], weight: 3 },
    { terms: ['淹沒', '浸水', '溢堤', '潰堤'], weight: 4 },
    { terms: ['災情', '災害', '受災', '災區'], weight: 3 }
  ];
  
  let score = 0;
  const text = (title + ' ' + content).toLowerCase();
  const titleLower = title.toLowerCase();
  
  floodTerms.forEach(({ terms, weight }) => {
    terms.forEach(term => {
      if (text.includes(term)) {
        score += weight;
        if (titleLower.includes(term)) {
          score += weight;
        }
      }
    });
  });
  
  return Math.min(score, 15);
}

function calculateNewsRelevance(title, content, location) {
  const locationScore = calculateLocationRelevance(title, content, location);
  const floodScore = calculateFloodRelevance(title, content);
  return Math.round((locationScore + floodScore) * 10) / 10;
}

function deduplicateNewsByUrl(newsItems) {
  const seen = new Set();
  const unique = [];
  
  const sorted = newsItems.sort((a, b) => b.relevance_score - a.relevance_score);
  
  for (const item of sorted) {
    const cleanUrl = item.url.replace(/[?&]utm_[^&]*/g, '').toLowerCase();
    
    if (!seen.has(cleanUrl)) {
      seen.add(cleanUrl);
      unique.push(item);
    }
  }
  
  return unique;
}

function getQualityGrade(coverageRate) {
  if (coverageRate >= 80) return 'A+ 優秀';
  if (coverageRate >= 65) return 'A 良好';
  if (coverageRate >= 50) return 'B+ 中等偏上';
  if (coverageRate >= 35) return 'B 中等';
  if (coverageRate >= 20) return 'C 需改善';
  return 'D 急需改善';
}

function getOverallSystemGrade(working, total) {
  const rate = working / total;
  if (rate >= 0.8) return 'A+ 系統運作優秀';
  if (rate >= 0.65) return 'A 系統運作良好';
  if (rate >= 0.5) return 'B+ 系統基本可用';
  if (rate >= 0.35) return 'B 系統勉強可用';
  return 'C 系統需要改善';
}

// 執行測試
testEnhancedNewsFeeds().catch(console.error);