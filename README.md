# 居住安全透視鏡 (LiveSafe.tw)

> 買房前的一站式查核報告。輸入地址，30 秒拿到 9 維度居住安全評分。
>
> Live: **https://livesafe.oharalab.com**
>
> 整合政府公開資料，不賣房、不估價、不抽佣。

## 9 維度評分系統

雙層加權：**安全層 60% + 便利層 40%**。總分映射為 A/B/C/D（A ≥ 85、B 65-84、C 45-64、D < 45）。

### 安全層（60%，等權平均）

| 維度 | 資料來源 |
|------|------|
| 地震斷層 | USGS Earthquake Catalog（M≥4 近 5 年）+ GEM Global Active Faults（台灣 42 條） |
| 淹水潛勢 | 水利署 25766 dataset（22 縣市）+ data.taipei 130mm/h KML（北市） |
| 坊地災害 | 農業部水土保持署 147916（1729 條土石流潛勢溪流） |
| 空氣品質 | 環境部 aqx_p_488（測站歷史日資料，近 1 年年均） |

### 便利層（40%，加權平均）

| 維度 | 權重 | 資料來源 |
|------|------|------|
| 醫療可近性 | 0.35 | 健保署急救責任醫院 + OpenStreetMap |
| 交通便利 | 0.25 | OpenStreetMap（嚴格 OSM tag 過濾） |
| 生活機能 | 0.20 | OpenStreetMap |
| 學校密度 | 0.10 | OpenStreetMap |
| 嫌惡設施 | 0.10 | OpenStreetMap（7 類） |

> 加權平均而非等權，是為了避免 healthcare/transit/amenities 三個高度共線的「都市化指標」被疊加計分。

## Monorepo 結構

```
livesafe-tw/
├── data-pipeline/      # Python ETL（下載政府開放資料 → 預處理 → bundled JSON）
│   ├── scripts/        # 各資料源抓取與清洗腳本
│   ├── data/raw/       # 原始下載（gitignore）
│   └── run_pipeline.sh # 一鍵跑全部 stages
├── worker/             # Cloudflare Worker（Hono + TypeScript）
│   ├── src/data/       # bundled 資料集（地震、斷層、淹水、土石流、嫌惡設施、醫院、AQI、OSM POI）
│   └── src/scorers/    # 各維度計分邏輯
└── web/                # Next.js 16 + OpenNext（Cloudflare Workers 部署）
    └── src/app/
        ├── page.tsx           # 首頁
        ├── report/            # 地址報告（progressive loading）
        ├── compare/           # 多址並排比較
        ├── about/             # 評分標準與資料來源
        └── guides/            # 7 篇 SEO/AEO landing pages
```

## 評分演算法 v2 (2026-05-20)

獨立稽核後修正天花板效應、共線性、A 級過度集中問題：

- amenities/transit：每家權重 ×10 → ×5（避免都會普遍頂滿）
- healthcare：線性 `min(70, n × 12)` → 對數飽和 `min(60, 10 × ln(1+n))`
- transit rail：500m 內 ×60 → ×30（階梯化，單站不滿分）
- earthquake：fault >5km 從 95 → 85（保留台灣島基準震災風險）
- earthquake 權重：fault 70% + quake 30%（斷層為潛在風險即使無震）
- A 級門檻：80 → 85（避免分布過度集中）
- 便利層：等權 → 加權（醫療 0.35 / 交通 0.25 / 機能 0.20 / 學校 0.10 / 嫌惡 0.10）

詳細公式說明見 [`web/src/app/about/page.tsx`](web/src/app/about/page.tsx)。

## 快速開始

```bash
# 1. Data pipeline
cd data-pipeline
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env  # 填入 MOENV_API_KEY 等
./run_pipeline.sh     # 或單獨跑各 stage

# 2. Worker（本地測試）
cd ../worker
npm install
npm run dev

# 3. Web
cd ../web
npm install
npm run dev
```

## 部署

| 元件 | 平台 |
|------|------|
| Web (Next.js 16) | Cloudflare Workers（@opennextjs/cloudflare）— `livesafe.oharalab.com` |
| Worker（風險計算 API） | Cloudflare Workers — `livesafe-worker.kevin868686.workers.dev` |
| Static data | 全部 bundle 進 Worker（總 ~10 MB raw / ~2 MB gzip） |

## 內容指南（7 篇 SEO/AEO landing pages）

| URL | 主題 |
|------|------|
| `/guides` | 指南索引 |
| `/guides/home-safety-checklist` | **Pillar** — 買房前必查的 9 個居住風險 |
| `/guides/earthquake-fault-check` | 斷層查詢：我家在斷層帶上嗎？ |
| `/guides/flood-risk-check` | 我家會淹水嗎？水利署淹水潛勢一鍵查 |
| `/guides/nuisance-facility-check` | 嫌惡設施查詢：附近有殯儀館、變電所、垃圾場嗎？ |
| `/guides/air-quality-check` | 買房前查空氣品質：PM2.5 長期評分 |
| `/guides/hualien-earthquake-safety` | 花蓮買房的地震風險：哪些區域相對安全？ |
| `/guides/taichung-flood-risk` | 台中淹水危險地區分析 |

每篇含 Article + FAQPage JSON-LD 結構化資料、嵌入式查詢工具、相關連結。

## SEO / AEO 基礎建設

- `/sitemap.xml` — 所有頁面 + 7 篇 guide
- `/robots.txt` — 全站允許爬取
- `/llms.txt` — AI 抓取用站點摘要（含所有 guide URL）
- WebApplication JSON-LD（layout）
- FAQPage JSON-LD（首頁 + about + 各 guide）
- Article JSON-LD（各 guide）
- OpenGraph + Twitter Card metadata
- 完整 canonical URLs

## 已知限制

- **地理編碼精度**：使用 Nominatim，僅支援街道級（縣市 + 行政區 + 路名），不處理門牌號
- **臺北市淹水情境差異**：使用 data.taipei 130mm/h 短延時情境（其他縣市為水利署 24h 650mm），兩者皆為各自最壞情境
- **OSM 標記覆蓋差異**：偏鄉地區的超商、藥局、公園、嫌惡設施標記可能不完整
- **未納入維度**：土壤液化（公開資料無法跨縣市齊備下載）、治安犯罪率（警政署無 per-district open API）、噪音

## 授權與免責

- 程式碼採 MIT License
- 所有資料來自政府公開資料、USGS、GEM、OpenStreetMap，依各自授權
- 分數**僅供參考，不構成任何購屋、租屋、投資建議**
- 發現資料錯誤請開 [GitHub issue](https://github.com/darrenlu86/livesafe-tw/issues)
