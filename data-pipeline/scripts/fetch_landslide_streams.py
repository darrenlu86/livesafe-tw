"""
fetch_landslide_streams.py — 抓水保局土石流潛勢溪流（111 年度 1729 條）。

資料源：農業部水土保持署 (data.gov.tw 147916)
URL: https://data.moa.gov.tw/OpenData/GetOpenDataFile.aspx?id=I19&FileType=SHP&RID=7754

每條溪流 = polyline (TWD97)。
評分用「距最近土石流潛勢溪流距離」。

輸出：data/processed/landslide_streams.json
"""
from __future__ import annotations

import io
import json
import shutil
import sys
import zipfile
from datetime import datetime, timezone
from pathlib import Path

import requests
import shapefile
import urllib3
from pyproj import Transformer
from shapely.geometry import LineString

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

SOURCE_URL = (
    "https://data.moa.gov.tw/OpenData/GetOpenDataFile.aspx"
    "?id=I19&FileType=SHP&RID=7754"
)
TMP_DIR = Path("/tmp/livesafe_landslide")
OUTPUT_PATH = (
    Path(__file__).resolve().parents[1] / "data" / "processed" / "landslide_streams.json"
)
SIMPLIFY_TOLERANCE_DEG = 0.0005  # ~50m


def download_and_extract() -> Path:
    TMP_DIR.mkdir(parents=True, exist_ok=True)
    zip_path = TMP_DIR / "src.zip"
    if not zip_path.exists() or zip_path.stat().st_size < 100000:
        print("[landslide] 下載中…", end=" ", flush=True)
        r = requests.get(SOURCE_URL, allow_redirects=True, timeout=300, verify=False)
        r.raise_for_status()
        zip_path.write_bytes(r.content)
        print(f"{zip_path.stat().st_size // 1024} KB")
    extract = TMP_DIR / "extract"
    if extract.exists():
        shutil.rmtree(extract)
    extract.mkdir()
    with zipfile.ZipFile(zip_path) as zf:
        zf.extractall(extract)
    shps = list(extract.rglob("*.shp"))
    if not shps:
        raise RuntimeError("no .shp in archive")
    return shps[0]


def open_shp(shp_path: Path) -> shapefile.Reader:
    for enc in ("cp950", "big5", "utf-8"):
        try:
            r = shapefile.Reader(str(shp_path), encoding=enc)
            _ = r.records()[0]
            return r
        except (UnicodeDecodeError, IndexError):
            continue
    return shapefile.Reader(str(shp_path), encoding="latin-1")


def main() -> int:
    shp_path = download_and_extract()
    print(f"[landslide] 解析 {shp_path.name}")
    sf = open_shp(shp_path)
    transformer = Transformer.from_crs("EPSG:3826", "EPSG:4326", always_xy=True)

    streams: list[dict] = []
    risk_counts: dict[str, int] = {}
    for i, rec in enumerate(sf.records()):
        shape = sf.shapes()[i]
        if not shape.points or len(shape.points) < 2:
            continue
        # 轉 WGS84 (lng, lat)
        pts_wgs = [transformer.transform(x, y) for x, y in shape.points]
        try:
            line = LineString(pts_wgs).simplify(SIMPLIFY_TOLERANCE_DEG, preserve_topology=True)
        except Exception:
            continue
        if line.is_empty:
            continue
        if line.geom_type != "LineString":
            continue
        coords = [(round(x, 5), round(y, 5)) for x, y in line.coords]
        # 名稱與風險
        try:
            risk = (rec["Risk"] or "").strip() if "Risk" in [f[0] for f in sf.fields[1:]] else ""
        except Exception:
            risk = ""
        risk_counts[risk] = risk_counts.get(risk, 0) + 1
        streams.append(
            {
                "id": (rec["Debrisno"] if "Debrisno" in [f[0] for f in sf.fields[1:]] else f"ID{i}"),
                "name": (rec["Name"] if "Name" in [f[0] for f in sf.fields[1:]] else ""),
                "county": (rec["County01"] if "County01" in [f[0] for f in sf.fields[1:]] else ""),
                "town": (rec["Town01"] if "Town01" in [f[0] for f in sf.fields[1:]] else ""),
                "risk": risk,
                "coords": coords,  # [[lng, lat], ...]
            }
        )

    out = {
        "metadata": {
            "source": "農業部水土保持署 (data.gov.tw 147916)",
            "scenario": "111 年度 1729 條土石流潛勢溪流",
            "fetched_at": datetime.now(timezone.utc).isoformat(),
            "count": len(streams),
            "risk_distribution": risk_counts,
        },
        "streams": streams,
    }
    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_PATH.write_text(json.dumps(out, ensure_ascii=False), encoding="utf-8")
    kb = OUTPUT_PATH.stat().st_size // 1024
    print(f"[landslide] 輸出：{OUTPUT_PATH} ({kb} KB, {len(streams)} streams)")
    print(f"  Risk 分布: {risk_counts}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
