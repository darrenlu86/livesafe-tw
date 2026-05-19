"""
build_active_faults.py — 從全球斷層資料過濾出台灣方框內的活動斷層。

讀取：data/raw/gem_faults_global.geojson
輸出：data/processed/active_faults.geojson
"""
from __future__ import annotations

import json
import sys
from datetime import datetime, timezone
from pathlib import Path

RAW_PATH = (
    Path(__file__).resolve().parents[1] / "data" / "raw" / "gem_faults_global.geojson"
)
OUTPUT_PATH = (
    Path(__file__).resolve().parents[1] / "data" / "processed" / "active_faults.geojson"
)

TAIWAN_BBOX = {
    "min_lat": 21.5,
    "max_lat": 25.5,
    "min_lng": 119.5,
    "max_lng": 122.5,
}

KEEP_PROPS = ("name", "slip_type", "catalog_id", "net_slip_rate", "average_dip")


def iter_coords(coords):
    if not coords:
        return
    if isinstance(coords[0], (int, float)):
        yield coords
        return
    for c in coords:
        yield from iter_coords(c)


def in_taiwan(geometry: dict) -> bool:
    coords = geometry.get("coordinates") or []
    for pt in iter_coords(coords):
        lng, lat = pt[0], pt[1]
        if (
            TAIWAN_BBOX["min_lat"] <= lat <= TAIWAN_BBOX["max_lat"]
            and TAIWAN_BBOX["min_lng"] <= lng <= TAIWAN_BBOX["max_lng"]
        ):
            return True
    return False


def slim_props(props: dict) -> dict:
    return {k: props.get(k) for k in KEEP_PROPS if props.get(k) is not None}


def main() -> int:
    if not RAW_PATH.exists():
        print(f"[build_active_faults] ERROR: 找不到 {RAW_PATH}", file=sys.stderr)
        return 1

    raw = json.loads(RAW_PATH.read_text(encoding="utf-8"))
    features = raw.get("features") or []
    print(f"[build_active_faults] 全球 features：{len(features)}")

    taiwan = [
        {
            "type": "Feature",
            "geometry": f["geometry"],
            "properties": slim_props(f.get("properties") or {}),
        }
        for f in features
        if in_taiwan(f.get("geometry") or {})
    ]

    if not taiwan:
        print("[build_active_faults] ERROR: 過濾後 0 條斷層", file=sys.stderr)
        return 1

    out = {
        "type": "FeatureCollection",
        "metadata": {
            "fetched_at": datetime.now(timezone.utc).isoformat(),
            "count": len(taiwan),
            "taiwan_bbox": TAIWAN_BBOX,
        },
        "features": taiwan,
    }
    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_PATH.write_text(json.dumps(out, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"[build_active_faults] 台灣斷層：{len(taiwan)} 條 → {OUTPUT_PATH}")
    sample_names = [f["properties"].get("name") for f in taiwan[:5]]
    print(f"  前 5 條：{sample_names}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
