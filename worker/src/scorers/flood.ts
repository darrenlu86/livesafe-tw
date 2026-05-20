/**
 * 淹水風險（OSM 河川 vs 滯洪池代理）— 暫時 live OSM 版本
 *
 * TODO: 切換為 bundled flood_potential.json (水利署 24h 650mm shp 整合)，
 *       目前 22 個縣市 7z 下載中。data ready 後改 in-memory PIP 查詢。
 */
import { haversineKm } from "./healthcare";
import type { Coords, FloodRisk, OverpassResponse, Poi } from "../types";

const OVERPASS_URL = "https://overpass-api.de/api/interpreter";
const RIVER_RADIUS_M = 1500;
const DETENTION_RADIUS_M = 1000;
const MAX_POIS = 8;

function buildQuery(lat: number, lng: number): string {
  return `[out:json][timeout:25];
(
  way["waterway"="river"](around:${RIVER_RADIUS_M},${lat},${lng});
  way["waterway"="stream"](around:${RIVER_RADIUS_M},${lat},${lng});
  way["waterway"="drain"](around:${RIVER_RADIUS_M},${lat},${lng});
  way["natural"="water"]["water"="basin"](around:${DETENTION_RADIUS_M},${lat},${lng});
  way["landuse"="basin"](around:${DETENTION_RADIUS_M},${lat},${lng});
  way["natural"="water"]["water"="reservoir"](around:${DETENTION_RADIUS_M},${lat},${lng});
);
out tags center;`;
}

function riverPenalty(km: number): number {
  if (km < 0.2) return 60;
  if (km < 0.5) return 45;
  if (km < 1) return 25;
  return 0;
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

  let nearestRiverKm = Infinity;
  let nearestRiverName: string | null = null;
  let nearestRiverType: string | null = null;
  let nearestStreamKm = Infinity;
  let detentionCount = 0;
  const pois: Poi[] = [];

  for (const el of data.elements) {
    const tags = el.tags ?? {};
    const lat = el.lat ?? el.center?.lat;
    const lng = el.lon ?? el.center?.lon;
    if (lat == null || lng == null) continue;
    const dKm = haversineKm(target, { lat, lng });
    const name = tags.name ?? tags["name:zh"] ?? null;

    if (tags.waterway === "river") {
      if (dKm < nearestRiverKm) {
        nearestRiverKm = dKm;
        nearestRiverName = name;
        nearestRiverType = "river";
      }
      pois.push({
        name: name ?? "(河川)",
        lat,
        lng,
        distance_km: Number(dKm.toFixed(2)),
        category: "river",
      });
    } else if (tags.waterway === "stream" || tags.waterway === "drain") {
      if (dKm < nearestStreamKm) nearestStreamKm = dKm;
      pois.push({
        name: name ?? (tags.waterway === "drain" ? "(排水溝)" : "(野溪)"),
        lat,
        lng,
        distance_km: Number(dKm.toFixed(2)),
        category: tags.waterway,
      });
    } else if (
      tags.landuse === "basin" ||
      tags.water === "basin" ||
      tags.water === "reservoir"
    ) {
      detentionCount++;
      pois.push({
        name: name ?? "(滯洪池/水庫)",
        lat,
        lng,
        distance_km: Number(dKm.toFixed(2)),
        category: "detention",
      });
    }
  }

  pois.sort((a, b) => a.distance_km - b.distance_km);

  const rivP = Number.isFinite(nearestRiverKm) ? riverPenalty(nearestRiverKm) : 0;
  const strP = Number.isFinite(nearestStreamKm) ? riverPenalty(nearestStreamKm) * 0.5 : 0;
  const detBonus = Math.min(15, detentionCount * 5);
  const score = Math.max(0, Math.min(100, Math.round(95 - rivP - strP + detBonus)));

  return {
    score,
    nearest_water: Number.isFinite(nearestRiverKm)
      ? {
          name: nearestRiverName,
          type: nearestRiverType,
          distance_km: Number(nearestRiverKm.toFixed(2)),
        }
      : null,
    pois: pois.slice(0, MAX_POIS),
    proxy_note:
      "本維度為「距河川距離」OSM 代理（滯洪池鄰近加分）。真實淹水深度需參考水利署淹水潛勢圖（22 縣市 shp 整合中）",
  };
}
