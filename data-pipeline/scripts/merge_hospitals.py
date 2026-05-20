"""
merge_hospitals.py — 預先合併 NHI 健保 + OSM 醫院為單一清淨資料集。

讀取：
  - data/processed/hospitals_geocoded.json (NHI 急救責任醫院 371 家含座標)
  - data/processed/osm_hospitals.json     (OSM 醫院 391 家含醫學中心識別)

合併規則：
  1. NHI 為主（有 has_emergency 真實標記）
  2. OSM 補強（含 NHI 缺漏的醫學中心本院 + 其他標 amenity=hospital）
  3. 以 ~10m 座標精度去重 (lat 0.0005, lng 0.0005)；NHI 優先
  4. OSM 若標 is_medical_center=true，merge 進對應 NHI record（如果有）
  5. 輸出統一結構，worker 只需做空間查詢

輸出：data/processed/hospitals_merged.json
"""
from __future__ import annotations

import json
import sys
from datetime import datetime, timezone
from pathlib import Path

NHI_PATH = Path(__file__).resolve().parents[1] / "data" / "processed" / "hospitals_geocoded.json"
OSM_PATH = Path(__file__).resolve().parents[1] / "data" / "processed" / "osm_hospitals.json"
OUTPUT_PATH = (
    Path(__file__).resolve().parents[1] / "data" / "processed" / "hospitals_merged.json"
)


def coord_key(lat: float, lng: float, precision: int = 3) -> str:
    return f"{round(lat, precision)},{round(lng, precision)}"


def main() -> int:
    if not NHI_PATH.exists() or not OSM_PATH.exists():
        print("ERROR: NHI 或 OSM hospitals JSON 不存在，請先跑 fetch + geocode", file=sys.stderr)
        return 1

    nhi = json.loads(NHI_PATH.read_text(encoding="utf-8"))
    osm = json.loads(OSM_PATH.read_text(encoding="utf-8"))

    merged: list[dict] = []
    by_coord: dict[str, int] = {}  # coord_key → index in merged

    # 1. 先放 NHI 資料（含 emergency 標記）
    for h in nhi.get("hospitals", []):
        if h.get("lat") is None or h.get("lng") is None:
            continue
        if not h.get("is_active"):
            continue
        key = coord_key(h["lat"], h["lng"])
        entry = {
            "name": h["name"],
            "lat": h["lat"],
            "lng": h["lng"],
            "source": "nhi",
            "has_emergency": bool(h.get("has_emergency", False)),
            "is_medical_center": False,  # 由 OSM 補強
            "type": h.get("type"),
            "address": h.get("address"),
        }
        by_coord[key] = len(merged)
        merged.append(entry)

    # 2. 加入 OSM；若同址 → 補強 NHI record；若無同址 → 新增
    osm_added = 0
    osm_merged_into_nhi = 0
    for h in osm.get("hospitals", []):
        lat = h.get("lat")
        lng = h.get("lng")
        if lat is None or lng is None:
            continue
        key = coord_key(lat, lng)
        if key in by_coord:
            # 同址 → 若 OSM 標醫學中心，補強 NHI record
            idx = by_coord[key]
            if h.get("is_medical_center"):
                merged[idx]["is_medical_center"] = True
            if h.get("has_emergency_tag") and not merged[idx]["has_emergency"]:
                merged[idx]["has_emergency"] = True
            osm_merged_into_nhi += 1
        else:
            entry = {
                "name": h["name"],
                "lat": lat,
                "lng": lng,
                "source": "osm",
                "has_emergency": bool(h.get("has_emergency_tag", False)),
                "is_medical_center": bool(h.get("is_medical_center", False)),
                "operator": h.get("operator"),
                "address": h.get("addr"),
            }
            by_coord[key] = len(merged)
            merged.append(entry)
            osm_added += 1

    # 3. 統計
    total = len(merged)
    emergency = sum(1 for h in merged if h["has_emergency"])
    medical_centers = sum(1 for h in merged if h["is_medical_center"])
    from_nhi = sum(1 for h in merged if h["source"] == "nhi")
    from_osm = sum(1 for h in merged if h["source"] == "osm")

    out = {
        "metadata": {
            "source": "Merged: NHI (健保特約醫事機構) + OSM (amenity=hospital)",
            "fetched_at": datetime.now(timezone.utc).isoformat(),
            "total": total,
            "from_nhi": from_nhi,
            "from_osm": from_osm,
            "emergency_count": emergency,
            "medical_center_count": medical_centers,
            "osm_merged_into_nhi": osm_merged_into_nhi,
            "osm_added": osm_added,
        },
        "hospitals": merged,
    }

    OUTPUT_PATH.write_text(json.dumps(out, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"[merge_hospitals] {OUTPUT_PATH}")
    print(f"  total: {total} (NHI: {from_nhi}, OSM: {from_osm})")
    print(f"  emergency: {emergency}, medical centers: {medical_centers}")
    print(f"  OSM merged into NHI: {osm_merged_into_nhi}, OSM added new: {osm_added}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
