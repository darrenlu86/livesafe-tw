"""
fetch_osm_hospitals.py — 從 OSM 抓全台醫院（含本院級醫學中心）。

健保署 dataset 缺漏本院級醫學中心（成大、長庚、馬偕、奇美、慈濟等 26 家本院），
本 script 用 OSM `amenity=hospital` 補強。

輸出：data/processed/osm_hospitals.json
"""
from __future__ import annotations

import json
import sys
from datetime import datetime, timezone
from pathlib import Path

import requests
from tenacity import retry, stop_after_attempt, wait_exponential

OVERPASS_URL = "https://overpass-api.de/api/interpreter"
USER_AGENT = "LiveSafe.tw/0.1 (kevin868686@gmail.com)"

# 台灣方框（含外海）
BBOX = "21.5,119.5,25.5,122.5"

OUTPUT_PATH = (
    Path(__file__).resolve().parents[1] / "data" / "processed" / "osm_hospitals.json"
)

# 醫學中心級判定關鍵字（OSM 沒有分級標記，用名稱識別）
MEDICAL_CENTER_KEYWORDS = [
    "醫學院附設醫院",  # 臺大、成大、高醫、中山醫
    "醫學大學附設",
    "醫學中心",
    "長庚紀念醫院",  # 林口長庚、高雄長庚、嘉義長庚、基隆長庚
    "馬偕紀念醫院",
    "榮民總醫院",  # 臺北/臺中/高雄 榮總
    "三軍總醫院",
    "彰化基督教醫院",
    "彰基",
    "奇美醫院",
    "義大醫院",
    "亞東醫院",
    "中國醫藥大學",
    "慈濟醫院",
    "童綜合醫院",
    "雙和醫院",
    "萬芳醫院",
    "新光",
    "國泰",
]


def is_medical_center(tags: dict) -> bool:
    name = (tags.get("name") or "") + (tags.get("name:zh") or "")
    return any(kw in name for kw in MEDICAL_CENTER_KEYWORDS)


def has_emergency_tag(tags: dict) -> bool:
    # OSM emergency=yes 表示有急診
    return tags.get("emergency") == "yes" or tags.get("emergency:24h") == "yes"


@retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=10))
def fetch_overpass() -> dict:
    query = (
        f"[out:json][timeout:120];"
        f"("
        f'node["amenity"="hospital"]({BBOX});'
        f'way["amenity"="hospital"]({BBOX});'
        f");"
        f"out tags center;"
    )
    resp = requests.post(
        OVERPASS_URL,
        data={"data": query},
        headers={"User-Agent": USER_AGENT},
        timeout=180,
    )
    resp.raise_for_status()
    return resp.json()


def main() -> int:
    print("[fetch_osm_hospitals] 查 OSM Overpass...")
    data = fetch_overpass()
    elements = data.get("elements") or []
    print(f"[fetch_osm_hospitals] 原始 elements: {len(elements)}")

    hospitals: list[dict] = []
    seen_coords: set[tuple[float, float]] = set()

    for el in elements:
        tags = el.get("tags") or {}
        name = tags.get("name") or tags.get("name:zh")
        if not name:
            continue
        lat = el.get("lat") or (el.get("center") or {}).get("lat")
        lng = el.get("lon") or (el.get("center") or {}).get("lon")
        if lat is None or lng is None:
            continue
        # dedupe by approximate coords (~10m precision)
        key = (round(lat, 4), round(lng, 4))
        if key in seen_coords:
            continue
        seen_coords.add(key)
        hospitals.append(
            {
                "osm_id": f"{el.get('type')}/{el.get('id')}",
                "name": name,
                "lat": lat,
                "lng": lng,
                "is_medical_center": is_medical_center(tags),
                "has_emergency_tag": has_emergency_tag(tags),
                "operator": tags.get("operator"),
                "addr": tags.get("addr:full")
                or " ".join(
                    [
                        tags.get(f, "")
                        for f in ("addr:state", "addr:city", "addr:street", "addr:housenumber")
                        if tags.get(f)
                    ]
                )
                or None,
            }
        )

    medical_centers = [h for h in hospitals if h["is_medical_center"]]

    out = {
        "metadata": {
            "source": "OpenStreetMap Overpass API (amenity=hospital, 台灣方框)",
            "fetched_at": datetime.now(timezone.utc).isoformat(),
            "total": len(hospitals),
            "medical_center_count": len(medical_centers),
            "with_emergency_tag": sum(1 for h in hospitals if h["has_emergency_tag"]),
        },
        "hospitals": hospitals,
    }

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_PATH.write_text(json.dumps(out, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"[fetch_osm_hospitals] 輸出：{OUTPUT_PATH}")
    print(f"  總醫院：{len(hospitals)}")
    print(f"  醫學中心級識別：{len(medical_centers)}")
    print(f"  含 emergency tag：{out['metadata']['with_emergency_tag']}")
    if medical_centers:
        print("  醫學中心樣本：")
        for h in medical_centers[:8]:
            print(f"    {h['name']}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
