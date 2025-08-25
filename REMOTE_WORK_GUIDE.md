# 🌍 遠端多設備協作指南

這份指南確保你在任何地點、任何設備都能無縫繼續 Flood Risk Radar 專案的開發工作。

## ⚡ 5分鐘快速啟動

### 在新設備上首次設置：

1. **克隆專案**
```bash
git clone https://github.com/vibebrick/flood-risk-radar.git
cd flood-risk-radar
```

2. **一鍵啟動環境**
```bash
chmod +x scripts/quick-start.sh
./scripts/quick-start.sh
```

3. **恢復 Claude 會話**
```bash
cat CLAUDE_BRIEFING.md  # 複製內容給 Claude
```

### 在已有設備上恢復工作：

1. **拉取最新變更**
```bash
git pull origin main
```

2. **同步設備狀態**
```bash
node scripts/sync-manager.js init
```

3. **開始開發**
```bash
npm run dev  # 或 npm run auto-deploy
```

## 🤖 與 Claude 協作的最佳實踐

### 初次對話
當你在新設備或新會話中與 Claude 協作時，請使用：

```
我需要繼續 Flood Risk Radar 專案的開發。以下是當前專案狀態：

[貼上 CLAUDE_BRIEFING.md 的內容]

請根據這個狀態繼續協助我。
```

### 持續對話
- 每次重大進展後，執行 `node scripts/sync-manager.js init` 更新狀態
- `PROJECT_STATE.md` 會自動更新專案進度
- Claude 能立即理解當前開發階段和技術限制

## 📁 重要檔案說明

### 同步相關檔案
- `PROJECT_STATE.md` - 專案當前狀態（自動更新）
- `CLAUDE_BRIEFING.md` - Claude 會話簡報（命令生成）
- `.device-sync-config.json` - 設備同步配置（自動生成）
- `.claude-session.json` - Claude 會話上下文（自動生成）

### 開發相關檔案
- `scripts/sync-manager.js` - 跨設備同步管理器
- `scripts/quick-start.sh` - 一鍵環境啟動
- `scripts/auto-redeploy.js` - 自動部署系統

## 🌐 多地點工作流程

### 情境 1: 辦公室 → 家裡
```bash
# 辦公室結束工作前
git add .
git commit -m "Work progress: [簡述變更]"
git push origin feature/your-branch

# 到家後
git pull origin feature/your-branch
./scripts/quick-start.sh
```

### 情境 2: 桌機 → 筆電
```bash
# 桌機
node scripts/sync-manager.js init  # 同步狀態
git push origin HEAD

# 筆電
git pull origin HEAD
node scripts/sync-manager.js init  # 恢復狀態
```

### 情境 3: 長期中斷後恢復
```bash
# 拉取所有變更
git fetch --all
git pull origin main

# 重新初始化環境
./scripts/quick-start.sh

# 查看專案狀態
cat PROJECT_STATE.md
```

## 🛠️ 故障排除

### 常見問題

**Q: npm install 失敗**
```bash
rm -rf node_modules package-lock.json
npm cache clean --force
npm install
```

**Q: Git 衝突**
```bash
git status  # 查看衝突檔案
git mergetool  # 或手動解決衝突
git commit
```

**Q: 環境不一致**
```bash
node --version  # 檢查 Node.js 版本
npm --version   # 檢查 npm 版本
./scripts/quick-start.sh  # 重新初始化
```

**Q: Claude 忘記專案狀態**
```bash
node scripts/sync-manager.js brief
# 將輸出內容複製給 Claude
```

## 🚀 高效協作技巧

### 1. **標準化提交訊息**
```
feat: 新增功能描述
fix: 修復 Bug 描述  
refactor: 重構代碼描述
docs: 文檔更新
style: 樣式調整
```

### 2. **分支管理策略**
- `main` - 穩定版本
- `feature/功能名稱` - 功能開發
- `fix/問題描述` - Bug 修復

### 3. **Claude 協作模式**
- 每次開始工作前先同步狀態
- 遇到技術問題時提供具體錯誤資訊
- 完成功能後更新 PROJECT_STATE.md

## 📊 專案狀態追蹤

### 自動追蹤的資訊
- ✅ Git 分支和提交狀態
- ✅ 設備和環境資訊
- ✅ 依賴套件版本
- ✅ 開發階段進度
- ✅ 技術限制和解決方案

### 手動更新的資訊
- 🔧 重要功能完成狀態
- 🔧 遇到的新技術問題
- 🔧 下一步開發計劃

## 💡 最佳實踐

1. **每天結束工作前**：提交並推送變更
2. **開始工作前**：拉取最新變更並同步狀態
3. **切換設備時**：使用快速啟動腳本
4. **與 Claude 對話時**：提供專案簡報內容
5. **遇到問題時**：更新狀態檔案並尋求協助

---

這個系統確保你永遠不會因為設備或地點變更而丟失開發進度！🎯
