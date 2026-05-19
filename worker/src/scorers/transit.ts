/**
 * 交通便利評分
 *
 * OSM Overpass：
 *   - 1km 內 railway=station / station=subway（捷運/輕軌/火車）
 *   - 500m 內 highway=bus_stop（公車站）
 *
 * 算法：
 *   rail_pts    = min(60, 500m 內 rail × 60 + 500-1000m × 30)
 *   bus_pts     = min(40, 公車站 × 8)
 *   score       = rail_pts + bus_pts
 */
import { haversineKm } from "./healthcare";
import type { Coords, OverpassResponse, Transit } from "../types";

const OVERPASS_URL = "https://overpass-api.de/api/interpreter";
const RAIL_RADIUS_M = 1000;
const BUS_RADIUS_M = 500;

function buildQuery(lat: number, lng: number): string {
  return `[out:json][timeout:25];
(
  node["railway"="station"](around:${RAIL_RADIUS_M},${lat},${lng});
  node["public_transport"="station"](around:${RAIL_RADIUS_M},${lat},${lng});
  node["station"="subway"](around:${RAIL_RADIUS_M},${lat},${lng});
  node["highway"="bus_stop"](around:${BUS_RADIUS_M},${lat},${lng});
);
out tags center;`;
}

export async function scoreTransit(target: Coords): Promise<Transit> {
  const body = new URLSearchParams({ data: buildQuery(target.lat, target.lng) });
  const resp = await fetch(OVERPASS_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": "LiveSafe.tw/0.1 (https://livesafe.oharalab.com)",
      Accept: "application/json",
    },
    body: body.toString(),
    cf: { cacheTtl: 3600, cacheEverything: true },
  });
  if (!resp.ok) {
    throw new Error(`Overpass ${resp.status}: ${await resp.text()}`);
  }
  const data = (await resp.json()) as OverpassResponse;

  let railWithin500 = 0;
  let rail500to1000 = 0;
  let busWithin500 = 0;
  let nearestRailName: string | null = null;
  let nearestRailKm = Infinity;

  for (const el of data.elements) {
    const tags = el.tags ?? {};
    const lat = el.lat ?? el.center?.lat;
    const lng = el.lon ?? el.center?.lon;
    if (lat == null || lng == null) continue;
    const dKm = haversineKm(target, { lat, lng });
    const isRail =
      tags.railway === "station" ||
      tags.public_transport === "station" ||
      tags.station === "subway";
    const isBus = tags.highway === "bus_stop";
    if (isRail) {
      if (dKm < nearestRailKm) {
        nearestRailKm = dKm;
        nearestRailName = tags.name ?? tags["name:zh"] ?? null;
      }
      if (dKm <= 0.5) railWithin500++;
      else if (dKm <= 1) rail500to1000++;
    } else if (isBus && dKm <= 0.5) {
      busWithin500++;
    }
  }

  const railPts = Math.min(60, railWithin500 * 60 + rail500to1000 * 30);
  const busPts = Math.min(40, busWithin500 * 8);
  const score = Math.min(100, railPts + busPts);

  return {
    score,
    rail_within_500m: railWithin500,
    rail_500m_to_1km: rail500to1000,
    bus_stops_500m: busWithin500,
    nearest_rail: Number.isFinite(nearestRailKm)
      ? {
          name: nearestRailName,
          distance_km: Number(nearestRailKm.toFixed(2)),
        }
      : null,
  };
}
