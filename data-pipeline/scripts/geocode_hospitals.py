"""
geocode_hospitals.py — 使用 OSM Nominatim（必要時 Google Maps fallback）為醫院補座標。

策略（依序嘗試，命中即停）：
 1. Nominatim 完整名稱（normalize 後）
 2. Nominatim 剝除前綴名稱（衛生福利部/衛福部/部立/署立/國立）
 3. Nominatim 「縣市+區+路名」（剝除門牌號）
 4. Nominatim 「縣市+區+路名+號碼」（完整 normalize 後地址）
 5. Google Maps Geocoding API（若 GOOGLE_MAPS_KEY env 已設）

normalize 規則：
 - 全形數字 ０-９ → 半形 0-9
 - 全形破折號 － → -

支援中斷恢復：每 10 筆寫回檔案，下次執行跳過已成功者（geocode_method != unresolved）。
"""
from __future__ import annotations

import json
import os
import re
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

import requests
from dotenv import load_dotenv
from tenacity import retry, stop_after_attempt, wait_exponential

load_dotenv()

INPUT_PATH = Path(__file__).resolve().parents[1] / "data" / "processed" / "hospitals.json"
OUTPUT_PATH = Path(__file__).resolve().parents[1] / "data" / "processed" / "hospitals_geocoded.json"

NOMINATIM_ENDPOINT = os.getenv(
    "NOMINATIM_ENDPOINT", "https://nominatim.openstreetmap.org/search"
)
USER_AGENT = os.getenv(
    "NOMINATIM_USER_AGENT", "LiveSafe.tw/0.1 (contact@example.com)"
)
GOOGLE_MAPS_KEY = os.getenv("GOOGLE_MAPS_KEY", "").strip()
GOOGLE_ENDPOINT = "https://maps.googleapis.com/maps/api/geocode/json"
RATE_LIMIT_SECONDS = 1.2

PREFIX_PATTERNS = ["衛生福利部", "衛福部", "部立", "署立", "國立"]

# Nominatim 覆蓋不足且 Google Maps 未啟用時的人工座標表（街道/區級精度，從上層道路 lookup 得來）
# 來源：Nominatim 對「縣市+區+路名」或「縣市+區+里」的查詢結果
MANUAL_COORDS: dict[str, tuple[float, float, str]] = {
    "0132110519": (24.9705743, 121.1059706, "manual_street"),  # 衛福部桃園醫院新屋分院（新福二路）
    "0544010031": (23.5534068, 119.5856084, "manual_street"),  # 三軍總醫院澎湖分院（前寮里）
    "1503290034": (24.1803135, 120.6583427, "manual_district"),  # 定國骨科醫院（北屯經貿）
    "1507010023": (22.5987581, 120.3347744, "manual_district"),  # 澄清國際眼科醫院（鳳山五甲）
    "1507330011": (22.6334495, 120.3068806, "manual_district"),  # 七賢脊椎外科醫院（新興七賢）
    "1507340044": (22.6275512, 120.2941644, "manual_district"),  # 活力得中山脊椎外科醫院（前金）
    "1411030013": (25.0984566, 121.7530762, "manual_street"),   # 礦工醫院（基隆暖暖源遠路）
    "1502050045": (22.6476949, 120.2996219, "manual_district"),  # 德謙醫院（高雄三民區）
    "1502060014": (22.6310699, 120.3100224, "manual_district"),  # 蕭志文醫院（高雄新興區）
    "1522011080": (23.4824128, 120.4611116, "manual_street"),    # 建興醫院（嘉義東區中山路）
    "1531021183": (25.0614860, 121.4881020, "manual_district"),  # 全民醫院（新北三重）
    "1531140058": (25.0849230, 121.4737000, "manual_district"),  # 全民醫院（新北蘆洲）
}

# 剝除「XX醫療社團法人 / XX醫療財團法人」前綴
LEGAL_ENTITY_RE = re.compile(r"^.*?醫療(?:社團|財團)法人")
ADDRESS_RE = re.compile(r"^(.+?[縣市])(.+?[鄉鎮市區])(.+?[路街道段])")
ADDRESS_NO_RE = re.compile(
    r"^(.+?[縣市])(.+?[鄉鎮市區])(?:.*?里)?(.+?[路街道]\S*?號)"
)
COUNTY_RE = re.compile(r"^([^縣市]+[縣市])")

# 縣市概略邊界（用於驗證 geocode 結果在 address 聲明的縣市範圍內）
COUNTY_BBOX: dict[str, tuple[float, float, float, float]] = {
    "臺北市": (24.95, 25.21, 121.45, 121.67),
    "台北市": (24.95, 25.21, 121.45, 121.67),
    "新北市": (24.66, 25.31, 121.21, 122.03),
    "桃園市": (24.61, 25.13, 121.00, 121.51),
    "新竹市": (24.74, 24.89, 120.88, 121.05),
    "新竹縣": (24.51, 24.95, 120.78, 121.45),
    "苗栗縣": (24.30, 24.70, 120.59, 121.13),
    "臺中市": (23.99, 24.50, 120.43, 121.45),
    "台中市": (23.99, 24.50, 120.43, 121.45),
    "彰化縣": (23.78, 24.16, 120.31, 120.71),
    "南投縣": (23.48, 24.20, 120.55, 121.41),
    "雲林縣": (23.49, 23.95, 120.07, 120.74),
    "嘉義市": (23.43, 23.51, 120.40, 120.50),
    "嘉義縣": (23.16, 23.61, 120.10, 120.97),
    "臺南市": (22.86, 23.46, 120.04, 120.64),
    "台南市": (22.86, 23.46, 120.04, 120.64),
    "高雄市": (22.45, 23.47, 120.10, 121.06),
    "屏東縣": (21.89, 22.91, 120.30, 120.93),
    "宜蘭縣": (24.30, 25.04, 121.30, 121.96),
    "花蓮縣": (23.10, 24.41, 121.17, 121.74),
    "臺東縣": (21.93, 23.42, 120.74, 121.65),
    "台東縣": (21.93, 23.42, 120.74, 121.65),
    "澎湖縣": (23.18, 23.74, 119.30, 119.71),
    "金門縣": (24.34, 24.60, 118.21, 118.50),
    "連江縣": (26.13, 26.39, 119.91, 120.51),
    "基隆市": (25.10, 25.21, 121.62, 121.83),
}


def parse_county(address: str) -> str | None:
    m = COUNTY_RE.match(address)
    return m.group(1) if m else None


def in_county(lat: float, lng: float, county: str) -> bool:
    bbox = COUNTY_BBOX.get(county)
    if not bbox:
        return True
    lat_min, lat_max, lng_min, lng_max = bbox
    return lat_min <= lat <= lat_max and lng_min <= lng <= lng_max

FULLWIDTH_DIGITS = str.maketrans("０１２３４５６７８９－", "0123456789-")


def normalize(s: str) -> str:
    return s.translate(FULLWIDTH_DIGITS) if s else s


@retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=10))
def nominatim_query(q: str) -> tuple[float, float] | None:
    resp = requests.get(
        NOMINATIM_ENDPOINT,
        params={"q": q, "format": "jsonv2", "countrycodes": "tw", "limit": 1},
        headers={"User-Agent": USER_AGENT},
        timeout=30,
    )
    resp.raise_for_status()
    data = resp.json()
    if not data:
        return None
    return float(data[0]["lat"]), float(data[0]["lon"])


def google_query(q: str) -> tuple[float, float] | None:
    if not GOOGLE_MAPS_KEY:
        return None
    resp = requests.get(
        GOOGLE_ENDPOINT,
        params={"address": q, "key": GOOGLE_MAPS_KEY, "region": "tw"},
        timeout=30,
    )
    resp.raise_for_status()
    data = resp.json()
    if data.get("status") != "OK" or not data.get("results"):
        return None
    loc = data["results"][0]["geometry"]["location"]
    return float(loc["lat"]), float(loc["lng"])


def strip_prefix(name: str) -> str | None:
    # 1) 剝除「XX 醫療社團法人 / 醫療財團法人」冗長前綴
    m = LEGAL_ENTITY_RE.match(name)
    if m:
        stripped = name[m.end():]
        if stripped and stripped != name:
            return stripped
    # 2) 剝除政府單位前綴
    for p in PREFIX_PATTERNS:
        if name.startswith(p):
            return name[len(p):]
    return None


def extract_street_query(address: str) -> str | None:
    m = ADDRESS_RE.match(address)
    if not m:
        return None
    county, district, street = m.groups()
    return f"{county}{district}{street}"


def extract_full_query(address: str) -> str | None:
    m = ADDRESS_NO_RE.match(address)
    if not m:
        return None
    county, district, street_no = m.groups()
    return f"{county}{district}{street_no}"


def geocode_one(hospital: dict) -> tuple[float, float, str] | None:
    # 0. 手動座標表優先
    manual = MANUAL_COORDS.get(hospital.get("code", ""))
    if manual:
        return manual

    name = normalize(hospital["name"])
    address = normalize(hospital["address"])
    county = parse_county(address)

    def try_query(q: str, method: str) -> tuple[float, float, str] | None:
        coords = nominatim_query(q)
        time.sleep(RATE_LIMIT_SECONDS)
        if not coords:
            return None
        # 驗證落點是否在 address 聲明的縣市範圍
        if county and not in_county(coords[0], coords[1], county):
            print(
                f"    [reject out-of-county] {method} q={q!r} → {coords} 不在 {county}"
            )
            return None
        return (*coords, method)

    # 1. address-first：縣市+區+路名+號（最精準）
    full_q = extract_full_query(address)
    if full_q:
        r = try_query(full_q, "address_full")
        if r:
            return r

    # 2. 縣市+區+路名
    street_q = extract_street_query(address)
    if street_q:
        r = try_query(street_q, "address_street")
        if r:
            return r

    # 3. 縣市 + 完整名稱（縣市鎖定範圍）
    if county:
        r = try_query(f"{county} {name}", "county_name")
        if r:
            return r

    # 4. 縣市 + 剝除前綴名稱
    stripped = strip_prefix(name)
    if stripped and county:
        r = try_query(f"{county} {stripped}", "county_name_stripped")
        if r:
            return r

    # 5. 名稱（無縣市鎖定，最易誤判，最後 fallback）
    r = try_query(name, "name")
    if r:
        return r

    if stripped and stripped != name:
        r = try_query(stripped, "name_stripped")
        if r:
            return r

    # 6. Google Maps fallback
    if GOOGLE_MAPS_KEY:
        coords = google_query(f"{address} {name}" if address else name)
        if coords and (not county or in_county(coords[0], coords[1], county)):
            return (*coords, "google")

    return None


def save(data: dict) -> None:
    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_PATH.write_text(
        json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8"
    )


def main() -> int:
    retry_unresolved = "--retry-unresolved" in sys.argv
    retry_all = "--retry-all" in sys.argv

    if not INPUT_PATH.exists():
        print(
            f"[geocode_hospitals] ERROR: {INPUT_PATH} 不存在，請先跑 fetch_hospitals.py",
            file=sys.stderr,
        )
        return 1

    src = json.loads(INPUT_PATH.read_text(encoding="utf-8"))

    done: dict[str, dict] = {}
    if OUTPUT_PATH.exists() and not retry_all:
        prev = json.loads(OUTPUT_PATH.read_text(encoding="utf-8"))
        for h in prev.get("hospitals", []):
            done[h["code"]] = h

    print(
        f"[geocode_hospitals] Google Maps fallback: "
        f"{'啟用' if GOOGLE_MAPS_KEY else '關閉（GOOGLE_MAPS_KEY 未設）'}"
    )
    if retry_unresolved:
        print("[geocode_hospitals] --retry-unresolved：清除舊 unresolved 重試")

    output = {
        "metadata": {
            **src["metadata"],
            "geocoded_at": datetime.now(timezone.utc).isoformat(),
            "geocoder": "OSM Nominatim + (optional) Google Maps fallback",
            "geocoder_endpoint": NOMINATIM_ENDPOINT,
        },
        "hospitals": [],
    }

    total = len(src["hospitals"])
    stats: dict[str, int] = {
        "address_full": 0,
        "address_street": 0,
        "county_name": 0,
        "county_name_stripped": 0,
        "name": 0,
        "name_stripped": 0,
        "google": 0,
        "manual_street": 0,
        "manual_district": 0,
        "unresolved": 0,
        "cached": 0,
    }

    for i, h in enumerate(src["hospitals"], start=1):
        code = h["code"]
        cached = done.get(code)
        cached_resolved = cached and cached.get("lat") is not None
        if cached_resolved or (cached and not retry_unresolved):
            output["hospitals"].append(cached)
            stats["cached"] += 1
            if i % 50 == 0:
                print(f"  [{i}/{total}] cached={stats['cached']}")
            continue

        try:
            result = geocode_one(h)
        except Exception as e:
            print(f"  [{i}/{total}] {h['name']} — error: {e}", file=sys.stderr)
            result = None

        if result:
            lat, lng, method = result
            h_out = {**h, "lat": lat, "lng": lng, "geocode_method": method}
            stats[method] += 1
            print(f"  [{i}/{total}] {h['name']} → {method}")
        else:
            h_out = {**h, "lat": None, "lng": None, "geocode_method": "unresolved"}
            stats["unresolved"] += 1
            print(f"  [{i}/{total}] {h['name']} → unresolved", file=sys.stderr)

        output["hospitals"].append(h_out)

        if i % 10 == 0:
            save(output)

    output["metadata"]["geocode_stats"] = stats
    save(output)

    resolved = total - stats["unresolved"]
    print(f"\n[geocode_hospitals] 完成：{resolved}/{total}（{resolved/total*100:.1f}%）")
    for k, v in stats.items():
        if v:
            print(f"  {k}: {v}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
