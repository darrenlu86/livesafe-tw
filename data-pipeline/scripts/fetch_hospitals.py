"""
fetch_hospitals.py — 下載健保特約醫事機構-地區醫院清冊，輸出結構化 JSON。

資料源：衛生福利部中央健康保險署
授權：政府資料開放授權條款-第 1 版
更新頻率：每日
"""
from __future__ import annotations

import csv
import io
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

import requests
import urllib3
from tenacity import retry, stop_after_attempt, wait_exponential

# NHI info.nhi.gov.tw 缺中間憑證導致 Python 驗證失敗（curl 可通過）。
# 此為政府 opendata 公開資料，不含敏感性，容許停用驗證。
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

SOURCE_URL = "https://info.nhi.gov.tw/api/iode0000s01/Dataset?rId=A21030000I-D21003-003"
LICENSE = "政府資料開放授權條款-第 1 版"
OUTPUT_PATH = Path(__file__).resolve().parents[1] / "data" / "processed" / "hospitals.json"
RAW_PATH = Path(__file__).resolve().parents[1] / "data" / "raw" / "hospitals_nhi.csv"

EMERGENCY_SERVICE_MARKER = "急診業務"


@retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=10))
def download_csv(url: str) -> str:
    resp = requests.get(url, timeout=60, verify=False)
    resp.raise_for_status()
    resp.encoding = "utf-8-sig"
    return resp.text


def parse_yyyymmdd(s: str) -> str | None:
    s = (s or "").strip()
    if len(s) != 8 or not s.isdigit():
        return None
    return f"{s[0:4]}-{s[4:6]}-{s[6:8]}"


def split_list(s: str) -> list[str]:
    if not s:
        return []
    parts = s.replace("，", ",").split(",")
    return [p.strip() for p in parts if p.strip()]


def parse_row(row: dict[str, str]) -> dict:
    services = split_list(row.get("服務項目", ""))
    specialties = split_list(row.get("診療科別", ""))
    contract_start = parse_yyyymmdd(row.get("合約起日", ""))
    contract_end = parse_yyyymmdd(row.get("終止合約或歇業日期", ""))

    today = datetime.now(timezone.utc).date().isoformat()
    is_active = contract_end is not None and contract_end >= today

    return {
        "code": row.get("醫事機構代碼", "").strip(),
        "name": row.get("醫事機構名稱", "").strip(),
        "type": row.get("醫事機構種類", "").strip(),
        "phone": row.get("電話", "").strip(),
        "address": row.get("地址", "").strip(),
        "county_code": row.get("縣市別代碼", "").strip(),
        "region_group": row.get("分區業務組", "").strip(),
        "has_emergency": EMERGENCY_SERVICE_MARKER in services,
        "services": services,
        "specialties": specialties,
        "contract_start": contract_start,
        "contract_end": contract_end,
        "is_active": is_active,
    }


def main() -> int:
    print(f"[fetch_hospitals] 下載中：{SOURCE_URL}")
    csv_text = download_csv(SOURCE_URL)

    RAW_PATH.parent.mkdir(parents=True, exist_ok=True)
    RAW_PATH.write_text(csv_text, encoding="utf-8")
    print(f"[fetch_hospitals] 原始 CSV 已存：{RAW_PATH} ({len(csv_text):,} bytes)")

    reader = csv.DictReader(io.StringIO(csv_text))
    hospitals = [parse_row(row) for row in reader]
    hospitals = [h for h in hospitals if h["code"] and h["name"]]

    if not hospitals:
        print("[fetch_hospitals] ERROR: 解析後 0 筆資料，疑似 CSV 欄位變動", file=sys.stderr)
        return 1

    output = {
        "metadata": {
            "source": SOURCE_URL,
            "fetched_at": datetime.now(timezone.utc).isoformat(),
            "license": LICENSE,
            "row_count": len(hospitals),
            "emergency_hospital_count": sum(1 for h in hospitals if h["has_emergency"]),
            "active_count": sum(1 for h in hospitals if h["is_active"]),
        },
        "hospitals": hospitals,
    }

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_PATH.write_text(
        json.dumps(output, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    meta = output["metadata"]
    print(f"[fetch_hospitals] 輸出：{OUTPUT_PATH}")
    print(
        f"  總數：{meta['row_count']}，有急診：{meta['emergency_hospital_count']}，"
        f"仍有效：{meta['active_count']}"
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
