/**
 * 交通便利評分
 *
 * OSM Overpass：
 *   - 1km 內 railway/subway 站
 *   - 500m 內公車站
 * 回傳 score + POI list。
 */
import { haversineKm } from "./healthcare";
import type { Coords, OverpassResponse, Poi, Transit } from "../types";

const OVERPASS_URL = "https://overpass-api.de/api/interpreter";
const RAIL_RADIUS_M = 1000;
const BUS_RADIUS_M = 500;
const MAX_POIS = 25;

function buildQuery(lat: number, lng: number): string {
  // 捷運/火車站採嚴格 tag：railway=station + station=subway/light_rail
  // 排除 public_transport=station 因含過多管理中心/機廠/客運站營業所噪音
  return `[out:json][timeout:25];
(
  node["railway"="station"](around:${RAIL_RADIUS_M},${lat},${lng});
  node["railway"="halt"](around:${RAIL_RADIUS_M},${lat},${lng});
  node["station"="subway"](around:${RAIL_RADIUS_M},${lat},${lng});
  node["station"="light_rail"](around:${RAIL_RADIUS_M},${lat},${lng});
  node["highway"="bus_stop"](around:${BUS_RADIUS_M},${lat},${lng});
);
out tags center;`;
}

// 名稱噪音過濾：機廠、管理中心、工程段、辦公室、停車場、營業所 等非實際車站
const RAIL_NAME_NOISE = [
  "機廠",
  "管理中心",
  "工程段",
  "工務段",
  "辦公",
  "事務所",
  "停車場",
  "養路",
  "維修",
  "服務中心",
  "服務區",
  "派出所",
  "派遣所",
  "客運站營業所",
  "客運服務站",
  "監理",
  "工區",
  "分局",
  "段",
];

function isNoisyRailName(name: string | null | undefined): boolean {
  if (!name) return false;
  return RAIL_NAME_NOISE.some((kw) => name.includes(kw));
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
  const pois: Poi[] = [];

  for (const el of data.elements) {
    const tags = el.tags ?? {};
    const lat = el.lat ?? el.center?.lat;
    const lng = el.lon ?? el.center?.lon;
    if (lat == null || lng == null) continue;
    const dKm = haversineKm(target, { lat, lng });
    const isRail =
      tags.railway === "station" ||
      tags.railway === "halt" ||
      tags.station === "subway" ||
      tags.station === "light_rail";
    const isBus = tags.highway === "bus_stop";
    const rawName = tags.name ?? tags["name:zh"] ?? null;
    if (isRail) {
      // 過濾名稱噪音（機廠、管理中心、工程段...）
      if (isNoisyRailName(rawName)) continue;
      if (dKm < nearestRailKm) {
        nearestRailKm = dKm;
        nearestRailName = rawName;
      }
      if (dKm <= 0.5) railWithin500++;
      else if (dKm <= 1) rail500to1000++;
      pois.push({
        name: rawName ?? "(rail station)",
        lat,
        lng,
        distance_km: Number(dKm.toFixed(2)),
        category: "rail",
      });
    } else if (isBus && dKm <= 0.5) {
      busWithin500++;
      pois.push({
        name: tags.name ?? "(bus stop)",
        lat,
        lng,
        distance_km: Number(dKm.toFixed(2)),
        category: "bus",
      });
    }
  }

  pois.sort((a, b) => a.distance_km - b.distance_km);

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
    pois: pois.slice(0, MAX_POIS),
  };
}
