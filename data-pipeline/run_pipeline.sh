#!/usr/bin/env bash
# run_pipeline.sh — 跑完整資料清洗 pipeline
#
# 用法：
#   ./run_pipeline.sh                  # 跑全部
#   ./run_pipeline.sh hospitals        # 只跑 hospitals 階段
#   ./run_pipeline.sh aqi              # 只跑空品
#   ./run_pipeline.sh earthquakes      # 只跑地震
#   ./run_pipeline.sh osm              # 只跑 OSM POI
#   ./run_pipeline.sh flood            # 只跑水利署淹水潛勢
#
# 每月排程：GitHub Action `.github/workflows/refresh-data.yml`
#
# 輸出 data/processed/ 內所有 cleaned JSON，worker 端只讀 bundled JSON、不再 live Overpass。

set -euo pipefail
cd "$(dirname "$0")"

if [ ! -d .venv ]; then
  echo "[pipeline] 建立 venv..."
  python3 -m venv .venv
  source .venv/bin/activate
  pip install -q -r requirements.txt
else
  source .venv/bin/activate
fi

STAGE="${1:-all}"

run_hospitals() {
  echo "================================================================"
  echo "[pipeline] HOSPITALS：抓 NHI 急救責任 → geocode → 抓 OSM → 合併"
  echo "================================================================"
  python scripts/fetch_hospitals.py
  python scripts/geocode_hospitals.py
  python scripts/fetch_osm_hospitals.py
  python scripts/merge_hospitals.py
}

run_aqi() {
  echo "================================================================"
  echo "[pipeline] AQI：抓即時測站清單 → 抓 365 天逐日 AQI/PM2.5 → 年度統計"
  echo "================================================================"
  python scripts/fetch_aqi.py
  python scripts/fetch_aqi_annual.py
}

run_earthquakes() {
  echo "================================================================"
  echo "[pipeline] EARTHQUAKES：USGS 5 年地震 + GEM 活動斷層"
  echo "================================================================"
  python scripts/fetch_earthquake.py
  if [ -f "data/raw/gem_faults_global.geojson" ]; then
    python scripts/build_active_faults.py
  else
    echo "  WARN: data/raw/gem_faults_global.geojson 不存在，請手動下載 GEM faults"
  fi
}

run_osm() {
  echo "================================================================"
  echo "[pipeline] OSM POI：amenities + transit + schools (tag 清洗 + 分級)"
  echo "================================================================"
  python scripts/fetch_osm_pois.py all
}

run_flood() {
  echo "================================================================"
  echo "[pipeline] FLOOD：水利署 24h 650mm 淹水潛勢圖（22 縣市）"
  echo "================================================================"
  python scripts/fetch_flood_potential.py
}

case "$STAGE" in
  hospitals)    run_hospitals ;;
  aqi)          run_aqi ;;
  earthquakes)  run_earthquakes ;;
  osm)          run_osm ;;
  flood)        run_flood ;;
  all)
    run_hospitals
    run_aqi
    run_earthquakes
    run_osm
    run_flood
    ;;
  *)
    echo "Unknown stage: $STAGE"
    echo "Usage: $0 [all|hospitals|aqi|earthquakes|osm|flood]"
    exit 1
    ;;
esac

echo ""
echo "================================================================"
echo "[pipeline] 完成。下一步："
echo "  1. cp data/processed/*.json ../worker/src/data/"
echo "  2. cd ../worker && npx wrangler deploy"
echo "================================================================"
