/**
 * 學區 / 學校密度評分 — 純 in-memory spatial lookup (pre-processed OSM data)
 *
 * 來源：data-pipeline fetch_osm_pois.py 已用 OSM tag + 名稱啟發式分類為
 *   university / high / junior / primary / kindergarten / other
 *
 * 評分以 K-12 + 幼兒園 為核心（學區概念）：
 *   base = 30
 *   primary >= 1 → +25; primary >= 2 → +10
 *   junior  >= 1 → +20
 *   kindergarten >= 1 → +10
 *   K-12 >= 3 → +5
 */
import { haversineKm } from "./healthcare";
import type {
  Coords,
  OsmSchoolsDataset,
  Poi,
  SchoolDistrict,
  SchoolLevel,
} from "../types";

const RADIUS_KM = 1.0;
const MAX_POIS = 20;

const LEVEL_ZH: Record<SchoolLevel, string> = {
  university: "大學/學院",
  high: "高中職",
  junior: "國中",
  primary: "國小",
  kindergarten: "幼兒園",
  other: "其他學校",
};

function countScore(primary: number, junior: number, kindergarten: number): number {
  const k12 = primary + junior;
  let s = 30;
  if (primary >= 1) s += 25;
  if (primary >= 2) s += 10;
  if (junior >= 1) s += 20;
  if (kindergarten >= 1) s += 10;
  if (k12 >= 3) s += 5;
  return Math.min(100, s);
}

export function scoreSchool(
  target: Coords,
  dataset: OsmSchoolsDataset,
): SchoolDistrict {
  const counts: Record<SchoolLevel, number> = {
    university: 0,
    high: 0,
    junior: 0,
    primary: 0,
    kindergarten: 0,
    other: 0,
  };
  const pois: Poi[] = [];

  for (const s of dataset.schools) {
    const d = haversineKm(target, s);
    if (d > RADIUS_KM) continue;
    counts[s.level]++;
    pois.push({
      name: s.name ?? `(${s.level})`,
      lat: s.lat,
      lng: s.lng,
      distance_km: Number(d.toFixed(2)),
      category: s.level,
    });
  }

  pois.sort((a, b) => a.distance_km - b.distance_km);

  const score = countScore(counts.primary, counts.junior, counts.kindergarten);

  return {
    score,
    schools_within_1km: counts.primary + counts.junior + counts.high + counts.other,
    kindergartens_within_1km: counts.kindergarten,
    universities_within_1km: counts.university,
    high_schools_within_1km: counts.high,
    junior_schools_within_1km: counts.junior,
    primary_schools_within_1km: counts.primary,
    nearest_schools: pois
      .filter((p) => p.category === "primary" || p.category === "junior")
      .slice(0, 3)
      .map((p) => ({ name: p.name, distance_km: p.distance_km })),
    pois: pois.slice(0, MAX_POIS),
    level_labels: LEVEL_ZH,
    proxy_note:
      "本維度為「周邊學校密度」（1km 內）。不是各縣市教育局劃定的實際學區，但反映就學便利度。",
  };
}
