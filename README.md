# 淹水風險雷達（Flood Risk Radar）

一個以 React/Vite/Tailwind 建置、使用 Supabase 作為後端與資料庫的開源專案。協助使用者評估地點（如購屋地點）的淹水風險，並提供相關新聞與地圖視覺化。

- 線上預覽（Lovable 專案頁）: https://lovable.dev/projects/a3bd2c53-f98b-489d-ba04-254d43c53d94
- 前端：React + Vite + TypeScript + shadcn-ui + Tailwind CSS
- 後端：Supabase Edge Functions（search-flood-news）
- 資料庫：Supabase Postgres（含 RLS 政策與 migrations）

## 功能
- 地址搜尋與多來源地理編碼（具備錯誤處理與提示）
- 地圖顯示與範圍選擇
- 相關洪水/淹水新聞查詢（Edge Function）
- 搜尋統計與風險指標

## 架構概覽
- 前端（/src）呼叫 Supabase（匿名金鑰）與 Edge Function
- Edge Function（/supabase/functions/search-flood-news）讀寫資料庫
- 資料庫 schema 與 RLS 由 /supabase/migrations 管理

## 快速開始
1) 需求
- Node.js 18+、npm 9+

2) 安裝與啟動
```bash
npm i
npm run dev
```
開啟瀏覽器至 http://localhost:8080

3) 前端設定
- Supabase client 位置：src/integrations/supabase/client.ts
- 目前專案使用「可公開的」Supabase URL 與 anon key（僅前端可用）。若你 fork 專案，請替換為你自己的 Supabase 專案 URL 與 anon key。

## Supabase 設定與部署
1) 建立 Supabase 專案後，套用資料庫 migrations：
- 使用 Supabase SQL Editor 將 supabase/migrations 內的 SQL 套用至你的專案
- 主要資料表：flood_searches、flood_news（已啟用 RLS）

2) Edge Function secrets（於 Supabase Dashboard → Functions → Secrets）：
- SUPABASE_URL
- SUPABASE_ANON_KEY
- SUPABASE_SERVICE_ROLE_KEY
- SUPABASE_DB_URL

3) 部署 Edge Function（search-flood-news）
- 原始碼：supabase/functions/search-flood-news/index.ts
- 在 Supabase Dashboard 的 Edge Functions 頁面部署，並可於 Logs 檢視執行紀錄

注意：請勿在版本庫中提交 Service Role Key 等敏感資訊；僅於 Supabase Secrets 中設定。

## 指令腳本
- 開發：`npm run dev`
- 建置：`npm run build`
- 預覽：`npm run preview`

## 資料夾結構（節錄）
```
src/
  components/
  pages/
  integrations/supabase/
  utils/
supabase/
  functions/search-flood-news/index.ts
  migrations/
```

## 貢獻
歡迎 Issue 與 Pull Request！請先閱讀 CONTRIBUTING.md 以了解分支、Commit 風格與 PR 流程。

## 安全性
若發現安全性問題，請參考 SECURITY.md 的回報方式。

## 授權
此專案以 MIT License 授權，詳見 LICENSE。

