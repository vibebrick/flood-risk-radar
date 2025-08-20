#!/usr/bin/env node

/**
 * 開發安全腳本 - 自動備份與測試
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

class DevSafety {
  constructor() {
    this.backupBranch = 'backup-before-development';
    this.currentBranch = 'feature/real-social-crawlers';
  }

  // 建立還原點
  createRestorePoint(message = '') {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const restorePointName = `restore-point-${timestamp}`;
      
      console.log(`🔄 建立還原點: ${restorePointName}`);
      
      // 確保所有變更都已提交
      execSync('git add .', { cwd: process.cwd() });
      execSync(`git commit -m "自動還原點: ${message || restorePointName}"`, { 
        cwd: process.cwd(),
        stdio: 'pipe'
      });
      
      // 建立還原點標籤
      execSync(`git tag ${restorePointName}`, { cwd: process.cwd() });
      
      console.log(`✅ 還原點已建立: ${restorePointName}`);
      return restorePointName;
    } catch (error) {
      console.log(`ℹ️  工作目錄乾淨，無需建立還原點`);
      return null;
    }
  }

  // 執行測試
  async runTests() {
    try {
      console.log('🧪 執行測試...');
      
      // 檢查 TypeScript 編譯
      console.log('  - TypeScript 類型檢查...');
      execSync('npm run type-check || tsc --noEmit', { 
        cwd: process.cwd(),
        stdio: 'pipe'
      });
      
      // 檢查 ESLint
      console.log('  - ESLint 代碼品質檢查...');
      execSync('npm run lint', { 
        cwd: process.cwd(),
        stdio: 'pipe'
      });
      
      // 檢查建置
      console.log('  - 建置測試...');
      execSync('npm run build', { 
        cwd: process.cwd(),
        stdio: 'pipe'
      });
      
      console.log('✅ 所有測試通過');
      return true;
    } catch (error) {
      console.error('❌ 測試失敗:', error.message);
      return false;
    }
  }

  // 還原到特定點
  restoreToPoint(restorePointName) {
    try {
      console.log(`🔄 還原到: ${restorePointName}`);
      execSync(`git reset --hard ${restorePointName}`, { cwd: process.cwd() });
      console.log(`✅ 成功還原到: ${restorePointName}`);
    } catch (error) {
      console.error('❌ 還原失敗:', error.message);
    }
  }

  // 安全開發流程
  async safeDevProcess(developmentFunction, message) {
    console.log(`\n🚀 開始安全開發流程: ${message}`);
    
    // 1. 建立還原點
    const restorePoint = this.createRestorePoint(message);
    
    try {
      // 2. 執行開發工作
      console.log('🔨 執行開發工作...');
      await developmentFunction();
      
      // 3. 執行測試
      const testsPassed = await this.runTests();
      
      if (!testsPassed) {
        throw new Error('測試失敗');
      }
      
      console.log(`✅ 安全開發流程完成: ${message}`);
      return true;
      
    } catch (error) {
      console.error(`❌ 開發流程失敗: ${error.message}`);
      
      if (restorePoint) {
        console.log('🔄 自動還原到安全狀態...');
        this.restoreToPoint(restorePoint);
      }
      
      return false;
    }
  }
}

module.exports = DevSafety;

// 如果直接執行此腳本
if (require.main === module) {
  const devSafety = new DevSafety();
  
  const action = process.argv[2];
  const message = process.argv[3];
  
  switch (action) {
    case 'backup':
      devSafety.createRestorePoint(message);
      break;
    case 'test':
      devSafety.runTests();
      break;
    case 'restore':
      devSafety.restoreToPoint(message);
      break;
    default:
      console.log('使用方法:');
      console.log('  node dev-safety.js backup "備份訊息"');
      console.log('  node dev-safety.js test');
      console.log('  node dev-safety.js restore "還原點名稱"');
  }
}