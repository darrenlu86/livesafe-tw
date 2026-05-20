"""
fetch_osm_nuisance.py — 抓全台 OSM 嫌惡設施 POI。

涵蓋：
  - 變電所 (power=substation)
  - 殯儀館 (amenity=funeral_hall)
  - 火葬場 (amenity=crematorium)
  - 墓地 (landuse=cemetery)
  - 垃圾掩埋場 (landuse=landfill)
  - 焚化廠 (man_made=incinerator)
  - 監獄 (amenity=prison)

加油站 (amenity=fuel) 跳過 — 便利性大於嫌惡。

輸出：data/processed/osm_nuisance.json
"""
from __future__ import annotations

import json
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

import requests
from tenacity import retry, stop_after_attempt, wait_exponential

OVERPASS_URL = "https://overpass-api.de/api/interpreter"
USER_AGENT = "LiveSafe.tw/0.1 (kevin868686@gmail.com)"
TW_BBOX = "21.5,119.5,25.5,122.5"

OUTPUT_PATH = (
    Path(__file__).resolve().parents[1] / "data" / "processed" / "osm_nuisance.json"
)


@retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=2, min=5, max=30))
def overpass(query: str) -> dict:
    resp = requests.post(
        OVERPASS_URL,
        data={"data": query},
        headers={"User-Agent": USER_AGENT, "Accept": "application/json"},
        timeout=300,
    )
    resp.raise_for_status()
    return resp.json()


def coord(el: dict) -> tuple[float, float] | None:
    lat = el.get("lat") or (el.get("center") or {}).get("lat")
    lng = el.get("lon") or (el.get("center") or {}).get("lon")
    if lat is None or lng is None:
        return None
    return float(lat), float(lng)


# (category, tag selector, label)
CATEGORIES: list[tuple[str, str, str]] = [
    ("substation", '["power"="substation"]', "變電所"),
    ("funeral_hall", '["amenity"="funeral_hall"]', "殯儀館"),
    ("crematorium", '["amenity"="crematorium"]', "火葬場"),
    ("cemetery", '["landuse"="cemetery"]', "墓地"),
    ("landfill", '["landuse"="landfill"]', "垃圾掩埋場"),
    ("incinerator", '["man_made"="incinerator"]', "焚化廠"),
    ("prison", '["amenity"="prison"]', "監獄"),
]


def fetch_category(selector: str) -> list[dict]:
    q = (
        f"[out:json][timeout:120];"
        f"(node{selector}({TW_BBOX});way{selector}({TW_BBOX}););"
        f"out tags center;"
    )
    data = overpass(q)
    out: list[dict] = []
    seen: set[str] = set()
    for el in data.get("elements") or []:
        c = coord(el)
        if not c:
            continue
        lat, lng = c
        tags = el.get("tags") or {}
        # 過濾 disused
        if tags.get("disused") == "yes" or tags.get("abandoned") == "yes":
            continue
        key = f"{round(lat, 4)},{round(lng, 4)}"
        if key in seen:
            continue
        seen.add(key)
        out.append({
            "name": tags.get("name") or tags.get("name:zh"),
            "lat": lat,
            "lng": lng,
        })
    return out


def main() -> int:
    result: dict[str, list[dict]] = {}
    counts: dict[str, int] = {}
    for cat, selector, label in CATEGORIES:
        print(f"[{label}] querying...", flush=True)
        try:
            items = fetch_category(selector)
            result[cat] = items
            counts[cat] = len(items)
            print(f"  ✓ {len(items)} 筆")
        except Exception as e:
            print(f"  ✗ {label}: {e}", file=sys.stderr)
            result[cat] = []
            counts[cat] = 0
        time.sleep(3)  # 避免 Overpass rate limit

    out = {
        "metadata": {
            "source": "OSM Overpass (Taiwan bbox)",
            "fetched_at": datetime.now(timezone.utc).isoformat(),
            "category_counts": counts,
        },
        **result,
    }
    OUTPUT_PATH.write_text(json.dumps(out, ensure_ascii=False), encoding="utf-8")
    kb = OUTPUT_PATH.stat().st_size // 1024
    print(f"\n[fetch_osm_nuisance] 輸出：{OUTPUT_PATH} ({kb} KB)")
    print(f"  分布: {counts}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
