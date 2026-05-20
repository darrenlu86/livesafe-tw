"""
fetch_flood_potential.py — 抓水利署淹水潛勢圖（24h 650mm 情境）整合為單一 GeoJSON。

資料源：經濟部水利署 25766 淹水潛勢圖（每縣市一個 7z）
場景：24h 累積降雨 650mm（最壞情境，spec §4.1 採用）
深度等級：0-0.3 / 0.3-0.5 / 0.5-1 / 1-2 / 2-3 / >3 公尺

需要：7z 解壓器 (brew install p7zip)、pyshp、pyproj、shapely

輸出：data/processed/flood_potential.json
"""
from __future__ import annotations

import json
import shutil
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

import requests
import shapefile
import urllib3
from pyproj import Transformer
from shapely.geometry import Polygon

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

OUTPUT_PATH = (
    Path(__file__).resolve().parents[1] / "data" / "processed" / "flood_potential.json"
)
TMP_DIR = Path("/tmp/livesafe_flood")
SCENARIO = "24h650r"
SIMPLIFY_TOLERANCE_DEG = 0.0003  # ~30m

# 22 縣市的 7z 編號 (data.gov.tw 25766)
COUNTIES: list[tuple[str, str]] = [
    ("基隆市", "https://opendata.wra.gov.tw/cloud/25766InundationProbabilityMaps/207-01.7z"),
    ("臺北市", "https://opendata.wra.gov.tw/cloud/25766InundationProbabilityMaps/207-02.7z"),
    ("新北市", "https://opendata.wra.gov.tw/cloud/25766InundationProbabilityMaps/207-03.7z"),
    ("桃園市", "https://opendata.wra.gov.tw/cloud/25766InundationProbabilityMaps/207-04.7z"),
    ("新竹縣市", "https://opendata.wra.gov.tw/cloud/25766InundationProbabilityMaps/207-05.7z"),
    ("苗栗縣", "https://opendata.wra.gov.tw/cloud/25766InundationProbabilityMaps/207-06.7z"),
    ("臺中市", "https://opendata.wra.gov.tw/cloud/25766InundationProbabilityMaps/207-07.7z"),
    ("彰化縣", "https://opendata.wra.gov.tw/cloud/25766InundationProbabilityMaps/207-08.7z"),
    ("南投縣", "https://opendata.wra.gov.tw/cloud/25766InundationProbabilityMaps/207-09.7z"),
    ("雲林縣", "https://opendata.wra.gov.tw/cloud/25766InundationProbabilityMaps/207-10.7z"),
    ("嘉義縣市", "https://opendata.wra.gov.tw/cloud/25766InundationProbabilityMaps/207-11.7z"),
    ("臺南市", "https://opendata.wra.gov.tw/cloud/25766InundationProbabilityMaps/207-12.7z"),
    ("高雄市", "https://opendata.wra.gov.tw/cloud/25766InundationProbabilityMaps/207-13.7z"),
    ("屏東縣", "https://opendata.wra.gov.tw/cloud/25766InundationProbabilityMaps/207-14.7z"),
    ("宜蘭縣", "https://opendata.wra.gov.tw/cloud/25766InundationProbabilityMaps/207-15.7z"),
    ("花蓮縣", "https://opendata.wra.gov.tw/cloud/25766InundationProbabilityMaps/207-16.7z"),
    ("臺東縣", "https://opendata.wra.gov.tw/cloud/25766InundationProbabilityMaps/207-17.7z"),
    ("金門縣", "https://opendata.wra.gov.tw/cloud/25766InundationProbabilityMaps/223-18.7z"),
    ("連江縣", "https://opendata.wra.gov.tw/cloud/25766InundationProbabilityMaps/223-19.7z"),
    ("澎湖縣", "https://opendata.wra.gov.tw/cloud/25766InundationProbabilityMaps/223-20.7z"),
]


def download_and_extract(name: str, url: str) -> Path | None:
    arch = TMP_DIR / f"{name}.7z"
    out = TMP_DIR / name
    if out.exists():
        return out
    if not arch.exists():
        print(f"  下載 {name}…", end=" ", flush=True)
        r = requests.get(url, stream=True, timeout=300, verify=False)
        r.raise_for_status()
        with open(arch, "wb") as f:
            for chunk in r.iter_content(chunk_size=1 << 20):
                f.write(chunk)
        print(f"{arch.stat().st_size // 1024 // 1024} MB")
    out.mkdir(parents=True, exist_ok=True)
    result = subprocess.run(
        ["7z", "x", str(arch), f"-o{out}", "-y"],
        capture_output=True,
        timeout=120,
    )
    if result.returncode != 0:
        print(f"  解壓失敗 {name}: {result.stderr.decode()[:120]}", file=sys.stderr)
        return None
    return out


def find_shp(extract_dir: Path) -> Path | None:
    matches = list(extract_dir.rglob(f"{SCENARIO}.shp"))
    return matches[0] if matches else None


def parse_shp(shp_path: Path, transformer: Transformer) -> list[dict]:
    sf = shapefile.Reader(str(shp_path))
    polys: list[dict] = []
    for i, rec in enumerate(sf.records()):
        depth_class = rec["type"]
        shape = sf.shapes()[i]
        if not shape.points:
            continue
        # shape.parts 標示每個 ring 的起始 index
        starts = list(shape.parts) + [len(shape.points)]
        rings_wgs: list[list[tuple[float, float]]] = []
        for j in range(len(starts) - 1):
            pts = shape.points[starts[j] : starts[j + 1]]
            ring = [transformer.transform(x, y) for x, y in pts]
            # ring 是 (lng, lat) tuples
            if len(ring) < 4:
                continue
            try:
                simplified = (
                    Polygon(ring).simplify(SIMPLIFY_TOLERANCE_DEG, preserve_topology=True)
                )
            except Exception:
                continue
            if simplified.is_empty:
                continue
            if simplified.geom_type == "Polygon":
                exterior = list(simplified.exterior.coords)
                rings_wgs.append([(round(x, 5), round(y, 5)) for x, y in exterior])
            elif simplified.geom_type == "MultiPolygon":
                for g in simplified.geoms:
                    exterior = list(g.exterior.coords)
                    rings_wgs.append([(round(x, 5), round(y, 5)) for x, y in exterior])
        if rings_wgs:
            polys.append({"depth_class": depth_class, "rings": rings_wgs})
    return polys


def main() -> int:
    if shutil.which("7z") is None:
        print("ERROR: 需安裝 7z (brew install p7zip)", file=sys.stderr)
        return 1
    TMP_DIR.mkdir(parents=True, exist_ok=True)
    transformer = Transformer.from_crs("EPSG:3826", "EPSG:4326", always_xy=True)

    all_polys: list[dict] = []
    counties_done: list[str] = []
    skip = {arg.split("=", 1)[1] for arg in sys.argv if arg.startswith("--skip=")}

    for name, url in COUNTIES:
        if name in skip:
            print(f"[{name}] skipped")
            continue
        print(f"[{name}] 處理中...")
        try:
            ext = download_and_extract(name, url)
            if not ext:
                continue
            shp = find_shp(ext)
            if not shp:
                print(f"  找不到 {SCENARIO}.shp，跳過")
                continue
            polys = parse_shp(shp, transformer)
            for p in polys:
                p["county"] = name
            all_polys.extend(polys)
            counties_done.append(name)
            print(f"  ✓ {len(polys)} polygons")
        except Exception as e:
            print(f"  ✗ {name} 失敗: {e}", file=sys.stderr)

    out = {
        "metadata": {
            "source": "水利署淹水潛勢圖 (data.gov.tw 25766)",
            "scenario": SCENARIO,
            "scenario_label": "24 小時累積降雨 650mm（最壞情境）",
            "simplify_tolerance_deg": SIMPLIFY_TOLERANCE_DEG,
            "counties": counties_done,
            "polygon_count": len(all_polys),
            "fetched_at": datetime.now(timezone.utc).isoformat(),
        },
        "polygons": all_polys,
    }

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_PATH.write_text(
        json.dumps(out, ensure_ascii=False), encoding="utf-8"
    )
    size_kb = OUTPUT_PATH.stat().st_size // 1024
    print(f"\n[fetch_flood_potential] 輸出：{OUTPUT_PATH} ({size_kb} KB, {len(all_polys)} polygons)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
