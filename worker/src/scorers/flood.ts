/**
 * 淹水風險（OSM 水域鄰近）— 輕量替代版
 *
 * 真正的淹水潛勢需要水利署 shapefile → PMTiles（規格 §6.3，工程量大）。
 * 此版用「距水體距離」做粗略代理，並於 UI 註明。
 *
 * 算法（距最近水體距離）：
 *   < 200m → 15
 *   200-500m → 40
 *   500m-1km → 70
 *   > 1km → 95
 *
 * 水體定義：natural=water、waterway=river/stream/canal
 */
import { haversineKm } from "./healthcare";
import type { Coords, FloodRisk, OverpassResponse } from "../types";

const OVERPASS_URL = "https://overpass-api.de/api/interpreter";
const RADIUS_M = 1500;

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

  for (const el of data.elements) {
    const tags = el.tags ?? {};
    const lat = el.lat ?? el.center?.lat;
    const lng = el.lon ?? el.center?.lon;
    if (lat == null || lng == null) continue;
    const dKm = haversineKm(target, { lat, lng });
    if (dKm < nearestKm) {
      nearestKm = dKm;
      nearestName = tags.name ?? tags["name:zh"] ?? null;
      nearestType =
        tags.waterway ?? (tags.natural === "water" ? "water" : null);
    }
  }

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
    proxy_note:
      "本維度為「距水體距離」粗略代理，非水利署淹水潛勢圖。",
  };
}
