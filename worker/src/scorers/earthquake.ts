/**
 * 地震風險評分
 *
 * 兩個因子，score 越高越安全：
 *   1. 距最近活動斷層距離（point-to-polyline）
 *      < 0.5km → 5、0.5-1km → 25、1-3km → 50、3-5km → 75、> 5km → 95
 *   2. 近 5 年 5km 內 M >= 5.0 地震次數
 *      0 → 100、1 → 75、2 → 55、3-4 → 35、>= 5 → 15
 *   最終 score = round((fault_score + quake_score) / 2)
 */
import { haversineKm } from "./healthcare";
import type {
  ActiveFaultFeature,
  ActiveFaultsDataset,
  Coords,
  EarthquakeRisk,
  EarthquakesDataset,
} from "../types";

const QUAKE_WINDOW_YEARS = 5;
const QUAKE_RADIUS_KM = 5;
const QUAKE_MAG_THRESHOLD = 5.0;

const KM_PER_DEG_LAT = 111.32;

type Segment = { aLng: number; aLat: number; bLng: number; bLat: number };

function pushLineSegments(coords: number[][], segs: Segment[]): void {
  for (let i = 0; i < coords.length - 1; i++) {
    const a = coords[i]!;
    const b = coords[i + 1]!;
    segs.push({ aLng: a[0]!, aLat: a[1]!, bLng: b[0]!, bLat: b[1]! });
  }
}

function lineSegments(feature: ActiveFaultFeature): Segment[] {
  const g = feature.geometry;
  const segs: Segment[] = [];
  if (g.type === "LineString") {
    pushLineSegments(g.coordinates as number[][], segs);
  } else {
    const lines = g.coordinates as number[][][];
    for (const line of lines) {
      pushLineSegments(line, segs);
    }
  }
  return segs;
}

function pointToSegmentKm(
  p: Coords,
  aLng: number,
  aLat: number,
  bLng: number,
  bLat: number,
): number {
  // 以線段端點 a 為原點做等距方位平面投影（< 50km 範圍誤差 < 1%）
  const kLng = KM_PER_DEG_LAT * Math.cos((aLat * Math.PI) / 180);
  const ax = 0;
  const ay = 0;
  const bx = (bLng - aLng) * kLng;
  const by = (bLat - aLat) * KM_PER_DEG_LAT;
  const px = (p.lng - aLng) * kLng;
  const py = (p.lat - aLat) * KM_PER_DEG_LAT;
  const dx = bx - ax;
  const dy = by - ay;
  const len2 = dx * dx + dy * dy;
  let t = len2 > 0 ? ((px - ax) * dx + (py - ay) * dy) / len2 : 0;
  t = Math.max(0, Math.min(1, t));
  const cx = ax + t * dx;
  const cy = ay + t * dy;
  return Math.sqrt((px - cx) ** 2 + (py - cy) ** 2);
}

function nearestFaultKm(
  target: Coords,
  faults: ActiveFaultsDataset,
): { feature: ActiveFaultFeature; distance_km: number } | null {
  let best: { feature: ActiveFaultFeature; distance_km: number } | null = null;
  for (const f of faults.features) {
    for (const s of lineSegments(f)) {
      const d = pointToSegmentKm(target, s.aLng, s.aLat, s.bLng, s.bLat);
      if (!best || d < best.distance_km) {
        best = { feature: f, distance_km: d };
      }
    }
  }
  return best;
}

function faultScore(distKm: number): number {
  if (distKm < 0.5) return 5;
  if (distKm < 1) return 25;
  if (distKm < 3) return 50;
  if (distKm < 5) return 75;
  return 95;
}

function quakeCountScore(n: number): number {
  if (n === 0) return 100;
  if (n === 1) return 75;
  if (n === 2) return 55;
  if (n <= 4) return 35;
  return 15;
}

export function scoreEarthquake(
  target: Coords,
  quakes: EarthquakesDataset,
  faults: ActiveFaultsDataset,
): EarthquakeRisk {
  const nearest = nearestFaultKm(target, faults);

  const cutoff = Date.now() - QUAKE_WINDOW_YEARS * 365 * 24 * 3600 * 1000;
  let count = 0;
  let maxMag: number | null = null;
  for (const q of quakes.earthquakes) {
    if (q.magnitude < QUAKE_MAG_THRESHOLD) continue;
    const t = Date.parse(q.date);
    if (Number.isNaN(t) || t < cutoff) continue;
    const d = haversineKm(target, { lat: q.lat, lng: q.lng });
    if (d > QUAKE_RADIUS_KM) continue;
    count += 1;
    if (maxMag === null || q.magnitude > maxMag) maxMag = q.magnitude;
  }

  const fScore = nearest ? faultScore(nearest.distance_km) : 50;
  const qScore = quakeCountScore(count);
  const score = Math.round((fScore + qScore) / 2);

  return {
    score,
    nearest_fault: nearest
      ? {
          name: nearest.feature.properties.name ?? null,
          slip_type: nearest.feature.properties.slip_type ?? null,
          distance_km: Number(nearest.distance_km.toFixed(2)),
        }
      : null,
    recent_quakes_within_5km: count,
    max_magnitude_within_5km: maxMag,
    window_years: QUAKE_WINDOW_YEARS,
  };
}
