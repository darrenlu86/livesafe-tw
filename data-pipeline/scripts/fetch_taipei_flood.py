#!/usr/bin/env python3
"""
台北市降雨積水模擬 KML → 加入 flood_potential.json

來源：data.taipei dataset fa1e8012-ebb4-473b-888e-97f9a9ce365e
情境：130 mm/h 短延時強降雨（最壞情境），非 24h 650mm，故 scenario_source 標註區別。

KML 結構：
- Document/Placemark/MultiGeometry/Polygon/outerBoundaryIs/LinearRing/coordinates
- 屬性 depth: "0.15m_0.30m" / "0.30m_0.50m" / "0.50m_1.00m" / "1.00m_2.00m" / "Above 2.00m"

合併策略：
- 取 130 mm/h 最壞情境（與其他縣市 24h 650mm 最壞情境概念對齊）
- depth class 對應：
    0.15m_0.30m → "0-0.3"
    0.30m_0.50m → "0.3-0.5"
    0.50m_1.00m → "0.5-1"
    1.00m_2.00m → "1-2"
    Above 2.00m → ">3"  (保守歸到最高級別)
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path
from xml.etree import ElementTree as ET

from shapely.geometry import Polygon, MultiPolygon, shape
from shapely.ops import unary_union

KML_NS = {"kml": "http://www.opengis.net/kml/2.2"}

DEPTH_MAP = {
    "0.15m_0.30m": "0-0.3",
    "0.30m_0.50m": "0.3-0.5",
    "0.50m_1.00m": "0.5-1",
    "1.00m_2.00m": "1-2",
    "Above 2.00m": ">3",
}

SIMPLIFY_TOLERANCE = 0.0008  # ~80m tolerance (worker bundle constraint)


def parse_kml(path: Path) -> dict[str, list[Polygon]]:
    """回傳 {depth_class: [Polygon, ...]}"""
    tree = ET.parse(path)
    root = tree.getroot()
    buckets: dict[str, list[Polygon]] = {}

    placemarks = root.findall(".//kml:Placemark", KML_NS)
    print(f"  [{path.name}] placemark count: {len(placemarks)}")

    for pm in placemarks:
        # 找 depth 屬性（ExtendedData/SchemaData/SimpleData[@name='depth']）
        depth_el = pm.find(".//kml:SimpleData[@name='depth']", KML_NS)
        if depth_el is None or not depth_el.text:
            continue
        depth_raw = depth_el.text.strip()
        depth_class = DEPTH_MAP.get(depth_raw)
        if depth_class is None:
            continue

        # 取所有 Polygon
        for poly_el in pm.findall(".//kml:Polygon", KML_NS):
            outer = poly_el.find(".//kml:outerBoundaryIs/kml:LinearRing/kml:coordinates", KML_NS)
            if outer is None or not outer.text:
                continue
            outer_ring = parse_coords(outer.text)
            if len(outer_ring) < 4:
                continue

            inner_rings: list[list[tuple[float, float]]] = []
            for inner in poly_el.findall(".//kml:innerBoundaryIs/kml:LinearRing/kml:coordinates", KML_NS):
                if inner.text:
                    ir = parse_coords(inner.text)
                    if len(ir) >= 4:
                        inner_rings.append(ir)

            try:
                poly = Polygon(outer_ring, holes=inner_rings)
                if not poly.is_valid:
                    poly = poly.buffer(0)
                if not poly.is_empty:
                    buckets.setdefault(depth_class, []).append(poly)
            except Exception as e:
                print(f"  ⚠ polygon error: {e}", file=sys.stderr)

    return buckets


def parse_coords(text: str) -> list[tuple[float, float]]:
    """KML coordinates string: 'lng,lat,0 lng,lat,0 ...'"""
    pts: list[tuple[float, float]] = []
    for tok in text.split():
        parts = tok.split(",")
        if len(parts) < 2:
            continue
        try:
            lng = float(parts[0])
            lat = float(parts[1])
            pts.append((lng, lat))
        except ValueError:
            continue
    return pts


def polygon_to_rings(poly) -> list[list[list[float]]]:
    """shapely Polygon → list of rings, each ring is list of [lng, lat]"""
    rings = []
    rings.append([[x, y] for x, y in poly.exterior.coords])
    for interior in poly.interiors:
        rings.append([[x, y] for x, y in interior.coords])
    return rings


def main():
    raw_dir = Path(__file__).parent.parent / "data" / "raw" / "taipei_flood"
    processed_path = (
        Path(__file__).parent.parent.parent / "worker" / "src" / "data" / "flood_potential.json"
    )

    # 取 130 mm/h（最壞情境），與其他縣市 24h 650mm 最壞情境概念對齊
    kml_path = raw_dir / "taipei_130mm.kml"
    if not kml_path.exists():
        print(f"❌ KML not found: {kml_path}", file=sys.stderr)
        sys.exit(1)

    print(f"📥 parsing {kml_path.name}...")
    buckets = parse_kml(kml_path)
    print(f"  parsed depth classes: {sorted(buckets.keys())}")
    for cls, polys in buckets.items():
        print(f"    {cls}: {len(polys)} polygons")

    # 策略：先把鄰近 grid cell 用小 buffer-union 連通（避免 30000 個獨立 grid），
    # 但 buffer 與 simplify tolerance 都保持小，保留位置精度。
    output_polygons = []
    for cls, polys in buckets.items():
        if not polys:
            continue
        print(f"  unioning {cls} ({len(polys)} polygons)...")
        # 小 buffer 只連通直接相鄰 cell，不會跨大範圍外推
        buffer_km = 0.00008  # ~8m
        tol = 0.00015        # ~15m simplify
        prepared = [p.buffer(buffer_km) for p in polys]
        union = unary_union(prepared)
        # union 後 shrink 回去抵消擴張
        union = union.buffer(-buffer_km * 0.5)
        simplified = union.simplify(tol, preserve_topology=True)

        def extract_polygons(geom):
            if geom.is_empty:
                return []
            if geom.geom_type == "Polygon":
                return [geom]
            if geom.geom_type == "MultiPolygon":
                return list(geom.geoms)
            if geom.geom_type == "GeometryCollection":
                out = []
                for g in geom.geoms:
                    out.extend(extract_polygons(g))
                return out
            return []

        geoms = extract_polygons(simplified)
        if not geoms:
            print(f"  ⚠ no polygons after simplify: {cls} ({simplified.geom_type})")
            continue

        kept = 0
        for g in geoms:
            if g.is_empty or g.area < 1e-8:
                continue
            output_polygons.append(
                {
                    "depth_class": cls,
                    "rings": polygon_to_rings(g),
                    "county": "臺北市",
                }
            )
            kept += 1
        print(f"    {cls} → {kept} polygons")

    print(f"\n✅ 合併後 polygon: {len(output_polygons)}")

    # 載入現有 flood_potential.json 並合併
    with open(processed_path, encoding="utf-8") as f:
        existing = json.load(f)

    # 先移除舊的「臺北市」polygons（若有）
    existing["polygons"] = [p for p in existing["polygons"] if p.get("county") != "臺北市"]
    print(f"  existing polygons (非北市): {len(existing['polygons'])}")

    existing["polygons"].extend(output_polygons)
    if "臺北市" not in existing["metadata"]["counties"]:
        existing["metadata"]["counties"].append("臺北市")
    existing["metadata"]["polygon_count"] = len(existing["polygons"])
    existing["metadata"]["taipei_scenario_note"] = (
        "臺北市資料來自 data.taipei 降雨積水模擬 130mm/h 情境（短延時強降雨），"
        "與其他 21 縣市的水利署 24h 650mm 情境不完全等同，但同為最壞情境保守估計。"
    )

    # 寫回
    with open(processed_path, "w", encoding="utf-8") as f:
        json.dump(existing, f, ensure_ascii=False)

    size = processed_path.stat().st_size
    print(f"\n📝 寫入 {processed_path}")
    print(f"   total polygons: {existing['metadata']['polygon_count']}")
    print(f"   total counties: {len(existing['metadata']['counties'])}")
    print(f"   bundle size: {size / 1024 / 1024:.2f} MB")


if __name__ == "__main__":
    main()
