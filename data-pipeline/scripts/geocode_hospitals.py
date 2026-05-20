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
}

# 剝除「XX醫療社團法人 / XX醫療財團法人」前綴（含教會、財團、學校等冗長前綴）
LEGAL_ENTITY_RE = re.compile(r"^.*?醫療(?:社團|財團)法人")
ADDRESS_RE = re.compile(r"^(.+?[縣市])(.+?[鄉鎮市區])(.+?[路街道段])")
ADDRESS_NO_RE = re.compile(
    r"^(.+?[縣市])(.+?[鄉鎮市區])(?:.*?里)?(.+?[路街道]\S*?號)"
)

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

    # 1. 完整名稱
    coords = nominatim_query(name)
    time.sleep(RATE_LIMIT_SECONDS)
    if coords:
        return (*coords, "name")

    # 2. 剝除前綴
    stripped = strip_prefix(name)
    if stripped and stripped != name:
        coords = nominatim_query(stripped)
        time.sleep(RATE_LIMIT_SECONDS)
        if coords:
            return (*coords, "name_stripped")

    # 3. 縣市+區+路名
    street_q = extract_street_query(address)
    if street_q:
        coords = nominatim_query(street_q)
        time.sleep(RATE_LIMIT_SECONDS)
        if coords:
            return (*coords, "address_street")

    # 4. 縣市+區+路名+號（全完整地址）
    full_q = extract_full_query(address)
    if full_q:
        coords = nominatim_query(full_q)
        time.sleep(RATE_LIMIT_SECONDS)
        if coords:
            return (*coords, "address_full")

    # 5. Google Maps fallback（若已設 key）
    if GOOGLE_MAPS_KEY:
        # 先試名稱，後試地址
        coords = google_query(name)
        if coords:
            return (*coords, "google_name")
        coords = google_query(address)
        if coords:
            return (*coords, "google_address")

    return None


def save(data: dict) -> None:
    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_PATH.write_text(
        json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8"
    )


def main() -> int:
    retry_unresolved = "--retry-unresolved" in sys.argv

    if not INPUT_PATH.exists():
        print(
            f"[geocode_hospitals] ERROR: {INPUT_PATH} 不存在，請先跑 fetch_hospitals.py",
            file=sys.stderr,
        )
        return 1

    src = json.loads(INPUT_PATH.read_text(encoding="utf-8"))

    done: dict[str, dict] = {}
    if OUTPUT_PATH.exists():
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
        "name": 0,
        "name_stripped": 0,
        "address_street": 0,
        "address_full": 0,
        "google_name": 0,
        "google_address": 0,
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
