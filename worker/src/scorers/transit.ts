/**
 * 交通便利評分
 *
 * OSM 資料源語意（清理重點）：
 *   - 真實「鐵路/捷運站」應有 subtype tag（train/subway/light_rail/tram）標明系統
 *   - 只有 railway=station 但沒 subtype 通常是 OSM 誤標的場域（機廠、管理中心）
 *   - station=subway / station=light_rail / station=tram 也是公認的「車站」標記
 *   - service=yard / service=depot / disused/abandoned=yes 是非營運場域，須排除
 *   - 公車站 highway=bus_stop + name → 站牌名（含「XX管理中心站」這種以地標為名是合法）
 *
 * 算法：
 *   rail_pts = min(60, 500m 內 rail × 60 + 500-1000m × 30)
 *   bus_pts  = min(40, 500m 內公車 × 8)
 *   score    = rail_pts + bus_pts
 */
import { haversineKm } from "./healthcare";
import type { Coords, OverpassResponse, Poi, Transit } from "../types";

const OVERPASS_URL = "https://overpass-api.de/api/interpreter";
const RAIL_RADIUS_M = 1000;
const BUS_RADIUS_M = 500;
const MAX_POIS = 30;

function buildQuery(lat: number, lng: number): string {
  // 嚴格只查確定是車站的 tag 組合（用 Overpass 條件 query 過濾）
  return `[out:json][timeout:25];
(
  node["railway"="station"]["train"="yes"](around:${RAIL_RADIUS_M},${lat},${lng});
  node["railway"="station"]["subway"="yes"](around:${RAIL_RADIUS_M},${lat},${lng});
  node["railway"="station"]["light_rail"="yes"](around:${RAIL_RADIUS_M},${lat},${lng});
  node["railway"="station"]["tram"="yes"](around:${RAIL_RADIUS_M},${lat},${lng});
  node["railway"="halt"](around:${RAIL_RADIUS_M},${lat},${lng});
  node["station"="subway"](around:${RAIL_RADIUS_M},${lat},${lng});
  node["station"="light_rail"](around:${RAIL_RADIUS_M},${lat},${lng});
  node["station"="tram"](around:${RAIL_RADIUS_M},${lat},${lng});
  node["highway"="bus_stop"](around:${BUS_RADIUS_M},${lat},${lng});
);
out tags center;`;
}

// 排除非營運場域（已停用 / 計畫中 / 廢線等）
function isInactive(tags: Record<string, string>): boolean {
  return (
    tags.disused === "yes" ||
    tags.abandoned === "yes" ||
    tags["disused:railway"] === "station" ||
    tags["abandoned:railway"] === "station" ||
    tags.service === "yard" ||
    tags.service === "depot" ||
    tags["railway:traffic_mode"] === "freight"
  );
}

function detectRailKind(tags: Record<string, string>): string | null {
  if (tags.subway === "yes" || tags.station === "subway") return "subway";
  if (tags.light_rail === "yes" || tags.station === "light_rail")
    return "light_rail";
  if (tags.tram === "yes" || tags.station === "tram") return "tram";
  if (tags.train === "yes" || tags.railway === "halt") return "train";
  return null;
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
  const seenBus = new Set<string>();

  for (const el of data.elements) {
    const tags = (el.tags ?? {}) as Record<string, string>;
    const lat = el.lat ?? el.center?.lat;
    const lng = el.lon ?? el.center?.lon;
    if (lat == null || lng == null) continue;
    if (isInactive(tags)) continue;
    const dKm = haversineKm(target, { lat, lng });
    const isBus = tags.highway === "bus_stop";
    const railKind = isBus ? null : detectRailKind(tags);
    const rawName = tags.name ?? tags["name:zh"] ?? null;

    if (railKind) {
      if (!rawName) continue;
      if (dKm < nearestRailKm) {
        nearestRailKm = dKm;
        nearestRailName = rawName;
      }
      if (dKm <= 0.5) railWithin500++;
      else if (dKm <= 1) rail500to1000++;
      pois.push({
        name: rawName,
        lat,
        lng,
        distance_km: Number(dKm.toFixed(2)),
        category: railKind,
      });
    } else if (isBus && dKm <= 0.5) {
      // 公車站名 + 5m 精度去重（同名公車站常有多筆方向 / 同址）
      if (!rawName) continue;
      const key = `${rawName}|${lat.toFixed(4)},${lng.toFixed(4)}`;
      if (seenBus.has(key)) continue;
      seenBus.add(key);
      busWithin500++;
      pois.push({
        name: rawName,
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
