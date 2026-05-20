/**
 * 坊地災害評分 — 水保局土石流潛勢溪流（111 年度 1729 條）
 *
 * 資料源：data.gov.tw 147916 (農業部水土保持署)
 * 1729 條 polyline (TWD97 → WGS84)，含 Risk 等級「高/中/低/持續觀察」
 *
 * 算法（距最近土石流溪流距離）：
 *   < 0.1km → 30  (極近，高風險)
 *   0.1-0.5km → 55
 *   0.5-1km → 80
 *   > 1km → 95
 * 1km 內高風險溪流 each -5, cap -15
 */
import { haversineKm } from "./healthcare";
import type { Coords, LandslideRisk } from "../types";

import landslideRaw from "../data/landslide_streams.json";

interface Stream {
  id: string;
  name: string;
  county: string;
  town: string;
  risk: string;
  coords: number[][]; // [[lng, lat], ...]
}

interface LandslideDataset {
  metadata: { source: string; scenario: string; count: number };
  streams: Stream[];
}

const data = landslideRaw as unknown as LandslideDataset;

// 預計算每條 stream 的 bbox + 中心點 加速距離過濾
interface StreamIdx {
  stream: Stream;
  bbox: [number, number, number, number]; // [minLng, minLat, maxLng, maxLat]
  centroid: [number, number];
}

const streamIndex: StreamIdx[] = data.streams.map((s) => {
  let minLng = Infinity, minLat = Infinity, maxLng = -Infinity, maxLat = -Infinity;
  let sumLng = 0, sumLat = 0, n = 0;
  for (const pt of s.coords) {
    const x = pt[0]!, y = pt[1]!;
    if (x < minLng) minLng = x;
    if (x > maxLng) maxLng = x;
    if (y < minLat) minLat = y;
    if (y > maxLat) maxLat = y;
    sumLng += x; sumLat += y; n++;
  }
  return {
    stream: s,
    bbox: [minLng, minLat, maxLng, maxLat],
    centroid: [sumLng / n, sumLat / n],
  };
});

const KM_PER_DEG_LAT = 111.32;

// point-to-segment distance (approx, equirectangular near reference lat)
function pointToSegmentKm(
  pLat: number, pLng: number,
  aLng: number, aLat: number,
  bLng: number, bLat: number,
): number {
  const kLng = KM_PER_DEG_LAT * Math.cos((aLat * Math.PI) / 180);
  const ax = 0, ay = 0;
  const bx = (bLng - aLng) * kLng;
  const by = (bLat - aLat) * KM_PER_DEG_LAT;
  const px = (pLng - aLng) * kLng;
  const py = (pLat - aLat) * KM_PER_DEG_LAT;
  const dx = bx - ax, dy = by - ay;
  const len2 = dx * dx + dy * dy;
  let t = len2 > 0 ? ((px - ax) * dx + (py - ay) * dy) / len2 : 0;
  t = Math.max(0, Math.min(1, t));
  const cx = ax + t * dx, cy = ay + t * dy;
  return Math.sqrt((px - cx) ** 2 + (py - cy) ** 2);
}

function distanceToStream(target: Coords, stream: Stream): number {
  let minDist = Infinity;
  for (let i = 0; i < stream.coords.length - 1; i++) {
    const a = stream.coords[i]!;
    const b = stream.coords[i + 1]!;
    const d = pointToSegmentKm(target.lat, target.lng, a[0]!, a[1]!, b[0]!, b[1]!);
    if (d < minDist) minDist = d;
  }
  return minDist;
}

function distanceScore(km: number): number {
  if (km < 0.1) return 20;
  if (km < 0.3) return 40;
  if (km < 0.5) return 55;
  if (km < 1) return 70;
  if (km < 2) return 82;
  if (km < 3) return 90;
  return 95;
}

export function scoreLandslide(target: Coords): LandslideRisk {
  let nearestKm = Infinity;
  let nearestStream: Stream | null = null;
  let within1km = 0;
  let highWithin1km = 0;

  // 用 3km 預過濾（評分極端到 3km）
  const PREFILTER_KM = 3;
  const lngMargin = PREFILTER_KM / (KM_PER_DEG_LAT * Math.cos((target.lat * Math.PI) / 180));
  const latMargin = PREFILTER_KM / KM_PER_DEG_LAT;
  for (const idx of streamIndex) {
    const bb = idx.bbox;
    if (
      target.lng < bb[0] - lngMargin ||
      target.lng > bb[2] + lngMargin ||
      target.lat < bb[1] - latMargin ||
      target.lat > bb[3] + latMargin
    ) {
      continue;
    }
    const dKm = distanceToStream(target, idx.stream);
    if (dKm < nearestKm) {
      nearestKm = dKm;
      nearestStream = idx.stream;
    }
    if (dKm <= 1) {
      within1km++;
      if (idx.stream.risk === "高") highWithin1km++;
    }
  }

  const hasNearby = Number.isFinite(nearestKm);
  let score = hasNearby ? distanceScore(nearestKm) : 95;
  // 1km 內高風險溪流扣分
  score -= Math.min(15, highWithin1km * 5);
  score = Math.max(0, Math.min(100, score));

  return {
    score,
    nearest_stream: nearestStream
      ? {
          name: nearestStream.name,
          risk: nearestStream.risk,
          county: nearestStream.county,
          town: nearestStream.town,
          distance_km: Number(nearestKm.toFixed(2)),
        }
      : null,
    streams_within_1km: within1km,
    high_risk_within_1km: highWithin1km,
    proxy_note: "資料源：水保局 111 年度 1729 條土石流潛勢溪流。距溪流近 + 高風險等級扣分。",
  };
}
