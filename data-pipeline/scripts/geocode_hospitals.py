"""
geocode_hospitals.py — 使用 OSM Nominatim 為 hospitals.json 補充經緯度。

策略（依序嘗試，命中即停）：
 1. 以醫院完整名稱查詢
 2. 剝除前綴（衛生福利部、衛福部、部立、署立、國立）後查詢
 3. 以地址的「縣市+區+路名」查詢（剝除門牌號）

Nominatim 使用條款：
 - User-Agent 必須含聯絡方式
 - 查詢間隔 >= 1s

支援中斷恢復：每 10 筆寫回檔案，下次執行跳過已成功者。
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

NOMINATIM_ENDPOINT = os.getenv("NOMINATIM_ENDPOINT", "https://nominatim.openstreetmap.org/search")
USER_AGENT = os.getenv("NOMINATIM_USER_AGENT", "LiveSafe.tw/0.1 (contact@example.com)")
RATE_LIMIT_SECONDS = 1.2

PREFIX_PATTERNS = ["衛生福利部", "衛福部", "部立", "署立", "國立"]

ADDRESS_RE = re.compile(r"^(.+?[縣市])(.+?[鄉鎮市區])(.+?[路街道段])")


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


def strip_prefix(name: str) -> str | None:
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


def geocode_one(hospital: dict) -> tuple[float, float, str] | None:
    name = hospital["name"]
    address = hospital["address"]

    coords = nominatim_query(name)
    time.sleep(RATE_LIMIT_SECONDS)
    if coords:
        return (*coords, "name")

    stripped = strip_prefix(name)
    if stripped and stripped != name:
        coords = nominatim_query(stripped)
        time.sleep(RATE_LIMIT_SECONDS)
        if coords:
            return (*coords, "name_stripped")

    street_q = extract_street_query(address)
    if street_q:
        coords = nominatim_query(street_q)
        time.sleep(RATE_LIMIT_SECONDS)
        if coords:
            return (*coords, "address_street")

    return None


def save(data: dict) -> None:
    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_PATH.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")


def main() -> int:
    if not INPUT_PATH.exists():
        print(f"[geocode_hospitals] ERROR: {INPUT_PATH} 不存在，請先跑 fetch_hospitals.py", file=sys.stderr)
        return 1

    src = json.loads(INPUT_PATH.read_text(encoding="utf-8"))

    done: dict[str, dict] = {}
    if OUTPUT_PATH.exists():
        prev = json.loads(OUTPUT_PATH.read_text(encoding="utf-8"))
        for h in prev.get("hospitals", []):
            done[h["code"]] = h

    output = {
        "metadata": {
            **src["metadata"],
            "geocoded_at": datetime.now(timezone.utc).isoformat(),
            "geocoder": "OSM Nominatim",
            "geocoder_endpoint": NOMINATIM_ENDPOINT,
        },
        "hospitals": [],
    }

    total = len(src["hospitals"])
    stats = {"name": 0, "name_stripped": 0, "address_street": 0, "unresolved": 0, "cached": 0}

    for i, h in enumerate(src["hospitals"], start=1):
        code = h["code"]
        cached = done.get(code)
        if cached and cached.get("lat") is not None:
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
        else:
            h_out = {**h, "lat": None, "lng": None, "geocode_method": "unresolved"}
            stats["unresolved"] += 1

        output["hospitals"].append(h_out)

        if i % 10 == 0:
            save(output)
            resolved = stats["name"] + stats["name_stripped"] + stats["address_street"]
            print(
                f"  [{i}/{total}] resolved={resolved}  unresolved={stats['unresolved']}  cached={stats['cached']}"
            )

    output["metadata"]["geocode_stats"] = stats
    save(output)

    resolved = total - stats["unresolved"]
    print(f"[geocode_hospitals] 完成：{resolved}/{total}（{resolved/total*100:.1f}%）")
    print(
        f"  name={stats['name']}  stripped={stats['name_stripped']}  "
        f"street={stats['address_street']}  unresolved={stats['unresolved']}  cached={stats['cached']}"
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
