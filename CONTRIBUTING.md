# 貢獻指南（CONTRIBUTING）

感謝你對淹水風險雷達的興趣！以下是提交貢獻的建議流程：

## 開發環境
- Node.js 18+、npm 9+
- 建議先 fork 再以 Feature Branch 開發

## 分支策略
- main：穩定分支
- feature/<short-name>：功能開發分支
- fix/<short-name>：修補分支

## Commit 風格（建議）
- feat: 新功能
- fix: 修正 bug
- docs: 文件變更
- style: 程式碼風格（不影響功能）
- refactor: 重構（不影響功能）
- perf: 效能優化
- test: 測試新增或變更
- chore: 雜項（建置、工具等）

## PR 準則
- 說明變更動機與範圍，盡量小步提交
- 附上截圖或錄影（若為 UI 變更）
- 若牽涉 Supabase schema 變更，請附上 migrations

## 本地測試
- `npm i` 安裝依賴
- `npm run dev` 啟動開發伺服器
- 確認 Edge Function 與資料庫連線正常（詳見 README 的 Supabase 設定）

## 安全性
- 不要提交任何敏感金鑰（如 Service Role Key）到版本庫
- Edge Function 需透過 Supabase Secrets 提供必要的環境參數
