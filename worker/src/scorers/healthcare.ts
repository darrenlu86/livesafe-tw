/**
 * 醫療可近性評分（NHI 健保 + OSM 補強）
 *
 * 兩個資料源：
 *  - NHI（健保署「特約醫事機構-地區醫院」清冊）：371 筆，含急救標記
 *  - OSM（amenity=hospital）：391 筆，含醫學中心級本院（健保 dataset 缺漏的）
 *
 * 合併規則：
 *  - 兩源以 (lat 0.0005, lng 0.0005) 精度去重，NHI 優先（有 emergency 標記）
 *  - 評分以「合併後 5km 內所有醫院」為基礎
 *
 * 算法（score 越高 = 越好）：
 *   base      = min(70, 5km 內醫院總數 × 12)
 *   proximity = max(0, 30 - 最近醫院距離(km) × 3)
 *   medical_center_bonus = +5 per medical center within 5km, cap +15
 *   score     = round(min(100, base + proximity + bonus))
 *
 * 5km 內 0 家醫院 → 顯式回 0 分 + note，避免在無資料區硬列遠處醫院。
 */
import type {
  Coords,
  HealthcareAccess,
  HospitalPoi,
  HospitalRecord,
  HospitalsDataset,
  OsmHospital,
  OsmHospitalsDataset,
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

interface RawHospital {
  name: string;
  lat: number;
  lng: number;
  source: "nhi" | "osm";
  has_emergency: boolean;
  is_medical_center: boolean;
}

function nhiToRaw(h: HospitalRecord): RawHospital | null {
  if (h.lat == null || h.lng == null || !h.is_active) return null;
  return {
    name: h.name,
    lat: h.lat,
    lng: h.lng,
    source: "nhi",
    has_emergency: h.has_emergency,
    is_medical_center: false,
  };
}

function osmToRaw(h: OsmHospital): RawHospital {
  return {
    name: h.name,
    lat: h.lat,
    lng: h.lng,
    source: "osm",
    has_emergency: h.has_emergency_tag,
    is_medical_center: h.is_medical_center,
  };
}

function dedupeKey(h: RawHospital): string {
  return `${h.lat.toFixed(3)},${h.lng.toFixed(3)}`;
}

export function scoreHealthcare(
  target: Coords,
  nhiDataset: HospitalsDataset,
  osmDataset: OsmHospitalsDataset,
): HealthcareAccess {
  // 合併 NHI + OSM，NHI 優先 (含 emergency 標記)
  const merged = new Map<string, RawHospital>();
  for (const h of nhiDataset.hospitals) {
    const raw = nhiToRaw(h);
    if (raw) merged.set(dedupeKey(raw), raw);
  }
  for (const h of osmDataset.hospitals) {
    const raw = osmToRaw(h);
    const k = dedupeKey(raw);
    const existing = merged.get(k);
    if (!existing) {
      merged.set(k, raw);
    } else if (h.is_medical_center) {
      // OSM 識別為醫學中心 → 把 NHI record 標 is_medical_center
      existing.is_medical_center = true;
    }
  }

  const all = Array.from(merged.values());
  const withDist: HospitalPoi[] = all
    .map((h) => ({
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
      note: "5km 內查無大型醫療機構（NHI 急救責任醫院 + OSM 標記醫院皆 0 筆）",
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
