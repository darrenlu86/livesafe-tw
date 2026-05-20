/**
 * 淹水風險（OSM 水域鄰近代理）
 */
import { haversineKm } from "./healthcare";
import type { Coords, FloodRisk, OverpassResponse, Poi } from "../types";

const OVERPASS_URL = "https://overpass-api.de/api/interpreter";
const RADIUS_M = 1500;
const MAX_POIS = 8;

function buildQuery(lat: number, lng: number): string {
  return `[out:json][timeout:25];
(
  node["natural"="water"](around:${RADIUS_M},${lat},${lng});
  way["natural"="water"](around:${RADIUS_M},${lat},${lng});
  way["waterway"="river"](around:${RADIUS_M},${lat},${lng});
  way["waterway"="stream"](around:${RADIUS_M},${lat},${lng});
  way["waterway"="canal"](around:${RADIUS_M},${lat},${lng});
);
out tags center;`;
}

function distanceScore(km: number): number {
  if (km < 0.2) return 15;
  if (km < 0.5) return 40;
  if (km < 1) return 70;
  return 95;
}

export async function scoreFlood(target: Coords): Promise<FloodRisk> {
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

  let nearestKm = Infinity;
  let nearestName: string | null = null;
  let nearestType: string | null = null;
  const pois: Poi[] = [];

  for (const el of data.elements) {
    const tags = el.tags ?? {};
    const lat = el.lat ?? el.center?.lat;
    const lng = el.lon ?? el.center?.lon;
    if (lat == null || lng == null) continue;
    const dKm = haversineKm(target, { lat, lng });
    const t = tags.waterway ?? (tags.natural === "water" ? "water" : null);
    const name = tags.name ?? tags["name:zh"] ?? null;
    if (dKm < nearestKm) {
      nearestKm = dKm;
      nearestName = name;
      nearestType = t;
    }
    pois.push({
      name: name ?? `(${t ?? "water"})`,
      lat,
      lng,
      distance_km: Number(dKm.toFixed(2)),
      category: t ?? "water",
    });
  }

  pois.sort((a, b) => a.distance_km - b.distance_km);

  const hasNearby = Number.isFinite(nearestKm);
  const score = hasNearby ? distanceScore(nearestKm) : 95;

  return {
    score,
    nearest_water: hasNearby
      ? {
          name: nearestName,
          type: nearestType,
          distance_km: Number(nearestKm.toFixed(2)),
        }
      : null,
    pois: pois.slice(0, MAX_POIS),
    proxy_note:
      "本維度為「距水體距離」粗略代理，非水利署淹水潛勢圖。",
  };
}
