"""
fetch_osm_pois.py — 一次抓全台所有 OSM 靜態 POI，按類別清洗 + 分級 + bundle。

目的：把所有「資料源頭的意義」清理放在 pre-process 階段，worker 端只做空間查詢。

輸出（data/processed/）：
  - osm_amenities.json   (超商 / 藥局 / 公園)
  - osm_transit.json     (軌道車站 + 公車站)
  - osm_schools.json     (大學/高中/國中/國小/幼兒園 已分級)
  - osm_water.json       (河川 + 滯洪池/水庫)
"""
from __future__ import annotations

import json
import re
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

import requests
from tenacity import retry, stop_after_attempt, wait_exponential

OVERPASS_URL = "https://overpass-api.de/api/interpreter"
USER_AGENT = "LiveSafe.tw/0.1 (kevin868686@gmail.com)"
TW_BBOX = "21.5,119.5,25.5,122.5"

OUT_DIR = Path(__file__).resolve().parents[1] / "data" / "processed"


@retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=2, min=4, max=30))
def overpass(query: str) -> dict:
    resp = requests.post(
        OVERPASS_URL,
        data={"data": query},
        headers={"User-Agent": USER_AGENT, "Accept": "application/json"},
        timeout=600,
    )
    resp.raise_for_status()
    return resp.json()


def coord(el: dict) -> tuple[float, float] | None:
    lat = el.get("lat") or (el.get("center") or {}).get("lat")
    lng = el.get("lon") or (el.get("center") or {}).get("lon")
    if lat is None or lng is None:
        return None
    return float(lat), float(lng)


def dedupe_key(lat: float, lng: float, precision: int = 4) -> str:
    return f"{round(lat, precision)},{round(lng, precision)}"


# ============================================================
# 1. 生活機能（超商 / 藥局 / 公園）
# ============================================================
def fetch_amenities() -> dict:
    print("[amenities] querying...")
    q = f"""[out:json][timeout:600];
(
  node["shop"="convenience"]({TW_BBOX});
  node["amenity"="pharmacy"]({TW_BBOX});
  node["leisure"="park"]({TW_BBOX});
  way["leisure"="park"]({TW_BBOX});
);
out tags center;"""
    data = overpass(q)
    raw = data.get("elements") or []
    print(f"  raw elements: {len(raw)}")
    convenience: list[dict] = []
    pharmacy: list[dict] = []
    park: list[dict] = []
    seen = set()
    for el in raw:
        c = coord(el)
        if not c:
            continue
        lat, lng = c
        key = dedupe_key(lat, lng)
        if key in seen:
            continue
        seen.add(key)
        tags = el.get("tags") or {}
        name = tags.get("name") or tags.get("name:zh")
        item = {"name": name, "lat": lat, "lng": lng}
        if tags.get("shop") == "convenience":
            # 排除已關門 (disused)、暫時關閉
            if tags.get("disused") == "yes" or tags.get("abandoned") == "yes":
                continue
            item["brand"] = tags.get("brand")
            convenience.append(item)
        elif tags.get("amenity") == "pharmacy":
            if tags.get("disused") == "yes":
                continue
            pharmacy.append(item)
        elif tags.get("leisure") == "park":
            park.append(item)
    print(
        f"  cleaned: convenience={len(convenience)} pharmacy={len(pharmacy)} park={len(park)}"
    )
    return {
        "metadata": {
            "source": "OSM Overpass (Taiwan bbox)",
            "fetched_at": datetime.now(timezone.utc).isoformat(),
            "convenience_count": len(convenience),
            "pharmacy_count": len(pharmacy),
            "park_count": len(park),
        },
        "convenience": convenience,
        "pharmacy": pharmacy,
        "park": park,
    }


# ============================================================
# 2. 交通（軌道 + 公車）
# ============================================================
def is_inactive_rail(tags: dict) -> bool:
    return (
        tags.get("disused") == "yes"
        or tags.get("abandoned") == "yes"
        or tags.get("disused:railway") == "station"
        or tags.get("abandoned:railway") == "station"
        or tags.get("service") in {"yard", "depot"}
        or tags.get("railway:traffic_mode") == "freight"
    )


def detect_rail_kind(tags: dict) -> str | None:
    if tags.get("subway") == "yes" or tags.get("station") == "subway":
        return "subway"
    if tags.get("light_rail") == "yes" or tags.get("station") == "light_rail":
        return "light_rail"
    if tags.get("tram") == "yes" or tags.get("station") == "tram":
        return "tram"
    if tags.get("train") == "yes" or tags.get("railway") == "halt":
        return "train"
    return None


def fetch_transit() -> dict:
    print("[transit] querying rail stations (strict tag filter)...")
    q_rail = f"""[out:json][timeout:300];
(
  node["railway"="station"]["train"="yes"]({TW_BBOX});
  node["railway"="station"]["subway"="yes"]({TW_BBOX});
  node["railway"="station"]["light_rail"="yes"]({TW_BBOX});
  node["railway"="station"]["tram"="yes"]({TW_BBOX});
  node["railway"="halt"]({TW_BBOX});
  node["station"="subway"]({TW_BBOX});
  node["station"="light_rail"]({TW_BBOX});
  node["station"="tram"]({TW_BBOX});
);
out tags center;"""
    rails_raw = overpass(q_rail).get("elements") or []
    print(f"  rail raw: {len(rails_raw)}")
    rails: list[dict] = []
    seen = set()
    for el in rails_raw:
        c = coord(el)
        if not c:
            continue
        lat, lng = c
        tags = el.get("tags") or {}
        if is_inactive_rail(tags):
            continue
        kind = detect_rail_kind(tags)
        if not kind:
            continue
        name = tags.get("name") or tags.get("name:zh")
        if not name:
            continue
        key = dedupe_key(lat, lng, precision=4)
        if key in seen:
            continue
        seen.add(key)
        rails.append(
            {
                "name": name,
                "lat": lat,
                "lng": lng,
                "kind": kind,
                "operator": tags.get("operator"),
            }
        )
    print(f"  rail cleaned: {len(rails)}")

    time.sleep(2)
    print("[transit] querying bus stops...")
    q_bus = f'[out:json][timeout:600];(node["highway"="bus_stop"]({TW_BBOX}););out tags center;'
    bus_raw = overpass(q_bus).get("elements") or []
    print(f"  bus raw: {len(bus_raw)}")
    buses: list[dict] = []
    seen_bus = set()
    for el in bus_raw:
        c = coord(el)
        if not c:
            continue
        lat, lng = c
        tags = el.get("tags") or {}
        if tags.get("disused") == "yes" or tags.get("abandoned") == "yes":
            continue
        name = tags.get("name") or tags.get("name:zh")
        if not name:
            continue
        # 同名+同址 (~10m) 去重
        key = f"{name}|{round(lat, 4)},{round(lng, 4)}"
        if key in seen_bus:
            continue
        seen_bus.add(key)
        buses.append({"name": name, "lat": lat, "lng": lng})
    print(f"  bus cleaned: {len(buses)}")

    return {
        "metadata": {
            "source": "OSM Overpass (Taiwan bbox, strict tag filter)",
            "fetched_at": datetime.now(timezone.utc).isoformat(),
            "rail_count": len(rails),
            "bus_count": len(buses),
        },
        "rail": rails,
        "bus": buses,
    }


# ============================================================
# 3. 學校（按學制分類）
# ============================================================
def classify_school(tags: dict) -> str:
    amenity = tags.get("amenity")
    if amenity == "kindergarten":
        return "kindergarten"
    if amenity in ("university", "college"):
        return "university"
    isced = tags.get("isced:level", "")
    if isced and "0" in isced:
        return "kindergarten"
    if isced == "1" or isced.startswith("1,"):
        return "primary"
    if isced == "2" or isced == "2,3":
        return "junior"
    if isced == "3":
        return "high"
    school_type = (tags.get("school:type") or "") + (tags.get("school") or "")
    if re.search(r"高中|高工|高商|高職|完中|senior", school_type, re.I):
        return "high"
    if re.search(r"國中|junior_high|middle", school_type, re.I):
        return "junior"
    if re.search(r"國小|primary|elementary|實小", school_type, re.I):
        return "primary"
    name = (tags.get("name") or "") + (tags.get("name:zh") or "")
    if re.search(r"大學|學院|University|College", name, re.I):
        return "university"
    if re.search(r"高中|高工|高商|高職|完中", name):
        return "high"
    if re.search(r"國中|中學", name):
        return "junior"
    if re.search(r"國小|國民小學|實小|附小", name):
        return "primary"
    if re.search(r"幼稚園|幼兒園|kindergarten", name, re.I):
        return "kindergarten"
    return "other"


def fetch_schools() -> dict:
    print("[schools] querying...")
    q = f"""[out:json][timeout:300];
(
  node["amenity"="school"]({TW_BBOX});
  way["amenity"="school"]({TW_BBOX});
  node["amenity"="university"]({TW_BBOX});
  way["amenity"="university"]({TW_BBOX});
  node["amenity"="college"]({TW_BBOX});
  way["amenity"="college"]({TW_BBOX});
  node["amenity"="kindergarten"]({TW_BBOX});
  way["amenity"="kindergarten"]({TW_BBOX});
);
out tags center;"""
    raw = overpass(q).get("elements") or []
    print(f"  raw: {len(raw)}")
    schools: list[dict] = []
    seen = set()
    counts = {"university": 0, "high": 0, "junior": 0, "primary": 0, "kindergarten": 0, "other": 0}
    for el in raw:
        c = coord(el)
        if not c:
            continue
        lat, lng = c
        tags = el.get("tags") or {}
        name = tags.get("name") or tags.get("name:zh")
        if not name:
            continue
        key = f"{name}|{round(lat, 3)},{round(lng, 3)}"
        if key in seen:
            continue
        seen.add(key)
        level = classify_school(tags)
        counts[level] += 1
        schools.append({"name": name, "lat": lat, "lng": lng, "level": level})
    print(f"  cleaned: {counts}")
    return {
        "metadata": {
            "source": "OSM Overpass (Taiwan bbox)",
            "fetched_at": datetime.now(timezone.utc).isoformat(),
            "level_counts": counts,
            "total": len(schools),
        },
        "schools": schools,
    }


# ============================================================
# Main
# ============================================================
def main() -> int:
    target = sys.argv[1] if len(sys.argv) > 1 else "all"
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    jobs: list[tuple[str, str, callable]] = []
    if target in ("all", "amenities"):
        jobs.append(("osm_amenities.json", "amenities", fetch_amenities))
    if target in ("all", "transit"):
        jobs.append(("osm_transit.json", "transit", fetch_transit))
    if target in ("all", "schools"):
        jobs.append(("osm_schools.json", "schools", fetch_schools))

    for filename, label, fn in jobs:
        try:
            data = fn()
            path = OUT_DIR / filename
            path.write_text(json.dumps(data, ensure_ascii=False), encoding="utf-8")
            kb = path.stat().st_size // 1024
            print(f"[{label}] saved {path} ({kb} KB)")
        except Exception as e:
            print(f"[{label}] FAILED: {e}", file=sys.stderr)
        time.sleep(3)  # 避免連續 Overpass call 觸發 rate limit
    return 0


if __name__ == "__main__":
    sys.exit(main())
