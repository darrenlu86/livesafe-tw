# LiveSafe.tw

> 臺灣居住風險分析 — 輸入地址，30 秒看懂地震、空氣、醫療、淹水風險
> 規格文件：[../open-data-projects/livesafe-spec.md](../open-data-projects/livesafe-spec.md)

## Monorepo 結構

```
livesafe-tw/
├── data-pipeline/      # Python ETL（下載政府開放資料 → 預處理 → PMTiles / JSON）
│   ├── scripts/        # 各資料源抓取腳本
│   ├── data/raw/       # 原始下載（gitignore）
│   └── data/processed/ # 已處理資料（gitignore，但記錄 schema）
├── worker/             # Cloudflare Worker：座標 → RiskReport API
└── web/                # Next.js 16 + MapLibre GL
```

## 資料源（全部真實政府公開資料，無捏造）

| 維度 | 來源 | 授權 |
|------|------|------|
| 地震 | 中央氣象署 opendata.cwa.gov.tw | CC BY 4.0 (需申請 Authorization) |
| 液化 | 經濟部地質調查所 liquid.net.tw | 公開地圖 (WMS) |
| 淹水 | 水利署 fhy.wra.gov.tw | 公開資料 |
| 斷層 | 地質調查及礦業管理中心 gsmma.gov.tw | 公開 shapefile |
| 空氣 | 環境部 data.moenv.gov.tw | 政府資料開放授權 (需 api_key) |
| 醫療 | data.gov.tw/dataset/136851 | 政府資料開放授權 |
| 生活機能 | OpenStreetMap Overpass API | ODbL |

## 快速開始

```bash
# 1. Data pipeline (Python)
cd data-pipeline
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env  # 填入 CWA_API_KEY, MOENV_API_KEY, GOOGLE_MAPS_KEY
python scripts/fetch_air_quality.py
python scripts/fetch_earthquake.py

# 2. Worker (本地測試)
cd ../worker
npm install
npm run dev

# 3. Web (Next.js)
cd ../web
npm install
npm run dev
```

## 里程碑

- [ ] M1 — 資料預處理（PMTiles + 空品統計 + 醫院清冊）
- [ ] M2 — Worker 風險計算 API
- [ ] M3 — Next.js 前端
- [ ] M4 — 上線

## 部署

- Web：Cloudflare Pages（SSG + Functions）
- Worker：Cloudflare Workers
- PMTiles：Cloudflare R2
- ETL：Google Cloud Run Jobs（排程）

## 授權與免責

本站資料來自政府公開資料，**僅供參考，不構成購屋建議**。所有分數以資料來源為準，歡迎回報錯誤。
