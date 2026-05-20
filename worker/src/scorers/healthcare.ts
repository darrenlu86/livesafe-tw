/**
 * 醫療可近性評分 — 使用 pre-process 合併好的 hospitals_merged.json
 *
 * 來源：NHI 急救責任醫院 + OSM 醫院（含醫學中心識別），於 data-pipeline 階段合併去重。
 * Worker 端只做 5km 內 haversine 過濾與排序。
 *
 * 算法：
 *   base      = min(70, 5km 內醫院總數 × 12)
 *   proximity = max(0, 30 - 最近醫院距離(km) × 3)
 *   medical_center_bonus = +5 per 5km 內醫學中心, cap +15
 *   score     = round(min(100, base + proximity + bonus))
 *
 * 5km 內 0 家 → score 0 + 「無大型醫療機構」note（不硬列遠處醫院）。
 */
import type {
  Coords,
  HealthcareAccess,
  HospitalPoi,
  MergedHospital,
  MergedHospitalsDataset,
} from "../types";

const EARTH_RADIUS_KM = 6371;
const SEARCH_RADIUS_KM = 5;
const MAX_HOSPITALS_RETURNED = 8;

export function haversineKm(a: Coords, b: Coords): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(x));
}

export function scoreHealthcare(
  target: Coords,
  dataset: MergedHospitalsDataset,
): HealthcareAccess {
  const withDist: HospitalPoi[] = dataset.hospitals
    .map((h: MergedHospital) => ({
      name: h.name,
      lat: h.lat,
      lng: h.lng,
      distance_km: Number(haversineKm(target, h).toFixed(2)),
      source: h.source,
      has_emergency: h.has_emergency,
      is_medical_center: h.is_medical_center,
    }))
    .filter((h) => h.distance_km <= SEARCH_RADIUS_KM)
    .sort((a, b) => a.distance_km - b.distance_km);

  const total = withDist.length;
  const emergencyCount = withDist.filter((h) => h.has_emergency).length;
  const mcCount = withDist.filter((h) => h.is_medical_center).length;
  const nearest = withDist[0] ?? null;

  if (total === 0) {
    return {
      score: 0,
      total_hospitals_within_5km: 0,
      emergency_hospitals_within_5km: 0,
      medical_centers_within_5km: 0,
      nearest: null,
      hospitals: [],
      note: "5km 內查無大型醫療機構（NHI + OSM 合併資料庫均無）",
    };
  }

  const base = Math.min(70, total * 12);
  const proximity = nearest ? Math.max(0, 30 - nearest.distance_km * 3) : 0;
  const mcBonus = Math.min(15, mcCount * 5);
  const score = Math.round(Math.min(100, base + proximity + mcBonus));

  return {
    score,
    total_hospitals_within_5km: total,
    emergency_hospitals_within_5km: emergencyCount,
    medical_centers_within_5km: mcCount,
    nearest,
    hospitals: withDist.slice(0, MAX_HOSPITALS_RETURNED),
  };
}
