# CLAUDE.md — 居住安全透視鏡 (LiveSafe.tw)

此子專案繼承 `../CLAUDE.md` 之所有規範。以下為此專案特有規則。

## 產品定位

- **中文品牌名**：居住安全透視鏡
- **英文 / domain**：livesafe.oharalab.com（保留作為 alternateName）
- **核心 slogan**：買房前的一站式查核報告
- **三不**：不賣房、不估價、不抽佣

## 最高優先（違反即停）

### 禁止捏造資料
- 所有數值必須可追溯至**真實 API response** 或**政府公開資料**
- 測試 fixture 若使用合成資料，須於檔案頂部標註 `FIXTURE / NOT PRODUCTION`
- 醫院清冊、POI、空品數據嚴禁手寫

### 9 維度範圍（v2 已穩定）
- **安全層 60%**：地震斷層、淹水潛勢、坊地災害、空氣品質（等權平均）
- **便利層 40%**：醫療可近性 0.35、交通 0.25、生活機能 0.20、學校密度 0.10、嫌惡設施 0.10（加權平均）
- **不含**：任何房價 / 實價登錄資料
- **規劃中未納入**：土壤液化（資料源無法跨縣市齊備）、治安犯罪率（無 per-district open API）、噪音

### Geocoding 策略
- 使用 Nominatim（免費）— 僅支援「縣市 + 行政區 + 路名」，不處理門牌號
- Nominatim User-Agent 必須含專案名 + 聯絡 email（符合 OSM 使用條款）
- 單次查詢間隔 >= 1s（rate limit）

## 架構

- `data-pipeline/`：Python ETL，產出 `worker/src/data/*.json` 供 Worker 打包
- `worker/`：Cloudflare Worker (Hono + TypeScript)，對外風險計算 API
- `web/`：Next.js 16 + OpenNext，Cloudflare Workers 部署（非 Pages）

## 部署目標

- Web：Cloudflare Workers (`livesafe.oharalab.com`，自訂網域)
- Worker：Cloudflare Workers (`livesafe-worker.kevin868686.workers.dev`)
- Static data：全部 bundle 進 Worker（總 ~10 MB raw / ~2 MB gzip，free tier 3 MiB 限制內）

## API Keys（到位後填入 `.env`）

| Key | 申請網址 | 用於 |
|-----|---------|------|
| `MOENV_API_KEY` | https://data.moenv.gov.tw/ | 空氣品質 AQI 歷史資料 |

> 地震改用 USGS（無需 API key）取代 CWA。

## 已知資料源情境差異

- **臺北市淹水**：data.taipei 130mm/h 短延時情境（其他 21 縣市為水利署 24h 650mm）
- 兩者皆為各自最壞情境，但模擬假設不同
- proxy_note 會明確標註

## Review 規則

- 每個 scorer（`worker/src/scorers/*.ts`）建議附 unit test
- 任何「分數公式」修改需更新：
  - `web/src/app/about/page.tsx`（評分標準說明）
  - `web/src/app/guides/home-safety-checklist/page.tsx`（pillar guide）

## SEO/AEO 注意事項

- 任何文案改動需檢查是否影響：layout title/description/OG、首頁 H1、各 guide title
- 7 篇 guide 內容在 `web/src/app/guides/*/page.tsx`，靜態 SSG
- robots.ts / sitemap.ts / llms.txt 是 Next.js MetadataRoute，新增頁面後同步更新
- 結構化資料（JSON-LD）：WebApplication（layout）+ FAQPage（首頁 + about + guides）+ Article（guides）

## UI 規範

- header logo 含 SVG 圖示（放大鏡 + 房子）+ 「居住安全透視鏡」漸層字
- 卡片設計：glass morphism + 漸層 grade badge
- 9 維度色碼：earthquake purple、flood blue、landslide amber-rose、air cyan、healthcare rose、amenities amber、transit emerald、school violet、nuisance zinc
- 圖示 / emoji：UI 預設零 emoji，使用者明確要求才加（首頁 9 維度 chips 例外）

## 內容指南結構

每篇 `/guides/*/page.tsx` 採以下結構：
- GuideHero（breadcrumb + H1 + intro + updatedAt）
- GuideSection（H2 + body）×3-5
- GuideInlineSearch ×2-3（嵌入查詢工具 CTA）
- GuideFAQ（4-8 個 Q&A + FAQPage JSON-LD）
- GuideRelated（3-4 個相關 guide）
- 包在 GuideArticle wrapper（含 Article JSON-LD）

## 不要做的事

- 不要建議或實作土壤液化（除非找到 22 縣市齊備的 GeoJSON 源）
- 不要在報告中加入房價、實價登錄、估值資訊
- 不要把 FAQ 答案寫成 AI 套話（「總結來說...」「在這個快速變化的時代...」之類）
- 不要重複造輪子：所有 guide 都用 `components/guides/*` 共用元件
