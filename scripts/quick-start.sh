#!/bin/bash

# 🚀 跨設備快速啟動腳本
# 在任何設備上一鍵恢復開發環境

set -e

echo "🌍 Flood Risk Radar - 跨設備快速啟動"
echo "=================================="
echo ""

# 檢查是否在正確目錄
if [ ! -f "package.json" ]; then
    echo "❌ 錯誤: 請在專案根目錄執行此腳本"
    exit 1
fi

# 1. 同步設備狀態
echo "📱 初始化設備同步..."
node scripts/sync-manager.cjs init

echo ""
echo "🔧 檢查並安裝依賴..."

# 2. 安裝 npm 依賴
if [ ! -d "node_modules" ]; then
    echo "📦 安裝 npm 依賴..."
    npm install
else
    echo "✅ npm 依賴已存在"
fi

# 3. 檢查 Git 狀態
echo ""
echo "🔍 檢查 Git 狀態..."
git status --short

# 4. 生成 Claude 簡報
echo ""
echo "🤖 準備 Claude 會話上下文..."
node scripts/sync-manager.cjs brief > CLAUDE_BRIEFING.md
echo "   簡報已保存到 CLAUDE_BRIEFING.md"

# 5. 顯示快速指令
echo ""
echo "✅ 環境準備完成！"
echo ""
echo "🚀 快速指令:"
echo "   npm run dev              # 啟動開發伺服器"
echo "   npm run auto-deploy      # 啟動自動部署"
echo "   npm run build            # 建置專案"
echo "   git status               # 檢查 Git 狀態"
echo ""
echo "📖 詳細資訊:"
echo "   cat PROJECT_STATE.md     # 查看專案狀態"
echo "   cat CLAUDE_BRIEFING.md   # 查看 Claude 簡報"
echo ""
echo "💡 提示: 將 CLAUDE_BRIEFING.md 內容複製給 Claude 即可快速恢復會話上下文！"
