#!/usr/bin/env node

/**
 * 跨設備同步管理器
 * 自動同步專案狀態、進度追蹤、環境配置
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const os = require('os');

class MultiDeviceSyncManager {
  constructor() {
    this.configFile = './.device-sync-config.json';
    this.stateFile = './PROJECT_STATE.md';
    this.sessionFile = './.claude-session.json';
    
    this.config = this.loadConfig();
    this.deviceId = this.getDeviceId();
  }

  async initialize() {
    console.log('🌍 初始化跨設備同步系統...\n');
    
    await this.registerDevice();
    await this.syncProjectState();
    await this.restoreClaudeContext();
    await this.checkEnvironmentDependencies();
    
    console.log('✅ 跨設備同步初始化完成！');
    console.log(`📱 當前設備: ${this.deviceId}`);
    console.log(`🕐 最後同步: ${new Date().toLocaleString('zh-TW')}\n`);
  }

  async registerDevice() {
    console.log('📱 註冊設備資訊...');
    
    const deviceInfo = {
      id: this.deviceId,
      name: this.getDeviceName(),
      os: process.platform,
      nodeVersion: process.version,
      timestamp: new Date().toISOString(),
      workingDirectory: process.cwd()
    };

    const devices = this.config.devices || {};
    devices[this.deviceId] = deviceInfo;
    this.config.devices = devices;
    this.config.lastDevice = this.deviceId;
    
    this.saveConfig();
    console.log(`   設備已註冊: ${deviceInfo.name} (${deviceInfo.id})`);
  }

  async syncProjectState() {
    console.log('📊 同步專案狀態...');
    
    try {
      const gitBranch = execSync('git branch --show-current', { encoding: 'utf-8' }).trim();
      const gitStatus = execSync('git status --porcelain', { encoding: 'utf-8' }).trim();
      const lastCommit = execSync('git log -1 --format="%h - %s (%cr)"', { encoding: 'utf-8' }).trim();
      const packageJson = JSON.parse(fs.readFileSync('./package.json', 'utf-8'));
      
      const projectState = {
        branch: gitBranch,
        hasUncommittedChanges: gitStatus.length > 0,
        lastCommit: lastCommit,
        version: packageJson.version,
        lastSync: new Date().toISOString(),
        syncedFrom: this.deviceId
      };

      this.config.projectState = projectState;
      this.saveConfig();
      
      console.log(`   分支: ${gitBranch}`);
      console.log(`   狀態: ${gitStatus ? '有未提交變更' : '乾淨'}`);
      console.log(`   最後提交: ${lastCommit}`);
      
    } catch (error) {
      console.log(`   ⚠️ Git 狀態檢查失敗: ${error.message}`);
    }
  }

  async restoreClaudeContext() {
    console.log('🤖 準備 Claude 會話上下文...');
    
    const claudeContext = {
      projectName: 'Flood Risk Radar',
      currentPhase: 'Phase 1 - 社群媒體整合',
      keyCompletedTasks: [
        '基礎架構搭建完成',
        'Supabase 後端整合',
        '新聞搜尋功能實作',
        'Auto Redeploy 系統建立',
        '社群媒體智能模擬方案'
      ],
      currentChallenges: [
        '真實社群媒體爬蟲技術限制',
        '政府 API 部分失效',
        '需要前端 UI/UX 改善'
      ],
      nextSteps: [
        '優化智能模擬資料系統',
        '修復政府 API 整合',
        '前端使用者介面改善'
      ],
      technicalStack: 'React + Vite + TypeScript + Supabase + MapLibre GL',
      lastUpdated: new Date().toISOString(),
      deviceContext: this.deviceId
    };

    fs.writeFileSync(this.sessionFile, JSON.stringify(claudeContext, null, 2));
    
    console.log('   Claude 上下文已準備');
    console.log(`   專案階段: ${claudeContext.currentPhase}`);
  }

  async checkEnvironmentDependencies() {
    console.log('🔍 檢查開發環境...');
    
    const checks = [
      { name: 'Node.js', command: 'node --version', required: true },
      { name: 'npm', command: 'npm --version', required: true },
      { name: 'Git', command: 'git --version', required: true }
    ];

    const results = {};
    
    for (const check of checks) {
      try {
        const version = execSync(check.command, { encoding: 'utf-8' }).trim();
        results[check.name] = { available: true, version };
        console.log(`   ✅ ${check.name}: ${version}`);
      } catch (error) {
        results[check.name] = { available: false, error: error.message };
        const status = check.required ? '❌' : '⚠️';
        console.log(`   ${status} ${check.name}: 未安裝或不可用`);
      }
    }

    this.config.environment = results;
    this.saveConfig();
    
    if (!fs.existsSync('./node_modules')) {
      console.log('   📦 需要安裝依賴: npm install');
    } else {
      console.log('   📦 依賴已安裝');
    }
  }

  generateClaudeBrief() {
    const briefing = `# 🤖 Claude 專案簡報

## 📍 當前位置
你現在正在協助 **Flood Risk Radar** 專案的開發。這是一個使用 React + Supabase 建立的淹水風險評估系統。

## 🎯 專案狀態
- **階段**: Phase 1 - 社群媒體整合
- **進度**: 70% (基礎功能完成)  
- **分支**: ${this.config.projectState?.branch || 'main'}
- **設備**: ${this.deviceId}

## ✅ 已完成
1. 基礎 React + Vite + TypeScript 架構
2. Supabase 後端與 Edge Functions
3. 地圖功能與地址搜尋
4. 新聞搜尋 (Google News + GDELT)
5. Auto Redeploy 自動部署系統

## 🚧 當前挑戰
1. **社群媒體爬蟲**: 真實爬蟲受技術限制，採用智能模擬
2. **政府 API**: 部分端點需要修復
3. **UI/UX**: 前端介面需要改善

## 🛠️ 技術棧
- 前端: React 18 + Vite + TypeScript + shadcn-ui
- 後端: Supabase Edge Functions (Deno)
- 資料庫: Supabase Postgres
- 地圖: MapLibre GL

---
*同步時間: ${new Date().toLocaleString('zh-TW')}*`;

    return briefing;
  }

  getDeviceId() {
    return `${os.hostname()}-${os.platform()}-${Date.now().toString().slice(-6)}`;
  }

  getDeviceName() {
    return `${os.hostname()} (${os.platform()})`;
  }

  loadConfig() {
    try {
      if (fs.existsSync(this.configFile)) {
        return JSON.parse(fs.readFileSync(this.configFile, 'utf-8'));
      }
    } catch (error) {
      console.log('建立新的設備同步配置...');
    }
    return { version: '1.0.0', devices: {}, sessions: [] };
  }

  saveConfig() {
    fs.writeFileSync(this.configFile, JSON.stringify(this.config, null, 2));
  }
}

// CLI 介面
if (require.main === module) {
  const manager = new MultiDeviceSyncManager();
  const command = process.argv[2];
  
  switch (command) {
    case 'init':
      manager.initialize();
      break;
    case 'brief':
      console.log(manager.generateClaudeBrief());
      break;
    default:
      console.log('使用方式: node scripts/sync-manager.js [init|brief]');
  }
}

module.exports = MultiDeviceSyncManager;
