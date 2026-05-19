"""
fetch_earthquake.py — 下載台灣近 5 年顯著地震（M >= 4.0），輸出結構化 JSON。

資料源：USGS Earthquake Hazards Program / FDSN Event Web Service
  - Endpoint: https://earthquake.usgs.gov/fdsnws/event/1/query
  - 授權: USGS public domain（U.S. federal government work）
  - 免 api key
  - 涵蓋: 全球地震，包含 CWA 觀測的台灣地震

選用 USGS 而非 CWA 的理由：
  CWA opendata E-A0015-001 僅保留近期顯著有感地震（實測約 6 週、16 筆），
  無公開歷史 API。USGS FDSN 提供完整歷史，schema 穩定，台灣方框查詢一次完成。

台灣方框（含外海）：
  lat 21.5 ~ 25.5, lng 119.5 ~ 122.5

輸出：data/processed/earthquakes.json
"""
from __future__ import annotations

import json
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

import requests
from tenacity import retry, stop_after_attempt, wait_exponential

USGS_ENDPOINT = "https://earthquake.usgs.gov/fdsnws/event/1/query"
HUMAN_URL = "https://earthquake.usgs.gov/earthquakes/search/"
LICENSE = "USGS public domain (U.S. federal government work)"

TAIWAN_BBOX = {
    "minlatitude": 21.5,
    "maxlatitude": 25.5,
    "minlongitude": 119.5,
    "maxlongitude": 122.5,
}
MIN_MAGNITUDE = 4.0
YEARS_BACK = 5

OUTPUT_PATH = (
    Path(__file__).resolve().parents[1] / "data" / "processed" / "earthquakes.json"
)
RAW_PATH = (
    Path(__file__).resolve().parents[1] / "data" / "raw" / "earthquakes_usgs.geojson"
)


@retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=10))
def download_geojson(params: dict) -> dict:
    resp = requests.get(USGS_ENDPOINT, params=params, timeout=60)
    resp.raise_for_status()
    return resp.json()


def parse_feature(feat: dict) -> dict | None:
    props = feat.get("properties") or {}
    geom = feat.get("geometry") or {}
    coords = geom.get("coordinates") or []
    mag = props.get("mag")
    time_ms = props.get("time")
    if mag is None or time_ms is None or len(coords) < 3:
        return None
    lng, lat, depth = coords[0], coords[1], coords[2]
    return {
        "id": feat.get("id"),
        "date": datetime.fromtimestamp(time_ms / 1000, tz=timezone.utc).isoformat(),
        "lat": lat,
        "lng": lng,
        "magnitude": float(mag),
        "depth_km": float(depth) if depth is not None else None,
        "place": (props.get("place") or "").strip(),
    }


def main() -> int:
    now = datetime.now(timezone.utc)
    start = now - timedelta(days=YEARS_BACK * 365 + 1)
    params = {
        "format": "geojson",
        "starttime": start.strftime("%Y-%m-%d"),
        "endtime": now.strftime("%Y-%m-%d"),
        "minmagnitude": MIN_MAGNITUDE,
        **TAIWAN_BBOX,
    }
    print(
        f"[fetch_earthquake] 查詢 USGS：{params['starttime']} ~ {params['endtime']}，"
        f"M>={MIN_MAGNITUDE}"
    )

    data = download_geojson(params)

    RAW_PATH.parent.mkdir(parents=True, exist_ok=True)
    RAW_PATH.write_text(json.dumps(data, ensure_ascii=False), encoding="utf-8")
    print(f"[fetch_earthquake] 原始 GeoJSON 已存：{RAW_PATH}")

    feats = data.get("features") or []
    parsed = [parse_feature(f) for f in feats]
    quakes = [q for q in parsed if q is not None]

    if not quakes:
        print(
            "[fetch_earthquake] ERROR: 解析後 0 筆地震，疑似 schema 異動或查詢條件錯誤",
            file=sys.stderr,
        )
        return 1

    quakes.sort(key=lambda q: q["date"], reverse=True)

    mags = [q["magnitude"] for q in quakes]
    dates = [q["date"] for q in quakes]
    output = {
        "metadata": {
            "source": "USGS FDSN Event Web Service",
            "source_human": HUMAN_URL,
            "endpoint": USGS_ENDPOINT,
            "query": params,
            "fetched_at": now.isoformat(),
            "license": LICENSE,
            "count": len(quakes),
            "magnitude_min": min(mags),
            "magnitude_max": max(mags),
            "date_earliest": min(dates),
            "date_latest": max(dates),
            "taiwan_bbox": TAIWAN_BBOX,
        },
        "earthquakes": quakes,
    }

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_PATH.write_text(
        json.dumps(output, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    meta = output["metadata"]
    print(f"[fetch_earthquake] 輸出：{OUTPUT_PATH}")
    print(
        f"  地震數：{meta['count']}，規模範圍：{meta['magnitude_min']}–{meta['magnitude_max']}"
    )
    print(f"  時間範圍：{meta['date_earliest']} ~ {meta['date_latest']}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
