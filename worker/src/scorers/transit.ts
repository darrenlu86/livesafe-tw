/**
 * 交通便利評分 — 純 in-memory spatial lookup (pre-processed OSM data)
 *
 * 來源：data-pipeline fetch_osm_pois.py 已用嚴格 OSM tag 語意過濾：
 *   - 鐵路車站必須有 train/subway/light_rail/tram = yes
 *   - 排除 disused/abandoned/service=yard|depot
 *   - 公車站同名同址 ~10m 去重
 *
 * 算法（階梯化，避免單站直接吃滿）：
 *   rail_pts = min(60, 500m 內 rail × 30 + 500m-1km × 15)
 *              → 2 站 500m 內才滿；1 站 500m 內 + 1 站 1km 內 = 45
 *   bus_pts  = min(40, 500m 內公車 × 4)   // 10 站才滿
 *   score    = rail_pts + bus_pts
 */
import { haversineKm } from "./healthcare";
import type { Coords, OsmTransitDataset, Poi, Transit } from "../types";

const RAIL_RADIUS_KM = 1.0;
const BUS_RADIUS_KM = 0.5;
const MAX_POIS = 30;

export function scoreTransit(
  target: Coords,
  dataset: OsmTransitDataset,
): Transit {
  let railWithin500 = 0;
  let rail500to1000 = 0;
  let busWithin500 = 0;
  let nearestRailName: string | null = null;
  let nearestRailKm = Infinity;
  const pois: Poi[] = [];

  for (const r of dataset.rail) {
    const d = haversineKm(target, r);
    if (d > RAIL_RADIUS_KM) continue;
    if (d < nearestRailKm) {
      nearestRailKm = d;
      nearestRailName = r.name;
    }
    if (d <= 0.5) railWithin500++;
    else rail500to1000++;
    pois.push({
      name: r.name ?? "(rail)",
      lat: r.lat,
      lng: r.lng,
      distance_km: Number(d.toFixed(2)),
      category: r.kind,
    });
  }

  for (const b of dataset.bus) {
    const d = haversineKm(target, b);
    if (d > BUS_RADIUS_KM) continue;
    busWithin500++;
    pois.push({
      name: b.name ?? "(bus)",
      lat: b.lat,
      lng: b.lng,
      distance_km: Number(d.toFixed(2)),
      category: "bus",
    });
  }

  pois.sort((a, b) => a.distance_km - b.distance_km);

  const railPts = Math.min(60, railWithin500 * 30 + rail500to1000 * 15);
  const busPts = Math.min(40, busWithin500 * 4);
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
