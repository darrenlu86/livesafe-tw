/**
 * 醫療可近性評分
 *
 * 算法：
 *   base      = min(70, 5km 內急救醫院數 × 20)
 *   proximity = max(0, 30 - 最近急救醫院距離(km) × 3)   // 1km≈27，10km→0
 *   score     = round(min(100, base + proximity))
 */
import type {
  Coords,
  HealthcareAccess,
  HospitalRecord,
  HospitalsDataset,
} from "../types";

const EARTH_RADIUS_KM = 6371;

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
  dataset: HospitalsDataset,
): HealthcareAccess {
  const emergencyHospitals = dataset.hospitals.filter(
    (h): h is HospitalRecord & { lat: number; lng: number } =>
      h.has_emergency && h.is_active && h.lat !== null && h.lng !== null,
  );

  const withDistance = emergencyHospitals.map((h) => ({
    hospital: h,
    distance_km: haversineKm(target, { lat: h.lat, lng: h.lng }),
  }));

  const within5km = withDistance.filter((x) => x.distance_km <= 5);
  withDistance.sort((a, b) => a.distance_km - b.distance_km);
  const nearest = withDistance[0];

  const base = Math.min(70, within5km.length * 20);
  const proximity = nearest ? Math.max(0, 30 - nearest.distance_km * 3) : 0;
  const score = Math.round(Math.min(100, base + proximity));

  const unresolved =
    dataset.metadata.emergency_hospital_count - emergencyHospitals.length;

  return {
    score,
    emergency_hospitals_within_5km: within5km.length,
    nearest_emergency: nearest
      ? {
          name: nearest.hospital.name,
          distance_km: Number(nearest.distance_km.toFixed(2)),
        }
      : null,
    note:
      unresolved > 0
        ? `部分急救醫院地址解析失敗未納入計算（${unresolved} 筆）`
        : undefined,
  };
}
