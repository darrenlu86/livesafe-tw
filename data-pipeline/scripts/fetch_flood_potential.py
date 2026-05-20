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
import re
import shutil
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

import requests
import shapefile
import urllib3
from pyproj import Transformer
from shapely.geometry import MultiPolygon, Polygon
from shapely.ops import unary_union

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

OUTPUT_PATH = (
    Path(__file__).resolve().parents[1] / "data" / "processed" / "flood_potential.json"
)
TMP_DIR = Path("/tmp/livesafe_flood")
SCENARIO = "24h650r"
SIMPLIFY_TOLERANCE_DEG = 0.003  # ~300m，平衡精度/檔案大小（worker bundle <10MB compressed）

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


def find_shp(extract_dir: Path) -> list[Path]:
    """各縣市命名差異極大，用 regex 模糊比對。回傳所有匹配的 shp."""
    pattern = re.compile(r"24.*?650.*?\.shp$", re.IGNORECASE)
    return [p for p in extract_dir.rglob("*.shp") if pattern.search(p.name)]


# 各縣市深度欄位差異極大
DEPTH_TEXT_FIELDS = ["type", "Type", "TYPE", "depth_class", "CLASS", "LEVEL", "Level", "水深"]
DEPTH_CODE_FIELDS = ["GRIDCODE", "gridcode", "Gridcode", "VALUE", "Value", "value", "RANK", "Rank", "色階"]
GRIDCODE_TO_CLASS = {
    1: "0-0.3",
    2: "0.3-0.5",
    3: "0.5-1",
    4: "1-2",
    5: "2-3",
    6: ">3",
}


def normalize_depth(s: str) -> str:
    """正規化深度標籤：「0.3m~0.5m」、「0.3-0.5」、「0.5-1.0」皆轉成統一格式"""
    s = s.strip()
    # 替換 m / 公尺 / 中文波浪
    s = s.replace("公尺", "").replace("m", "").replace(" ", "")
    s = s.replace("~", "-").replace("～", "-").replace("到", "-")
    # 「0.3-0.5」「0.5-1.0」→ 「0.3-0.5」「0.5-1」
    s = s.replace(".0-", "-")
    if s.endswith(".0"):
        s = s[:-2]
    # 「>3.0」→ 「>3」
    if s.startswith(">") and s.endswith(".0"):
        s = s[:-2]
    return s


def get_depth_class(rec, sf) -> str | None:
    """從 shapefile record 取深度等級，相容多種命名"""
    fields = [f[0] for f in sf.fields[1:]]
    # 1. 文字深度欄位
    for fname in DEPTH_TEXT_FIELDS:
        if fname in fields:
            try:
                v = rec[fname]
                if isinstance(v, str) and v.strip():
                    return normalize_depth(v)
                if isinstance(v, bytes):
                    return normalize_depth(v.decode("utf-8", errors="ignore"))
            except Exception:
                continue
    # 2. 數值代碼欄位
    for code_field in DEPTH_CODE_FIELDS:
        if code_field in fields:
            try:
                code = int(rec[code_field])
                if code in GRIDCODE_TO_CLASS:
                    return GRIDCODE_TO_CLASS[code]
            except Exception:
                continue
    return None


def open_shp(shp_path: Path) -> shapefile.Reader:
    """容錯 dbf 編碼：utf-8 失敗時 fallback 到 cp950 / big5"""
    for enc in ("utf-8", "cp950", "big5"):
        try:
            r = shapefile.Reader(str(shp_path), encoding=enc)
            # touch records to validate encoding
            _ = r.records()[0] if len(r) > 0 else None
            return r
        except UnicodeDecodeError:
            continue
        except Exception as e:
            if "codec" in str(e).lower() or "decode" in str(e).lower():
                continue
            raise
    # last resort: ignore errors
    return shapefile.Reader(str(shp_path), encoding="latin-1")


def parse_shp(shp_path: Path, transformer: Transformer) -> list[dict]:
    sf = open_shp(shp_path)
    # 按 depth_class 收集所有 polygons，最後合併 union 減少 ring 數
    by_class: dict[str, list[Polygon]] = {}
    for i, rec in enumerate(sf.records()):
        depth_class = get_depth_class(rec, sf)
        if depth_class is None:
            continue
        # 標準化 depth class（南投 用 0.5-1.0 / 2.0-3.0 等）
        depth_class = depth_class.replace(".0-", "-").replace(".0", "").strip()
        shape = sf.shapes()[i]
        if not shape.points:
            continue
        starts = list(shape.parts) + [len(shape.points)]
        for j in range(len(starts) - 1):
            pts = shape.points[starts[j] : starts[j + 1]]
            if len(pts) < 4:
                continue
            ring_wgs = [transformer.transform(x, y) for x, y in pts]
            try:
                poly = Polygon(ring_wgs)
                if not poly.is_valid:
                    poly = poly.buffer(0)
                if poly.is_empty:
                    continue
                by_class.setdefault(depth_class, []).append(poly)
            except Exception:
                continue

    polys: list[dict] = []
    for depth_class, plist in by_class.items():
        # dissolve 同等級 polygons 為 union → 強 simplify → 過濾過小
        try:
            merged = unary_union(plist)
            # 兩階段 simplify：先粗 simplify 減點，再 union 自己一次
            simplified = merged.simplify(SIMPLIFY_TOLERANCE_DEG, preserve_topology=True)
        except Exception:
            continue
        if simplified.is_empty:
            continue
        rings_wgs: list[list[tuple[float, float]]] = []
        geoms = (
            list(simplified.geoms)
            if simplified.geom_type == "MultiPolygon"
            else [simplified]
        )
        for g in geoms:
            if g.is_empty or g.geom_type != "Polygon":
                continue
            # 過濾極小 polygon（< 0.000001 deg² ≈ < 10000 m²）
            if g.area < 1e-6:
                continue
            exterior = list(g.exterior.coords)
            if len(exterior) < 4:
                continue
            rings_wgs.append([(round(x, 4), round(y, 4)) for x, y in exterior])
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
            shps = find_shp(ext)
            if not shps:
                print(f"  找不到符合 24*650*.shp 的檔案，跳過")
                continue
            county_polys: list[dict] = []
            for shp in shps:
                try:
                    polys = parse_shp(shp, transformer)
                    for p in polys:
                        p["county"] = name
                        p["shp_source"] = shp.name
                    county_polys.extend(polys)
                except Exception as e:
                    print(f"  parse_shp 失敗 {shp.name}: {e}", file=sys.stderr)
            if county_polys:
                all_polys.extend(county_polys)
                counties_done.append(name)
                print(f"  ✓ {len(county_polys)} polygons ({len(shps)} shp)")
            else:
                print(f"  ✗ {name}: shp 找到但解析 0 polygons")
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
