# CLAUDE.md — LiveSafe.tw

此子專案繼承 `../CLAUDE.md` 之所有規範。以下為此專案特有規則。

## 最高優先（違反即停）

### 禁止捏造資料
- 所有數值必須可追溯至**真實 API response** 或**政府公開 CSV**
- 測試 fixture 若使用合成資料，須於檔案頂部標註 `FIXTURE / NOT PRODUCTION`
- 醫院清冊、POI、空品數據嚴禁手寫

### MVP 範圍凍結
- v1 四維度：🏥 醫療可近性、🏪 生活機能、💨 空氣品質（等 key）、🏚️ 地震（等 key）
- v1 **不含**：液化、淹水、活動斷層（GIS 資料下載問題未解）
- v1 **絕對不含**：任何房價 / 實價登錄資料（見 `../open-data-projects/livesafe-spec.md` §2）
- 新增維度前必須更新規格書並告知使用者

### Geocoding 策略
- 使用 Nominatim（免費）— 僅支援「縣市 + 行政區 + 路名」，不處理門牌號
- Nominatim User-Agent 必須含專案名 + 聯絡 email（符合 OSM 使用條款）
- 單次查詢間隔 >= 1s（rate limit）

## 架構

- `data-pipeline/`：Python ETL，產出 `data/processed/*.json` 供 Worker 打包
- `worker/`：Cloudflare Worker (Hono + TypeScript)，對外風險計算 API
- `web/`：Next.js 16，Cloudflare Pages 部署

## 部署目標

- Web：Cloudflare Pages (`livesafe.oharalab.com` 或 `livesafe.tw`)
- Worker：Cloudflare Workers (`api.livesafe.oharalab.com`)
- Static data：Cloudflare R2（若 JSON > 1MB）或直接打包進 Worker bundle

## API Keys（到位後填入 `.env`）

| Key | 申請網址 | 用於 |
|-----|---------|------|
| `CWA_API_KEY` | https://opendata.cwa.gov.tw/user/authkey | 地震資料 |
| `MOENV_API_KEY` | https://data.moenv.gov.tw/ | 空氣品質 AQI |

未取得前，對應 fetch 腳本保留 `raise NotImplementedError("Waiting for API key")`，禁止填假資料跑。

## Review 規則

- 每個 scorer（`worker/src/scorers/*.ts`）必須附 unit test
- 任何「分數公式」修改需更新 `web/src/app/about/page.tsx` 的算法說明
