/**
 * Phase 1 真實 API 連接測試
 * 測試所有免費政府開放資料和合法新聞源的可用性
 */

async function testPhase1RealAPIs() {
  console.log('🧪 Phase 1 真實 API 連接測試開始...\n');
  
  const results = {
    government: { success: 0, total: 0, sources: [] },
    news: { success: 0, total: 0, sources: [] },
    international: { success: 0, total: 0, sources: [] }
  };
  
  console.log('='.repeat(60));
  console.log('📊 政府開放資料 API 測試');
  console.log('='.repeat(60));
  
  // 測試 1: 中央氣象署開放資料
  results.government.total++;
  try {
    console.log('🌧️ 測試 1: 中央氣象署 - 豪雨特報 API');
    const cwbResponse = await fetch(
      'https://opendata.cwb.gov.tw/api/v1/rest/datastore/W-C0033-001?Authorization=CWB-CBA2C7BA-E0E1-46FF-B9E2-10A67F5BF21E',
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; FloodAlert/1.0)',
          'Accept': 'application/json'
        },
        signal: AbortSignal.timeout(10000)
      }
    );
    
    if (cwbResponse.ok) {
      const data = await cwbResponse.json();
      console.log(`  ✅ 成功: HTTP ${cwbResponse.status}`);
      console.log(`  📄 資料結構: ${data.records ? '正常' : '異常'}`);
      results.government.success++;
      results.government.sources.push('中央氣象署豪雨特報');
    } else {
      console.log(`  ❌ 失敗: HTTP ${cwbResponse.status}`);
    }
  } catch (error) {
    console.log(`  ❌ 錯誤: ${error.message}`);
  }
  
  // 測試 2: 中央氣象署即時雨量
  results.government.total++;
  try {
    console.log('\n🌦️ 測試 2: 中央氣象署 - 即時雨量觀測 API');
    const rainResponse = await fetch(
      'https://opendata.cwb.gov.tw/api/v1/rest/datastore/O-A0002-001?Authorization=CWB-CBA2C7BA-E0E1-46FF-B9E2-10A67F5BF21E&locationName=台南',
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; FloodAlert/1.0)',
          'Accept': 'application/json'
        },
        signal: AbortSignal.timeout(10000)
      }
    );
    
    if (rainResponse.ok) {
      const data = await rainResponse.json();
      console.log(`  ✅ 成功: HTTP ${rainResponse.status}`);
      console.log(`  📄 觀測站數量: ${data.records?.location?.length || 0} 站`);
      results.government.success++;
      results.government.sources.push('中央氣象署即時雨量');
    } else {
      console.log(`  ❌ 失敗: HTTP ${rainResponse.status}`);
    }
  } catch (error) {
    console.log(`  ❌ 錯誤: ${error.message}`);
  }
  
  // 測試 3: 水利署河川水位
  results.government.total++;
  try {
    console.log('\n💧 測試 3: 水利署 - 河川水位監測 API');
    const waterResponse = await fetch(
      'https://data.wra.gov.tw/Service/OpenData.aspx?format=json&id=2F4E9A1C-EB0C-4D98-A066-F7F1E9B58E4E',
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; FloodAlert/1.0)',
          'Accept': 'application/json'
        },
        signal: AbortSignal.timeout(10000)
      }
    );
    
    if (waterResponse.ok) {
      const data = await waterResponse.json();
      console.log(`  ✅ 成功: HTTP ${waterResponse.status}`);
      console.log(`  📄 水位站數量: ${Array.isArray(data) ? data.length : 0} 站`);
      results.government.success++;
      results.government.sources.push('水利署河川水位');
    } else {
      console.log(`  ❌ 失敗: HTTP ${waterResponse.status}`);
    }
  } catch (error) {
    console.log(`  ❌ 錯誤: ${error.message}`);
  }
  
  // 測試 4: 水利署水庫放流
  results.government.total++;
  try {
    console.log('\n🏗️ 測試 4: 水利署 - 水庫放流資訊 API');
    const reservoirResponse = await fetch(
      'https://data.wra.gov.tw/Service/OpenData.aspx?format=json&id=1602CA19-B224-4CC3-A06C-E39BF2747E5F',
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; FloodAlert/1.0)',
          'Accept': 'application/json'
        },
        signal: AbortSignal.timeout(10000)
      }
    );
    
    if (reservoirResponse.ok) {
      const data = await reservoirResponse.json();
      console.log(`  ✅ 成功: HTTP ${reservoirResponse.status}`);
      console.log(`  📄 水庫數量: ${Array.isArray(data) ? data.length : 0} 座`);
      results.government.success++;
      results.government.sources.push('水利署水庫放流');
    } else {
      console.log(`  ❌ 失敗: HTTP ${reservoirResponse.status}`);
    }
  } catch (error) {
    console.log(`  ❌ 錯誤: ${error.message}`);
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('🌍 國際新聞 API 測試');
  console.log('='.repeat(60));
  
  // 測試 5: GDELT 國際新聞
  results.international.total++;
  try {
    console.log('📰 測試 5: GDELT 全球新聞 API');
    const gdeltResponse = await fetch(
      'https://api.gdeltproject.org/api/v2/doc/doc?query=taiwan%20flood&mode=artlist&maxrecords=5&format=json',
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; FloodAlert/1.0)',
          'Accept': 'application/json'
        },
        signal: AbortSignal.timeout(15000)
      }
    );
    
    if (gdeltResponse.ok) {
      const textResponse = await gdeltResponse.text();
      if (textResponse.trim().startsWith('{') || textResponse.trim().startsWith('[')) {
        const data = JSON.parse(textResponse);
        console.log(`  ✅ 成功: HTTP ${gdeltResponse.status}`);
        console.log(`  📄 文章數量: ${data.articles?.length || 0} 篇`);
        results.international.success++;
        results.international.sources.push('GDELT國際新聞');
      } else {
        console.log(`  ⚠️ 回應格式異常: 非JSON格式`);
      }
    } else {
      console.log(`  ❌ 失敗: HTTP ${gdeltResponse.status}`);
    }
  } catch (error) {
    console.log(`  ❌ 錯誤: ${error.message}`);
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('📡 新聞 RSS 源測試');
  console.log('='.repeat(60));
  
  // 測試 6: Google News RSS (淹水專用)
  results.news.total++;
  try {
    console.log('🔍 測試 6: Google News RSS - 淹水關鍵字搜尋');
    const googleNewsResponse = await fetch(
      'https://news.google.com/rss/search?q=淹水%20OR%20積水%20OR%20水災%20OR%20豪雨&hl=zh-TW&gl=TW&ceid=TW:zh-Hant',
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; FloodAlert/1.0)',
          'Accept': 'application/rss+xml, application/xml, text/xml'
        },
        signal: AbortSignal.timeout(15000)
      }
    );
    
    if (googleNewsResponse.ok) {
      const xmlText = await googleNewsResponse.text();
      const itemCount = (xmlText.match(/<item[^>]*>/gi) || []).length;
      console.log(`  ✅ 成功: HTTP ${googleNewsResponse.status}`);
      console.log(`  📄 新聞項目: ${itemCount} 則`);
      results.news.success++;
      results.news.sources.push('Google News 淹水搜尋');
    } else {
      console.log(`  ❌ 失敗: HTTP ${googleNewsResponse.status}`);
    }
  } catch (error) {
    console.log(`  ❌ 錯誤: ${error.message}`);
  }
  
  // 測試 7: Google News RSS (台灣一般)
  results.news.total++;
  try {
    console.log('\n📰 測試 7: Google News RSS - 台灣一般新聞');
    const generalNewsResponse = await fetch(
      'https://news.google.com/rss?hl=zh-TW&gl=TW&ceid=TW:zh-Hant',
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; FloodAlert/1.0)',
          'Accept': 'application/rss+xml, application/xml, text/xml'
        },
        signal: AbortSignal.timeout(15000)
      }
    );
    
    if (generalNewsResponse.ok) {
      const xmlText = await generalNewsResponse.text();
      const itemCount = (xmlText.match(/<item[^>]*>/gi) || []).length;
      console.log(`  ✅ 成功: HTTP ${generalNewsResponse.status}`);
      console.log(`  📄 新聞項目: ${itemCount} 則`);
      results.news.success++;
      results.news.sources.push('Google News 台灣');
    } else {
      console.log(`  ❌ 失敗: HTTP ${generalNewsResponse.status}`);
    }
  } catch (error) {
    console.log(`  ❌ 錯誤: ${error.message}`);
  }
  
  // 測試 8: 中央社 RSS
  results.news.total++;
  try {
    console.log('\n📰 測試 8: 中央社 RSS');
    const cnaResponse = await fetch(
      'https://feeds.feedburner.com/cnanews',
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; FloodAlert/1.0)',
          'Accept': 'application/rss+xml, application/xml, text/xml'
        },
        signal: AbortSignal.timeout(15000)
      }
    );
    
    if (cnaResponse.ok) {
      const xmlText = await cnaResponse.text();
      const itemCount = (xmlText.match(/<item[^>]*>/gi) || []).length;
      console.log(`  ✅ 成功: HTTP ${cnaResponse.status}`);
      console.log(`  📄 新聞項目: ${itemCount} 則`);
      results.news.success++;
      results.news.sources.push('中央社');
    } else {
      console.log(`  ❌ 失敗: HTTP ${cnaResponse.status}`);
    }
  } catch (error) {
    console.log(`  ❌ 錯誤: ${error.message}`);
  }
  
  // 測試總結
  console.log('\n' + '='.repeat(60));
  console.log('📊 Phase 1 測試總結');
  console.log('='.repeat(60));
  
  const totalSources = results.government.total + results.news.total + results.international.total;
  const totalSuccess = results.government.success + results.news.success + results.international.success;
  const successRate = Math.round((totalSuccess / totalSources) * 100);
  
  console.log(`\n📈 整體成功率: ${successRate}% (${totalSuccess}/${totalSources})`);
  
  console.log(`\n🏛️ 政府開放資料: ${results.government.success}/${results.government.total} 成功`);
  results.government.sources.forEach(source => console.log(`  ✅ ${source}`));
  
  console.log(`\n🌍 國際新聞: ${results.international.success}/${results.international.total} 成功`);
  results.international.sources.forEach(source => console.log(`  ✅ ${source}`));
  
  console.log(`\n📰 新聞 RSS: ${results.news.success}/${results.news.total} 成功`);
  results.news.sources.forEach(source => console.log(`  ✅ ${source}`));
  
  console.log('\n' + '='.repeat(60));
  console.log('🎯 Phase 1 合規性評估');
  console.log('='.repeat(60));
  
  console.log('✅ 完全免費資料源');
  console.log('✅ 政府開放資料授權');
  console.log('✅ 國際公開新聞 API');
  console.log('✅ 合法 RSS 新聞源');
  console.log('✅ 無社群媒體爬蟲');
  console.log('✅ 無商業 API 依賴');
  console.log('✅ 符合便民專案精神');
  
  console.log('\n🎉 Phase 1 真實 API 測試完成！');
  
  if (successRate >= 75) {
    console.log('🚀 Phase 1 準備就緒，可進入 Phase 2');
  } else {
    console.log('⚠️ 部分 API 需要修復，建議檢查網路連線或 API 金鑰');
  }
  
  return {
    successRate,
    totalSources,
    totalSuccess,
    results
  };
}

// 執行測試
testPhase1RealAPIs().catch(console.error);