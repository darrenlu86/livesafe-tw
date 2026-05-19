/**
 * 生活機能評分
 *
 * 500m 半徑內 OSM POI 計數（convenience / pharmacy / park）。
 *
 * 算法：
 *   conv_pts   = min(50, 超商數 × 10)
 *   pharm_pts  = min(30, 藥局數 × 10)
 *   park_pts   = min(20, 公園數 × 10)
 *   score      = conv_pts + pharm_pts + park_pts（上限 100）
 */
import type { Amenities, Coords, OverpassResponse } from "../types";

const OVERPASS_URL = "https://overpass-api.de/api/interpreter";
const RADIUS_M = 500;

function buildQuery(lat: number, lng: number): string {
  return `[out:json][timeout:25];
(
  node["shop"="convenience"](around:${RADIUS_M},${lat},${lng});
  node["amenity"="pharmacy"](around:${RADIUS_M},${lat},${lng});
  node["leisure"="park"](around:${RADIUS_M},${lat},${lng});
  way["leisure"="park"](around:${RADIUS_M},${lat},${lng});
);
out tags center;`;
}

export async function scoreAmenities(target: Coords): Promise<Amenities> {
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

  let convenience = 0;
  let pharmacy = 0;
  let park = 0;
  for (const el of data.elements) {
    const tags = el.tags ?? {};
    if (tags.shop === "convenience") convenience++;
    else if (tags.amenity === "pharmacy") pharmacy++;
    else if (tags.leisure === "park") park++;
  }

  return {
    score:
      Math.min(50, convenience * 10) +
      Math.min(30, pharmacy * 10) +
      Math.min(20, park * 10),
    convenience_stores_500m: convenience,
    pharmacies_500m: pharmacy,
    parks_500m: park,
  };
}
