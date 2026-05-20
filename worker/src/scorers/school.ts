/**
 * 學區 / 學校密度（OSM 代理）— 按學制分類
 *
 * 分類：大學 / 高中 / 國中 / 國小 / 幼兒園
 * 用 OSM tag（amenity, isced:level, school:type）+ 名稱關鍵字 fallback。
 *
 * 評分以「國中小 + 幼兒園」為主（學區核心）；大學/高中 顯示但不算進 K-12 計分。
 */
import { haversineKm } from "./healthcare";
import type {
  Coords,
  OverpassResponse,
  Poi,
  SchoolDistrict,
} from "../types";

const OVERPASS_URL = "https://overpass-api.de/api/interpreter";
const RADIUS_M = 1500;
const MAX_POIS = 20;

type SchoolLevel = "university" | "high" | "junior" | "primary" | "kindergarten" | "other";

function buildQuery(lat: number, lng: number): string {
  return `[out:json][timeout:25];
(
  node["amenity"="school"](around:${RADIUS_M},${lat},${lng});
  way["amenity"="school"](around:${RADIUS_M},${lat},${lng});
  node["amenity"="university"](around:${RADIUS_M},${lat},${lng});
  way["amenity"="university"](around:${RADIUS_M},${lat},${lng});
  node["amenity"="college"](around:${RADIUS_M},${lat},${lng});
  way["amenity"="college"](around:${RADIUS_M},${lat},${lng});
  node["amenity"="kindergarten"](around:${RADIUS_M},${lat},${lng});
  way["amenity"="kindergarten"](around:${RADIUS_M},${lat},${lng});
);
out tags center;`;
}

function classify(tags: Record<string, string>): SchoolLevel {
  const amenity = tags.amenity;
  if (amenity === "kindergarten") return "kindergarten";
  if (amenity === "university" || amenity === "college") return "university";
  const isced = tags["isced:level"] ?? "";
  if (isced.includes("0")) return "kindergarten";
  if (isced.includes("1")) return "primary";
  if (isced.includes("2") && !isced.includes("3")) return "junior";
  if (isced.includes("3")) return "high";
  const schoolType = (tags["school:type"] ?? "") + (tags.school ?? "");
  if (/高中|高工|高商|高職|完中|senior/i.test(schoolType)) return "high";
  if (/國中|junior_high|middle/i.test(schoolType)) return "junior";
  if (/國小|primary|elementary|實小/i.test(schoolType)) return "primary";
  const name = (tags.name ?? "") + (tags["name:zh"] ?? "");
  if (/大學|學院|University|College/i.test(name)) return "university";
  if (/高中|高工|高商|高職|完中/.test(name)) return "high";
  if (/國中|中學/.test(name)) return "junior";
  if (/國小|國民小學|實小|附小/.test(name)) return "primary";
  if (/幼稚園|幼兒園|kindergarten/i.test(name)) return "kindergarten";
  return "other";
}

const LEVEL_ZH: Record<SchoolLevel, string> = {
  university: "大學/學院",
  high: "高中職",
  junior: "國中",
  primary: "國小",
  kindergarten: "幼兒園",
  other: "其他學校",
};

function countScore(primary: number, junior: number, kindergarten: number): number {
  // K-12 + 幼兒園 是學區核心
  const k12 = primary + junior;
  let s = 30;
  if (primary >= 1) s += 25;
  if (primary >= 2) s += 10;
  if (junior >= 1) s += 20;
  if (kindergarten >= 1) s += 10;
  if (k12 >= 3) s += 5;
  return Math.min(100, s);
}

export async function scoreSchool(target: Coords): Promise<SchoolDistrict> {
  const body = new URLSearchParams({ data: buildQuery(target.lat, target.lng) });
  const resp = await fetch(OVERPASS_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": "LiveSafe.tw/0.1 (https://livesafe.oharalab.com)",
      Accept: "application/json",
    },
    body: body.toString(),
    cf: { cacheTtl: 86400, cacheEverything: true },
  });
  if (!resp.ok) throw new Error(`Overpass ${resp.status}`);
  const data = (await resp.json()) as OverpassResponse;

  const counts: Record<SchoolLevel, number> = {
    university: 0,
    high: 0,
    junior: 0,
    primary: 0,
    kindergarten: 0,
    other: 0,
  };
  const pois: Poi[] = [];
  const seen = new Set<string>();

  for (const el of data.elements) {
    const tags = (el.tags ?? {}) as Record<string, string>;
    const lat = el.lat ?? el.center?.lat;
    const lng = el.lon ?? el.center?.lon;
    if (lat == null || lng == null) continue;
    const dKm = haversineKm(target, { lat, lng });
    if (dKm > 1) continue; // 1km 內為「學區」可步行範圍
    const name = tags.name ?? tags["name:zh"];
    if (!name) continue;
    // dedupe by name + ~50m proximity
    const key = `${name}|${lat.toFixed(3)},${lng.toFixed(3)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const level = classify(tags);
    counts[level]++;
    pois.push({
      name,
      lat,
      lng,
      distance_km: Number(dKm.toFixed(2)),
      category: level,
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
      "本維度為「周邊學校密度」（1km 內）。不是各縣市教育局劃定的「實際學區」，但反映就學便利度。",
  };
}
