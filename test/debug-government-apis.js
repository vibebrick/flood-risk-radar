/**
 * 政府開放資料 API 除錯工具
 * 逐一測試並診斷問題
 */

async function debugGovernmentAPIs() {
  console.log('🔧 政府開放資料 API 除錯開始...\n');
  
  // 測試 1: 中央氣象署基礎連線
  console.log('='.repeat(50));
  console.log('🌧️ 中央氣象署 API 診斷');
  console.log('='.repeat(50));
  
  // 檢查基本網路連線
  try {
    console.log('1️⃣ 測試基本網路連線...');
    const basicTest = await fetch('https://www.cwb.gov.tw/', {
      method: 'HEAD',
      signal: AbortSignal.timeout(10000)
    });
    console.log(`   ✅ 基本連線: ${basicTest.ok ? '成功' : '失敗'} (${basicTest.status})`);
  } catch (error) {
    console.log(`   ❌ 基本連線失敗: ${error.message}`);
  }
  
  // 測試開放資料平台連線
  try {
    console.log('2️⃣ 測試開放資料平台...');
    const platformTest = await fetch('https://opendata.cwb.gov.tw/', {
      method: 'HEAD',
      signal: AbortSignal.timeout(10000)
    });
    console.log(`   ✅ 開放資料平台: ${platformTest.ok ? '成功' : '失敗'} (${platformTest.status})`);
  } catch (error) {
    console.log(`   ❌ 開放資料平台失敗: ${error.message}`);
  }
  
  // 測試不需授權的 API
  try {
    console.log('3️⃣ 測試免授權 API...');
    const freeApiTest = await fetch('https://opendata.cwb.gov.tw/fileapi/v1/opendataapi/F-C0032-001?format=JSON', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json'
      },
      signal: AbortSignal.timeout(15000)
    });
    
    if (freeApiTest.ok) {
      const data = await freeApiTest.json();
      console.log(`   ✅ 免授權 API: 成功 (${freeApiTest.status})`);
      console.log(`   📄 資料結構: ${data.success === 'true' ? '正常' : '異常'}`);
    } else {
      console.log(`   ❌ 免授權 API: 失敗 (${freeApiTest.status})`);
    }
  } catch (error) {
    console.log(`   ❌ 免授權 API 錯誤: ${error.message}`);
  }
  
  // 測試需要授權的 API (使用正確格式)
  try {
    console.log('4️⃣ 測試授權 API (舊格式)...');
    const authApiTest = await fetch('https://opendata.cwb.gov.tw/fileapi/v1/opendataapi/O-A0001-001?Authorization=CWB-CBA2C7BA-E0E1-46FF-B9E2-10A67F5BF21E&format=JSON', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json'
      },
      signal: AbortSignal.timeout(15000)
    });
    
    if (authApiTest.ok) {
      const data = await authApiTest.json();
      console.log(`   ✅ 授權 API (舊格式): 成功 (${authApiTest.status})`);
      console.log(`   📄 觀測站數量: ${data?.cwbopendata?.location?.length || 0}`);
    } else {
      console.log(`   ❌ 授權 API (舊格式): 失敗 (${authApiTest.status})`);
    }
  } catch (error) {
    console.log(`   ❌ 授權 API (舊格式) 錯誤: ${error.message}`);
  }
  
  // 測試新版 API 格式
  try {
    console.log('5️⃣ 測試新版 API 格式...');
    const newApiTest = await fetch('https://opendata.cwb.gov.tw/api/v1/rest/datastore/O-A0001-001?Authorization=CWB-CBA2C7BA-E0E1-46FF-B9E2-10A67F5BF21E&format=JSON', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json'
      },
      signal: AbortSignal.timeout(15000)
    });
    
    if (newApiTest.ok) {
      const data = await newApiTest.json();
      console.log(`   ✅ 新版 API: 成功 (${newApiTest.status})`);
      console.log(`   📄 資料結構: ${data?.success ? '正常' : '異常'}`);
      console.log(`   📊 記錄數量: ${data?.records?.location?.length || 0}`);
    } else {
      console.log(`   ❌ 新版 API: 失敗 (${newApiTest.status})`);
    }
  } catch (error) {
    console.log(`   ❌ 新版 API 錯誤: ${error.message}`);
  }
  
  console.log('\n' + '='.repeat(50));
  console.log('💧 水利署 API 診斷');
  console.log('='.repeat(50));
  
  // 測試水利署基本連線
  try {
    console.log('1️⃣ 測試水利署基本連線...');
    const waterBasicTest = await fetch('https://www.wra.gov.tw/', {
      method: 'HEAD',
      signal: AbortSignal.timeout(10000)
    });
    console.log(`   ✅ 基本連線: ${waterBasicTest.ok ? '成功' : '失敗'} (${waterBasicTest.status})`);
  } catch (error) {
    console.log(`   ❌ 基本連線失敗: ${error.message}`);
  }
  
  // 測試水利署開放資料平台
  try {
    console.log('2️⃣ 測試水利署開放資料平台...');
    const waterDataTest = await fetch('https://data.wra.gov.tw/', {
      method: 'HEAD',
      signal: AbortSignal.timeout(10000)
    });
    console.log(`   ✅ 開放資料平台: ${waterDataTest.ok ? '成功' : '失敗'} (${waterDataTest.status})`);
  } catch (error) {
    console.log(`   ❌ 開放資料平台失敗: ${error.message}`);
  }
  
  // 測試替代水位 API
  try {
    console.log('3️⃣ 測試替代水位 API...');
    const altWaterTest = await fetch('https://data.wra.gov.tw/Service/OpenData.aspx?format=json&id=C2B4E39D-A0A7-4BB4-9B48-4E7798E0A3BB', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json'
      },
      signal: AbortSignal.timeout(15000)
    });
    
    if (altWaterTest.ok) {
      const data = await altWaterTest.json();
      console.log(`   ✅ 替代水位 API: 成功 (${altWaterTest.status})`);
      console.log(`   📄 資料筆數: ${Array.isArray(data) ? data.length : '非陣列格式'}`);
    } else {
      console.log(`   ❌ 替代水位 API: 失敗 (${altWaterTest.status})`);
    }
  } catch (error) {
    console.log(`   ❌ 替代水位 API 錯誤: ${error.message}`);
  }
  
  // 測試政府資料開放平台
  try {
    console.log('4️⃣ 測試政府資料開放平台...');
    const govDataTest = await fetch('https://data.gov.tw/api/v1/rest/datastore/6872EEA4-F5DD-4ED9-A043-77D0BC289323', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json'
      },
      signal: AbortSignal.timeout(15000)
    });
    
    if (govDataTest.ok) {
      const data = await govDataTest.json();
      console.log(`   ✅ 政府資料開放平台: 成功 (${govDataTest.status})`);
      console.log(`   📄 回應狀態: ${data?.success ? '成功' : '失敗'}`);
    } else {
      console.log(`   ❌ 政府資料開放平台: 失敗 (${govDataTest.status})`);
    }
  } catch (error) {
    console.log(`   ❌ 政府資料開放平台錯誤: ${error.message}`);
  }
  
  console.log('\n' + '='.repeat(50));
  console.log('🔍 診斷結論與建議');
  console.log('='.repeat(50));
  
  console.log('可能的問題：');
  console.log('1. 網路環境限制 (防火牆/代理伺服器)');
  console.log('2. API 金鑰過期或格式錯誤');
  console.log('3. API 端點變更或暫時停用');
  console.log('4. 請求頻率限制');
  console.log('5. SSL/TLS 憑證問題');
  
  console.log('\n建議解決方案：');
  console.log('1. 使用免授權的 API 作為主要資料源');
  console.log('2. 實作多層級備援機制');
  console.log('3. 增加錯誤重試與延遲機制');
  console.log('4. 使用政府資料開放平台的備用端點');
  console.log('5. 實作離線資料快取');
}

// 執行診斷
debugGovernmentAPIs().catch(console.error);