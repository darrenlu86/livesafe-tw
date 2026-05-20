"""
fetch_aqi_annual.py — 抓環境部各監測站「逐日 AQI」，計算每站近 365 天統計。

資料源：data.moenv.gov.tw aqx_p_434（測站逐日 AQI）

per-station 統計：
  - avg_aqi:        年均 AQI
  - days_total:     有效天數
  - purple_days:    AQI > 200 天數（紫爆）
  - red_days:       AQI > 150 天數（紅色，不健康）
  - good_days:      AQI ≤ 50 天數（良好）
  - good_rate:      good_days / days_total

加上 PM2.5 年均（fetch_pm25_annual 整合到此）— aqx_p_322 itemengname=PM2.5
"""
from __future__ import annotations

import json
import sys
import time
from collections import defaultdict
from datetime import datetime, timedelta, timezone
from pathlib import Path

import requests
import urllib3
from tenacity import retry, stop_after_attempt, wait_exponential

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

API_KEY = "4c89a32a-a214-461b-bf29-30ff32a61a8a"
DAILY_AQI_DS = "aqx_p_434"
PM25_DS = "aqx_p_322"
PAGE_SIZE = 1000
WINDOW_DAYS = 365

OUTPUT_PATH = (
    Path(__file__).resolve().parents[1] / "data" / "processed" / "aqi_annual.json"
)
LIVE_AQI_PATH = (
    Path(__file__).resolve().parents[1] / "data" / "processed" / "aqi.json"
)


def load_station_coords() -> dict[str, tuple[float, float, str]]:
    """從 live aqi.json 取 siteid → (lat, lng, county) 對照表"""
    if not LIVE_AQI_PATH.exists():
        print(
            f"  WARN: {LIVE_AQI_PATH} 不存在，輸出將無 lat/lng（請先跑 fetch_aqi.py）",
            file=sys.stderr,
        )
        return {}
    d = json.loads(LIVE_AQI_PATH.read_text(encoding="utf-8"))
    return {
        s["siteid"]: (s["lat"], s["lng"], s.get("county", ""))
        for s in d.get("stations", [])
        if s.get("lat") is not None and s.get("lng") is not None
    }


@retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=10))
def fetch_page(dataset: str, offset: int) -> list[dict]:
    url = (
        f"https://data.moenv.gov.tw/api/v2/{dataset}"
        f"?api_key={API_KEY}&limit={PAGE_SIZE}&offset={offset}&format=JSON"
    )
    resp = requests.get(url, timeout=30, verify=False)
    resp.raise_for_status()
    data = resp.json()
    if isinstance(data, list):
        return data
    return data.get("records") or []


def fetch_until(dataset: str, cutoff_date: str) -> list[dict]:
    """抓到 monitordate 低於 cutoff_date 為止"""
    all_rows: list[dict] = []
    offset = 0
    while True:
        rows = fetch_page(dataset, offset)
        if not rows:
            break
        all_rows.extend(rows)
        oldest = min(r["monitordate"] for r in rows)
        print(
            f"  [{dataset}] offset={offset} got={len(rows)} total={len(all_rows)} oldest={oldest}"
        )
        if oldest < cutoff_date:
            break
        if len(rows) < PAGE_SIZE:
            break
        offset += PAGE_SIZE
        time.sleep(0.4)
    # 過濾掉 cutoff 之前的
    return [r for r in all_rows if r["monitordate"] >= cutoff_date]


def to_int(s) -> int | None:
    try:
        if s in (None, "", "-"):
            return None
        return int(float(s))
    except (ValueError, TypeError):
        return None


def to_float(s) -> float | None:
    try:
        if s in (None, "", "-"):
            return None
        return float(s)
    except (ValueError, TypeError):
        return None


def aggregate_daily_aqi(rows: list[dict]) -> dict[str, dict]:
    by_site: dict[str, dict] = defaultdict(
        lambda: {
            "name": "",
            "aqi_values": [],
            "purple": 0,
            "red": 0,
            "orange": 0,
            "yellow": 0,
            "good": 0,
        }
    )
    for r in rows:
        sid = r.get("siteid", "")
        if not sid:
            continue
        aqi = to_int(r.get("aqi"))
        if aqi is None:
            continue
        s = by_site[sid]
        s["name"] = r.get("sitename", s["name"])
        s["aqi_values"].append(aqi)
        # 級距由小到大計次（互斥）
        if aqi > 200:
            s["purple"] += 1
        elif aqi > 150:
            s["red"] += 1
        elif aqi > 100:
            s["orange"] += 1
        elif aqi > 50:
            s["yellow"] += 1
        else:
            s["good"] += 1
    return by_site


def aggregate_pm25(rows: list[dict]) -> dict[str, list[float]]:
    by_site: dict[str, list[float]] = defaultdict(list)
    for r in rows:
        if r.get("itemengname") != "PM2.5":
            continue
        sid = r.get("siteid", "")
        v = to_float(r.get("concentration"))
        if sid and v is not None and v >= 0:
            by_site[sid].append(v)
    return by_site


def main() -> int:
    now = datetime.now(timezone.utc)
    cutoff = (now - timedelta(days=WINDOW_DAYS)).strftime("%Y-%m-%d")
    print(f"[fetch_aqi_annual] window cutoff: {cutoff}")

    print(f"[fetch_aqi_annual] 抓 daily AQI ({DAILY_AQI_DS})…")
    daily_rows = fetch_until(DAILY_AQI_DS, cutoff)
    print(f"[fetch_aqi_annual] daily AQI rows: {len(daily_rows)}")

    print(f"[fetch_aqi_annual] 抓 PM2.5 ({PM25_DS})…")
    pm25_rows = fetch_until(PM25_DS, cutoff)
    print(f"[fetch_aqi_annual] PM2.5 rows: {len(pm25_rows)}")

    aqi_agg = aggregate_daily_aqi(daily_rows)
    pm25_agg = aggregate_pm25(pm25_rows)
    coords = load_station_coords()

    stations: list[dict] = []
    missing_coords: list[str] = []
    for sid, s in aqi_agg.items():
        vals = s["aqi_values"]
        if not vals:
            continue
        avg = sum(vals) / len(vals)
        pm25_vals = pm25_agg.get(sid) or []
        pm25_avg = sum(pm25_vals) / len(pm25_vals) if pm25_vals else None
        c = coords.get(sid)
        if not c:
            missing_coords.append(f"{sid}/{s['name']}")
            continue
        lat, lng, county = c
        stations.append(
            {
                "siteid": sid,
                "name": s["name"],
                "county": county,
                "lat": lat,
                "lng": lng,
                "days_total": len(vals),
                "avg_aqi": round(avg, 1),
                "purple_days": s["purple"],
                "red_days": s["red"],
                "orange_days": s["orange"],
                "yellow_days": s["yellow"],
                "good_days": s["good"],
                "good_rate": round(s["good"] / len(vals), 3),
                "unhealthy_for_sensitive_rate": round(
                    (s["orange"] + s["red"] + s["purple"]) / len(vals), 3
                ),
                "avg_pm25": round(pm25_avg, 1) if pm25_avg is not None else None,
                "pm25_days_total": len(pm25_vals),
            }
        )
    if missing_coords:
        print(f"  WARN: 找不到座標的測站（{len(missing_coords)}）：{missing_coords[:5]}…", file=sys.stderr)

    stations.sort(key=lambda x: x["avg_aqi"])

    out = {
        "metadata": {
            "source_dataset_daily_aqi": DAILY_AQI_DS,
            "source_dataset_pm25": PM25_DS,
            "source_human": "https://data.gov.tw/dataset/40448",
            "fetched_at": now.isoformat(),
            "window_days": WINDOW_DAYS,
            "cutoff_date": cutoff,
            "station_count": len(stations),
            "avg_aqi_min": min(s["avg_aqi"] for s in stations) if stations else None,
            "avg_aqi_max": max(s["avg_aqi"] for s in stations) if stations else None,
        },
        "stations": stations,
    }

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_PATH.write_text(
        json.dumps(out, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    print(f"[fetch_aqi_annual] 輸出：{OUTPUT_PATH}（{len(stations)} 站）")
    if stations:
        best = stations[0]
        worst = stations[-1]
        print(
            f"  最佳：{best['name']} avg AQI {best['avg_aqi']}（{best['days_total']} 天，紫爆 {best['purple_days']}）"
        )
        print(
            f"  最差：{worst['name']} avg AQI {worst['avg_aqi']}（{worst['days_total']} 天，紫爆 {worst['purple_days']}）"
        )
    return 0


if __name__ == "__main__":
    sys.exit(main())
