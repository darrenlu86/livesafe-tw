# LiveSafe.tw — Roadmap

> 最後更新：2026-05-07
> v1 demo 範圍：空氣品質（AQI）+ 醫療可近性 + 生活機能。
> 下列為未實作維度與後續工作清單。

---

## 已完成（v1 MVP demo）

| 維度 | 狀態 | 資料源 | Pipeline / Scorer |
|------|------|--------|------------------|
| 空氣品質 (AQI) | DONE | 環境部 aqx_p_432（每小時） | `data-pipeline/scripts/fetch_aqi.py` -> `worker/src/scorers/air_quality.ts` |
| 醫療可近性 | DONE | 健保署特約醫事機構 | `fetch_hospitals.py` + `geocode_hospitals.py` -> `scorers/healthcare.ts` |
| 生活機能 | DONE | OSM Overpass | live fetch -> `scorers/amenities.ts` |
| Geocoding | DONE | OSM Nominatim | `worker/src/geocode.ts` |
| 地圖 UI | DONE | Leaflet + OSM tiles | `web/public/demo.html` |

---

## 未實作維度

### 1. 地震風險 (HIGH PRIORITY)

**資料源**
- 顯著有感地震 API：CWA `E-A0015-001`（https://opendata.cwa.gov.tw/dataset/all?page=1&search=E-A0015）
- 活動斷層 shapefile：經濟部地質調查及礦業管理中心（https://www.gsmma.gov.tw/）
- 認證：`CWA_API_KEY`（免費註冊：https://opendata.cwa.gov.tw/user/authkey）

**MVP 後續工作**
1. `data-pipeline/scripts/fetch_earthquake.py` — 抓近 5 年顯著有感地震（M >= 4.0）
   - 輸出：`data/processed/earthquakes.json`（list of {date, lat, lng, magnitude, depth_km}）
2. `data-pipeline/scripts/fetch_active_faults.py` — 下載活動斷層 shapefile，轉 GeoJSON
   - 輸出：`data/processed/active_faults.geojson`
   - 資料量大時改用 PMTiles（規格 §6.3）
3. `worker/src/scorers/earthquake.ts`
   - 距最近第一類活動斷層距離（point-to-line）
   - 5km 內近 5 年 M>=5 地震次數
   - 評分：距斷層 <1km 嚴重扣分；近期高震度密集再扣分
4. 整合至 `RiskReport.dimensions.earthquake`，更新 `overall.ts` 平均

**已知阻礙**
- 活動斷層官方資料下載介面不穩定（規格書記載），可能需手動下載
- 點到斷層線（polyline）距離需要 `@turf/distance` 或自行實作（約 30 行）

**估時**：8h（資料下載 + scorer + 測試）

---

### 2. 淹水風險 (MEDIUM PRIORITY)

**資料源**
- 水利署 24 小時累積雨量淹水潛勢圖：https://fhy.wra.gov.tw/fhy/
- 格式：WMS / WMTS 圖磚（無直接座標查 API）
- 替代：政府開放資料平台 https://data.gov.tw/dataset/25766 淹水潛勢資料（shapefile）

**MVP 後續工作**
1. 下載淹水潛勢 shapefile（650mm/24hr 情境）
2. `data-pipeline/scripts/build_flood_pmtiles.py`
   - shapefile -> GeoJSON -> PMTiles（用 `tippecanoe` CLI）
   - 上傳 R2，前端 MapLibre 直接讀
3. Worker 端：以查詢座標讀取對應 tile 像素 -> 解析淹水深度
   - 簡化版（無 PMTiles）：將潛勢層柵格化為 500m grid，存 KV
4. `worker/src/scorers/flood.ts`，分級：safe (<10cm) / shallow (10-50cm) / deep (>50cm)

**已知阻礙**
- PMTiles 在 Workers 內讀取需要 Range request；需要一次完整 spike
- shapefile 大（>100MB）；需先簡化幾何

**估時**：12h（含 PMTiles spike）

---

### 3. 土壤液化潛勢 (MEDIUM PRIORITY，可與淹水同步做)

**資料源**
- 經濟部地調所 土壤液化潛勢查詢系統：https://www.liquid.net.tw/CGS/Web/Map.aspx
- 格式：WMS（高/中/低三級）
- 開放區域：六都 + 部分縣市（非全台覆蓋）

**MVP 後續工作**
1. 同淹水流程：WMS 圖層轉 GeoJSON / PMTiles
2. `worker/src/scorers/liquefaction.ts`，依潛勢級數扣分
3. 與地震分數合併進 `dimensions.earthquake`（規格 §4.1）

**已知阻礙**
- 部分區域無資料（需明確標示「該區未調查」而非低風險）

**估時**：6h（流程與淹水重用）

---

## 跨維度工作

### Worker
- [ ] 加 KV 快取 `REPORT_CACHE`（地址 -> 報告，TTL 30 天）— wrangler.toml 已留註解區
- [ ] Rate limiting（同 IP 每分鐘 30 次）
- [ ] OG image 動態生成（`@vercel/og` 或 `satori-cf`）

### Web
- [ ] 將 `web/public/demo.html` 內容遷移到 `web/src/app/page.tsx` Next.js 版本
  - 目前 Next.js 版只有醫療 + 生活機能 UI；新加入的空品維度尚未顯示
  - 可選：直接以 demo.html 為主，Next.js 留作 SEO 區域頁
- [ ] 區域頁 `/area/[county]/[district]`（規格 §7.1）
- [ ] 報告分享頁 `/report/[slug]` + OG image
- [ ] 雷達圖（Recharts）

### 資料更新自動化
- [ ] AQI fetch 排程：Cloud Run Jobs / GitHub Actions（每小時）
- [ ] 醫院清冊：每月 1 次
- [ ] 地震：每日 1 次

### 部署（依規格 §10 M4）
- [ ] Worker 上 Cloudflare Workers（`api.livesafe.oharalab.com`）
- [ ] Web 上 Cloudflare Pages（`livesafe.oharalab.com`）
- [ ] R2 bucket（PMTiles 用）
- [ ] WAF + Rate Limiting + Bot Fight Mode

---

## 已知限制與決策

1. **Geocoding 使用 OSM Nominatim**
   - 免費但 rate limit 每秒 1 次；台灣門牌覆蓋差，限「縣市+區+路名」
   - User-Agent 必須含聯絡 email（OSM ToS 要求，目前用 placeholder，正式上線前改）
   - 規模化時改 Google Maps Geocoding API（規格 §3.2）

2. **MOENV API key 為公開金鑰**
   - 來自 data.gov.tw dataset 40448 metadata，5,000 calls/day 限制
   - 高流量場景需改用 wrangler secret + 申請專屬 key

3. **空品評分目前只用即時 AQI**
   - 規格 §4.1 要求近 12 個月 PM2.5 年均 + 紫爆天數
   - 須累積歷史資料（每小時 fetch 累積 365 天才有意義）
   - 正式版前以政府年報補足

4. **無 KV 快取**
   - 每次 `/api/report` 都打 Nominatim + Overpass，慢且不友善
   - 上線前必加 KV，以地址 hash 為 key

5. **TLS 證書問題**
   - `data.moenv.gov.tw` 證書缺 Subject Key Identifier
   - Python 3.13 預設 strict 驗證會失敗，已比照 `fetch_hospitals.py` 用 `verify=False`
   - 限政府 opendata 使用，不影響資料正確性

6. **demo.html 依賴 worker 在 127.0.0.1:8787**
   - 部署時透過 query string 切換：`?api=https://api.livesafe.oharalab.com`
