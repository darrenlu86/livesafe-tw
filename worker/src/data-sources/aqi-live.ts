/**
 * Live AQI fetcher — 從環境部 MOENV 即時抓 AQI CSV，解析為 AqiDataset。
 *
 * 用 fetch + cf.cacheTtl=3600 → Cloudflare edge cache 1 小時。
 * 不再依賴 bundled aqi.json（會過期）。
 */
import type { AqiDataset, AqiStation } from "../types";

const MOENV_API_KEY = "4c89a32a-a214-461b-bf29-30ff32a61a8a"; // 公開 key (data.gov.tw dataset 40448 metadata)
const SOURCE_URL =
  `https://data.moenv.gov.tw/api/v2/aqx_p_432?api_key=${MOENV_API_KEY}&limit=1000&format=CSV`;

const CSV_HEADERS_EXPECTED = [
  "sitename",
  "county",
  "aqi",
  "pollutant",
  "status",
  "so2",
  "co",
  "o3",
  "o3_8hr",
  "pm10",
  "pm2.5",
  "no2",
  "nox",
  "no",
  "wind_speed",
  "wind_direc",
  "publishtime",
  "co_8hr",
  "pm2.5_avg",
  "pm10_avg",
  "so2_avg",
  "longitude",
  "latitude",
  "siteid",
];

function parseCsv(text: string): string[][] {
  // MOENV CSV is well-behaved (no embedded commas), simple split is enough
  return text
    .split(/\r?\n/)
    .filter((line) => line.length > 0)
    .map((line) => line.split(","));
}

function toFloat(s: string): number | null {
  const t = (s ?? "").trim();
  if (!t || t === "-" || t === "ND" || t === "*") return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

function toInt(s: string): number | null {
  const f = toFloat(s);
  return f == null ? null : Math.round(f);
}

function unquote(s: string): string {
  const t = s.trim();
  if (t.length >= 2 && t.startsWith('"') && t.endsWith('"')) {
    return t.slice(1, -1);
  }
  return t;
}

function rowToStation(headers: string[], row: string[]): AqiStation | null {
  const get = (k: string): string => {
    const i = headers.indexOf(k);
    return i >= 0 && i < row.length ? unquote(row[i] ?? "") : "";
  };
  const lat = toFloat(get("latitude"));
  const lng = toFloat(get("longitude"));
  if (lat == null || lng == null) return null;
  const siteid = get("siteid").trim();
  if (!siteid) return null;
  return {
    siteid,
    name: get("sitename").trim(),
    county: get("county").trim(),
    lat,
    lng,
    aqi: toInt(get("aqi")),
    status: get("status").trim(),
    pollutant: get("pollutant").trim(),
    pm25: toFloat(get("pm2.5")),
    pm25_avg: toFloat(get("pm2.5_avg")),
    pm10: toFloat(get("pm10")),
    o3_8hr: toFloat(get("o3_8hr")),
    publishtime: get("publishtime").trim(),
  };
}

let memCache: { at: number; data: AqiDataset } | null = null;
const MEM_CACHE_MS = 5 * 60 * 1000; // 5 分鐘 in-isolate cache，減少同 isolate 重複呼叫

export async function getLiveAqiDataset(): Promise<AqiDataset> {
  const now = Date.now();
  if (memCache && now - memCache.at < MEM_CACHE_MS) {
    return memCache.data;
  }

  const resp = await fetch(SOURCE_URL, {
    cf: { cacheTtl: 3600, cacheEverything: true },
  });
  if (!resp.ok) {
    throw new Error(`MOENV ${resp.status}: ${await resp.text()}`);
  }
  const text = await resp.text();
  if (text.includes("因受限於資源分配") || (text.includes("api_key") && text.includes("不存在"))) {
    throw new Error(`MOENV API rejected: ${text.slice(0, 120)}`);
  }

  const rows = parseCsv(text);
  if (rows.length < 2) throw new Error("MOENV CSV empty");
  const headers = (rows[0] ?? []).map((h) => h.trim());
  const stations: AqiStation[] = [];
  const publishTimes = new Set<string>();
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row) continue;
    const s = rowToStation(headers, row);
    if (s) {
      stations.push(s);
      if (s.publishtime) publishTimes.add(s.publishtime);
    }
  }

  const aqis = stations.map((s) => s.aqi).filter((a): a is number => a != null);
  const dataset: AqiDataset = {
    metadata: {
      source: SOURCE_URL,
      source_human: "https://data.gov.tw/dataset/40448",
      fetched_at: new Date().toISOString(),
      license: "政府資料開放授權條款-第 1 版",
      station_count: stations.length,
      station_with_aqi: aqis.length,
      aqi_min: aqis.length > 0 ? Math.min(...aqis) : null,
      aqi_max: aqis.length > 0 ? Math.max(...aqis) : null,
      publish_times: Array.from(publishTimes).sort(),
    },
    stations,
  };

  memCache = { at: now, data: dataset };
  return dataset;
}
