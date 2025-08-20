/**
 * Edge Function 語法檢查腳本
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function checkEdgeFunctionSyntax() {
  console.log('🔍 檢查 Edge Function 語法...\n');
  
  const functionsDir = path.join(__dirname, '..', 'supabase', 'functions');
  
  try {
    const functionDirs = fs.readdirSync(functionsDir, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name);
    
    console.log(`發現 ${functionDirs.length} 個 Edge Functions:`);
    functionDirs.forEach(dir => console.log(`  - ${dir}`));
    console.log('');
    
    let allPassed = true;
    
    for (const functionDir of functionDirs) {
      const indexPath = path.join(functionsDir, functionDir, 'index.ts');
      
      console.log(`📄 檢查 ${functionDir}/index.ts...`);
      
      if (!fs.existsSync(indexPath)) {
        console.log(`  ❌ 找不到 index.ts 文件`);
        allPassed = false;
        continue;
      }
      
      const content = fs.readFileSync(indexPath, 'utf8');
      
      // 基本語法檢查
      const checks = [
        {
          name: 'CORS Headers',
          test: /corsHeaders\s*=\s*{/,
          required: true
        },
        {
          name: 'Serve Function',
          test: /serve\s*\(/,
          required: true
        },
        {
          name: 'Error Handling',
          test: /catch\s*\(/,
          required: true
        },
        {
          name: 'Console Logging',
          test: /console\.(log|error)/,
          required: false
        },
        {
          name: 'TypeScript Import',
          test: /import.*from/,
          required: true
        }
      ];
      
      let functionPassed = true;
      
      checks.forEach(check => {
        const passed = check.test.test(content);
        const status = passed ? '✅' : (check.required ? '❌' : '⚠️');
        const requirement = check.required ? '(必要)' : '(建議)';
        
        console.log(`  ${status} ${check.name} ${requirement}`);
        
        if (!passed && check.required) {
          functionPassed = false;
        }
      });
      
      // 檢查特定的 PTT 爬蟲相關内容
      if (functionDir === 'search-flood-news') {
        console.log('  🔍 PTT 爬蟲專項檢查:');
        
        const pttChecks = [
          {
            name: 'PTTCrawler Import',
            test: /import.*PTTCrawler/,
            found: /import.*PTTCrawler/.test(content)
          },
          {
            name: 'fetchFromRealPTT Function',
            test: /fetchFromRealPTT/,
            found: /fetchFromRealPTT/.test(content)
          },
          {
            name: 'PTT Fallback Mechanism',
            test: /generatePTTFallbackData|PTTFallbackData/,
            found: /generatePTTFallbackData|PTTFallbackData/.test(content)
          }
        ];
        
        pttChecks.forEach(check => {
          const status = check.found ? '✅' : '❌';
          console.log(`    ${status} ${check.name}`);
          
          if (!check.found) {
            functionPassed = false;
          }
        });
      }
      
      console.log(`  📊 ${functionDir}: ${functionPassed ? '✅ 通過' : '❌ 失敗'}\n`);
      
      if (!functionPassed) {
        allPassed = false;
      }
    }
    
    console.log(`🎯 總結: ${allPassed ? '✅ 所有 Edge Functions 語法檢查通過' : '❌ 部分 Edge Functions 需要修正'}`);
    
    return allPassed;
    
  } catch (error) {
    console.error('❌ Edge Function 語法檢查失敗:', error.message);
    return false;
  }
}

// 執行檢查
checkEdgeFunctionSyntax()
  .then(passed => {
    process.exit(passed ? 0 : 1);
  })
  .catch(error => {
    console.error('檢查執行失敗:', error);
    process.exit(1);
  });

export { checkEdgeFunctionSyntax };