"""
fetch_aqi.py — 下載環境部空氣品質指標（AQI）即時資料，輸出結構化 JSON。

資料源：環境部空氣品質監測網
  - 平台：data.moenv.gov.tw
  - 資料集：aqx_p_432「空氣品質指標(AQI)」
  - 授權：政府資料開放授權條款-第 1 版
  - 更新頻率：每小時
  - api_key 來源：data.gov.tw 官方 metadata（公開金鑰，免申請）
    https://data.gov.tw/api/v2/rest/dataset/40448

CSV 欄位（依 dataset metadata，2026-05 驗證）：
  sitename, county, aqi, pollutant, status, so2, co, o3, o3_8hr,
  pm10, pm2.5, no2, nox, no, wind_speed, wind_direc, publishtime,
  co_8hr, pm2.5_avg, pm10_avg, so2_avg, longitude, latitude, siteid

輸出：data/processed/aqi.json
"""
from __future__ import annotations

import csv
import io
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

import requests
import urllib3
from tenacity import retry, stop_after_attempt, wait_exponential

# data.moenv.gov.tw 證書缺 Subject Key Identifier，Python 3.13 ssl 模組會驗證失敗（curl 不會）。
# 此為政府 opendata 公開資料，不含敏感性，比照 fetch_hospitals.py 停用驗證。
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

# 環境部 data.moenv.gov.tw 官方公開 api_key（CSV 用），來自 data.gov.tw dataset 40448
API_KEY = "4c89a32a-a214-461b-bf29-30ff32a61a8a"
SOURCE_URL = (
    "https://data.moenv.gov.tw/api/v2/aqx_p_432"
    f"?api_key={API_KEY}&limit=1000&format=CSV"
)
HUMAN_URL = "https://data.gov.tw/dataset/40448"
LICENSE = "政府資料開放授權條款-第 1 版"

OUTPUT_PATH = (
    Path(__file__).resolve().parents[1] / "data" / "processed" / "aqi.json"
)
RAW_PATH = (
    Path(__file__).resolve().parents[1] / "data" / "raw" / "aqi.csv"
)


@retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=10))
def download_csv(url: str) -> str:
    resp = requests.get(url, timeout=30, verify=False)
    resp.raise_for_status()
    text = resp.text
    # MOENV 限流／驗證錯誤會以 200 + 純文字回傳，必須偵測
    if "因受限於資源分配" in text:
        raise RuntimeError(f"MOENV API 限流：{text.strip()[:120]}")
    if "api_key" in text and "不存在" in text:
        raise RuntimeError(f"MOENV api_key 失效：{text.strip()[:120]}")
    return text


def to_float(s: str) -> float | None:
    s = (s or "").strip()
    if not s or s in {"-", "ND", "*"}:
        return None
    try:
        return float(s)
    except ValueError:
        return None


def to_int(s: str) -> int | None:
    s = (s or "").strip()
    if not s:
        return None
    try:
        return int(float(s))
    except ValueError:
        return None


def parse_row(row: dict[str, str]) -> dict | None:
    lat = to_float(row.get("latitude", ""))
    lng = to_float(row.get("longitude", ""))
    if lat is None or lng is None:
        return None
    siteid = (row.get("siteid", "") or "").strip()
    if not siteid:
        return None
    return {
        "siteid": siteid,
        "name": (row.get("sitename") or "").strip(),
        "county": (row.get("county") or "").strip(),
        "lat": lat,
        "lng": lng,
        "aqi": to_int(row.get("aqi", "")),
        "status": (row.get("status") or "").strip(),
        "pollutant": (row.get("pollutant") or "").strip(),
        "pm25": to_float(row.get("pm2.5", "")),
        "pm25_avg": to_float(row.get("pm2.5_avg", "")),
        "pm10": to_float(row.get("pm10", "")),
        "o3_8hr": to_float(row.get("o3_8hr", "")),
        "publishtime": (row.get("publishtime") or "").strip(),
    }


def main() -> int:
    print(f"[fetch_aqi] 下載中：{SOURCE_URL[:90]}…")
    csv_text = download_csv(SOURCE_URL)

    RAW_PATH.parent.mkdir(parents=True, exist_ok=True)
    RAW_PATH.write_text(csv_text, encoding="utf-8")
    print(f"[fetch_aqi] 原始 CSV 已存：{RAW_PATH} ({len(csv_text):,} bytes)")

    reader = csv.DictReader(io.StringIO(csv_text))
    parsed = [parse_row(row) for row in reader]
    stations = [s for s in parsed if s is not None]

    if not stations:
        print(
            "[fetch_aqi] ERROR: 解析後 0 筆資料，疑似 CSV 欄位異動或 API 回應有誤",
            file=sys.stderr,
        )
        return 1

    aqi_values = [s["aqi"] for s in stations if s["aqi"] is not None]
    publish_times = sorted({s["publishtime"] for s in stations if s["publishtime"]})

    output = {
        "metadata": {
            "source": SOURCE_URL,
            "source_human": HUMAN_URL,
            "fetched_at": datetime.now(timezone.utc).isoformat(),
            "license": LICENSE,
            "station_count": len(stations),
            "station_with_aqi": len(aqi_values),
            "aqi_min": min(aqi_values) if aqi_values else None,
            "aqi_max": max(aqi_values) if aqi_values else None,
            "publish_times": publish_times,
        },
        "stations": stations,
    }

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_PATH.write_text(
        json.dumps(output, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    meta = output["metadata"]
    print(f"[fetch_aqi] 輸出：{OUTPUT_PATH}")
    print(
        f"  測站數：{meta['station_count']}，有 AQI：{meta['station_with_aqi']}，"
        f"AQI 範圍：{meta['aqi_min']}–{meta['aqi_max']}"
    )
    print(f"  發布時間：{', '.join(publish_times) or 'n/a'}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
