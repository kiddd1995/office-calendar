# 行動辦公室行事曆

行動裝置優先的課程活動與保險公司工作月行事曆。課程活動使用 Supabase，保險公司工作月則讀取正式年度 Excel。

## 目前功能

- 「課程活動」與「公司工作月／發薪日」固定頁首切換
- 月曆上一月、下一月、回到今天與日期選取
- 課程分類色彩、本週重點及完整活動資訊
- 公司、年度選擇與工作月區間背景
- 工作月最後一天、結績日與發薪／獎金標籤
- 日期明細與年度總覽
- 手機、平板與桌面響應式版面
- GitHub Pages 自動部署工作流程
- `xlsx` 工作簿解析模組
- `#/edit` 活動新增、修改、刪除與顯示狀態管理
- Supabase Email／Password 管理員登入與 session 維持
- 可手動將既有 `office-calendar-events` localStorage 備份匯入 Supabase

## 本機開發

需要 Node.js 22（建議使用目前 LTS）。

```bash
npm install
npm run dev
```

請先複製 `.env.example` 為 `.env.local`，並設定：

```text
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
```

不要將 `.env.local` commit 至 Git。

一般檢視：`http://localhost:5173/`

活動編輯：`http://localhost:5173/#/edit`

終端機若顯示不同連接埠，請以終端機輸出為準。

正式建置與本機檢視：

```bash
npm run build
npm run preview
```

## GitHub Pages

`vite.config.ts` 在本機開發使用根路徑 `/`，正式建置則使用 `/office-calendar/`；`.github/workflows/deploy.yml` 會在 `main` 分支 push 後建置並發布 `dist`。

倉庫第一次發布前，請到 GitHub：

1. `Settings → Pages`
2. `Build and deployment → Source`
3. 選擇 `GitHub Actions`

完成後網站網址為：

`https://kiddd1995.github.io/office-calendar/`

### Supabase 部署設定

編輯頁使用 Supabase Auth Email／Password 登入，活動寫入權限由 Supabase RLS 與指定管理員 UID 控制。不要把管理員 Email 或 Password 寫入程式碼、README 或 GitHub Secrets。

到 GitHub repository 的 `Settings → Secrets and variables → Actions` 新增：

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

重新執行 GitHub Pages workflow 後設定才會進入 Vite 建置結果。若缺少任一值，網站會顯示 Supabase 設定錯誤，不會出現空白頁。

`VITE_SUPABASE_PUBLISHABLE_KEY` 是前端可公開使用的 publishable key；資料安全仍必須由 Supabase RLS 控制。

## 資料架構

- `src/types/calendar.ts`：共用資料型別與 repository 介面
- `src/lib/supabaseClient.ts`：Supabase client 與環境設定檢查
- `src/services/calendarEventService.ts`：`calendar_events` 查詢與 CRUD
- `src/services/eventStorage.ts`：唯讀載入舊 localStorage 備份供手動匯入
- `src/services/excelReader.ts`：使用 `xlsx` 載入並解析正式工作簿
- `public/data/insurance-calendar.xlsx`：正式公司工作月資料
- `docs/excel-format.md`：三個工作表的格式與驗證規則

## 課程活動資料權限

- 公開頁使用 anon 身分讀取 `is_visible = true` 的活動。
- 編輯頁登入後讀取全部活動並執行新增、修改、刪除。
- 實際寫入授權由 `calendar_events` 的 RLS policy 驗證管理員 UID。
- 公司工作月／發薪日仍獨立讀取 `public/data/insurance-calendar.xlsx`。
