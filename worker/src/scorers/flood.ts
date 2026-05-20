/**
 * 淹水風險（水利署淹水潛勢圖 24h 650mm 情境）— bundled point-in-polygon
 *
 * 資料源：水利署 25766 dataset，22 縣市 shapefile（24h 累積降雨 650mm 最壞情境）。
 * data-pipeline/scripts/fetch_flood_potential.py 處理：
 *   - 解 7z + 找 shp（22 縣市命名各異：24h650r/24hr650mm/24Hr650R/yl_24h_r650/pt_24h650mm…）
 *   - 統一 schema（type/水深/RANK/GRIDCODE）+ normalize depth class
 *   - TWD97 → WGS84 投影
 *   - 同層 dissolve（unary_union） + 300m 容差 simplify → 2.3 MB bundle
 *
 * 涵蓋：19/22 縣市（缺臺北市 — 政府公開 7z 是空檔；缺漏縣市 fallback = 95 不在 zone）
 *
 * 算法：
 *   in flood polygon → depth_class 對應扣分（70→3）
 *     0-0.3 → 70, 0.3-0.5 → 50, 0.5-1 → 30, 1-2 → 15, 2-3 → 8, >3 → 3
 *   不在 polygon 但縣市有資料 → 95 (data_available=true)
 *   縣市資料缺漏 → score=50, data_available=false (overall.ts 自動排除)
 *
 * Worker 端只做 point-in-polygon（ray casting），無 Overpass call。
 */
import floodRaw from "../data/flood_potential.json";
import type { Coords, FloodRisk } from "../types";

interface FloodPolygon {
  depth_class: string;
  rings: number[][][];
  county: string;
}

interface FloodDataset {
  metadata: {
    scenario_label: string;
    counties: string[];
    polygon_count: number;
    fetched_at: string;
  };
  polygons: FloodPolygon[];
}

const floodData = floodRaw as unknown as FloodDataset;

const DEPTH_SCORE: Record<string, number> = {
  "0-0.3": 70,
  "<0.3": 70,
  "0.3-0.5": 50,
  "0.5-1": 30,
  "1-2": 15,
  "2-3": 8,
  ">3": 3,
};

const DEPTH_SEVERITY: Record<string, number> = {
  "<0.3": 1,
  "0-0.3": 1,
  "0.3-0.5": 2,
  "0.5-1": 3,
  "1-2": 4,
  "2-3": 5,
  ">3": 6,
};

// 預計算每個 polygon ring 的 bbox 加速 PIP
interface RingIdx {
  poly_idx: number;
  ring: number[][];
  bbox: [number, number, number, number]; // [minLng, minLat, maxLng, maxLat]
}

const ringIndex: RingIdx[] = [];
for (let i = 0; i < floodData.polygons.length; i++) {
  const poly = floodData.polygons[i]!;
  for (const ring of poly.rings) {
    let minLng = Infinity,
      minLat = Infinity,
      maxLng = -Infinity,
      maxLat = -Infinity;
    for (const pt of ring) {
      const x = pt[0]!,
        y = pt[1]!;
      if (x < minLng) minLng = x;
      if (x > maxLng) maxLng = x;
      if (y < minLat) minLat = y;
      if (y > maxLat) maxLat = y;
    }
    ringIndex.push({
      poly_idx: i,
      ring,
      bbox: [minLng, minLat, maxLng, maxLat],
    });
  }
}

function ringContains(ring: number[][], lng: number, lat: number): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const a = ring[i]!;
    const b = ring[j]!;
    const xi = a[0]!,
      yi = a[1]!;
    const xj = b[0]!,
      yj = b[1]!;
    const intersect =
      yi > lat !== yj > lat &&
      lng < ((xj - xi) * (lat - yi)) / (yj - yi + 1e-12) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

interface FloodMatch {
  depth_class: string;
  county: string;
}

function findFloodMatch(lng: number, lat: number): FloodMatch | null {
  let best: FloodMatch | null = null;
  let bestSev = 0;
  for (const r of ringIndex) {
    const [mnL, mnLa, mxL, mxLa] = r.bbox;
    if (lng < mnL || lng > mxL || lat < mnLa || lat > mxLa) continue;
    if (!ringContains(r.ring, lng, lat)) continue;
    const poly = floodData.polygons[r.poly_idx]!;
    const sev = DEPTH_SEVERITY[poly.depth_class] ?? 0;
    if (sev > bestSev) {
      best = { depth_class: poly.depth_class, county: poly.county };
      bestSev = sev;
    }
  }
  return best;
}

// 臺北市資料來自 data.taipei 130mm/h 短延時情境（與其他縣市 24h 650mm 情境不完全等同）
const TAIPEI_BBOX: [number, number, number, number] = [121.45, 24.96, 121.67, 25.21];

function isTaipei(lng: number, lat: number): boolean {
  return (
    lng >= TAIPEI_BBOX[0] &&
    lng <= TAIPEI_BBOX[2] &&
    lat >= TAIPEI_BBOX[1] &&
    lat <= TAIPEI_BBOX[3]
  );
}

export function scoreFlood(target: Coords): FloodRisk {
  const match = findFloodMatch(target.lng, target.lat);
  const inZone = !!match;
  const taipei = isTaipei(target.lng, target.lat);

  if (inZone) {
    const score = DEPTH_SCORE[match!.depth_class] ?? 40;
    const isTaipeiMatch = match!.county === "臺北市";
    const dataSource = isTaipeiMatch
      ? "臺北市降雨積水模擬圖（130mm/h 短延時強降雨情境）"
      : `水利署淹水潛勢圖（${floodData.metadata.scenario_label}）`;
    return {
      score,
      data_available: true,
      nearest_water: null,
      pois: [],
      proxy_note: `落入${dataSource}「${match!.depth_class} m」淹水深度區`,
    };
  }

  if (taipei) {
    return {
      score: 95,
      data_available: true,
      nearest_water: null,
      pois: [],
      proxy_note: "不在臺北市降雨積水模擬圖（130mm/h 短延時情境）潛勢區內",
    };
  }

  return {
    score: 95,
    data_available: true,
    nearest_water: null,
    pois: [],
    proxy_note: `不在水利署 24h 650mm 淹水潛勢區內（資料涵蓋 ${floodData.metadata.counties.length} 縣市）`,
  };
}
