/**
 * 生活機能評分 — 純 in-memory spatial lookup (pre-processed OSM data)
 *
 * 來源：data-pipeline fetch_osm_pois.py 預清洗（排除 disused/abandoned），bundled。
 *
 * 算法：
 *   conv_pts   = min(50, 500m 內超商 × 10)
 *   pharm_pts  = min(30, 500m 內藥局 × 10)
 *   park_pts   = min(20, 500m 內公園 × 10)
 *   score      = conv_pts + pharm_pts + park_pts
 */
import { haversineKm } from "./healthcare";
import type {
  Amenities,
  Coords,
  OsmAmenitiesDataset,
  OsmPoiBase,
  Poi,
} from "../types";

const RADIUS_KM = 0.5;
const MAX_POIS = 30;

function withinRadius(
  target: Coords,
  pois: OsmPoiBase[],
  category: string,
): Poi[] {
  const result: Poi[] = [];
  for (const p of pois) {
    const d = haversineKm(target, p);
    if (d > RADIUS_KM) continue;
    result.push({
      name: p.name ?? `(${category})`,
      lat: p.lat,
      lng: p.lng,
      distance_km: Number(d.toFixed(2)),
      category,
    });
  }
  return result;
}

export function scoreAmenities(
  target: Coords,
  dataset: OsmAmenitiesDataset,
): Amenities {
  const convenience = withinRadius(target, dataset.convenience, "convenience");
  const pharmacy = withinRadius(target, dataset.pharmacy, "pharmacy");
  const park = withinRadius(target, dataset.park, "park");

  const pois = [...convenience, ...pharmacy, ...park].sort(
    (a, b) => a.distance_km - b.distance_km,
  );

  return {
    score:
      Math.min(50, convenience.length * 10) +
      Math.min(30, pharmacy.length * 10) +
      Math.min(20, park.length * 10),
    convenience_stores_500m: convenience.length,
    pharmacies_500m: pharmacy.length,
    parks_500m: park.length,
    pois: pois.slice(0, MAX_POIS),
  };
}
