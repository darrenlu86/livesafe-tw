/**
 * 學區 / 學校密度（OSM）— 輕量代理版
 *
 * 真正的「學區劃分」是各縣市教育局 CSV（哪戶屬於哪校），需逐縣市整合。
 * 此版用「1km 內學校密度」做粗略代理，並於 UI 註明。
 *
 * 算法：
 *   schoolCount within 1km
 *     0 → 40    1 → 65    2 → 80    >=3 → 95
 */
import { haversineKm } from "./healthcare";
import type { Coords, OverpassResponse, SchoolDistrict } from "../types";

const OVERPASS_URL = "https://overpass-api.de/api/interpreter";
const RADIUS_M = 1000;

function buildQuery(lat: number, lng: number): string {
  return `[out:json][timeout:25];
(
  node["amenity"="school"](around:${RADIUS_M},${lat},${lng});
  way["amenity"="school"](around:${RADIUS_M},${lat},${lng});
  node["amenity"="kindergarten"](around:${RADIUS_M},${lat},${lng});
  way["amenity"="kindergarten"](around:${RADIUS_M},${lat},${lng});
);
out tags center;`;
}

function countScore(n: number): number {
  if (n === 0) return 40;
  if (n === 1) return 65;
  if (n === 2) return 80;
  return 95;
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

  let schools = 0;
  let kindergartens = 0;
  const nearestSchools: Array<{ name: string; distance_km: number }> = [];

  for (const el of data.elements) {
    const tags = el.tags ?? {};
    const lat = el.lat ?? el.center?.lat;
    const lng = el.lon ?? el.center?.lon;
    if (lat == null || lng == null) continue;
    const dKm = haversineKm(target, { lat, lng });
    const name = tags.name ?? tags["name:zh"];
    if (tags.amenity === "school") {
      schools++;
      if (name) nearestSchools.push({ name, distance_km: dKm });
    } else if (tags.amenity === "kindergarten") {
      kindergartens++;
    }
  }

  nearestSchools.sort((a, b) => a.distance_km - b.distance_km);

  return {
    score: countScore(schools),
    schools_within_1km: schools,
    kindergartens_within_1km: kindergartens,
    nearest_schools: nearestSchools.slice(0, 3).map((s) => ({
      name: s.name,
      distance_km: Number(s.distance_km.toFixed(2)),
    })),
    proxy_note:
      "本維度為「學校密度」代理，非實際學區劃分；國中小學區需各縣市教育局公開資料逐筆整合。",
  };
}
