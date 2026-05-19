/**
 * Nominatim geocoding wrapper.
 * 注意：Nominatim 對台灣門牌覆蓋差，限「縣市+區+路名」級別輸入。
 */
import type { Coords } from "./types";

const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";
const USER_AGENT = "LiveSafe.tw/0.1 (https://livesafe.oharalab.com)";

export interface GeocodeResult extends Coords {
  display_name: string;
}

export async function geocodeAddress(address: string): Promise<GeocodeResult | null> {
  const url = new URL(NOMINATIM_URL);
  url.searchParams.set("q", address);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("countrycodes", "tw");
  url.searchParams.set("limit", "1");

  const resp = await fetch(url.toString(), {
    headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
    cf: { cacheTtl: 86400, cacheEverything: true },
  });
  if (!resp.ok) {
    throw new Error(`Nominatim ${resp.status}: ${await resp.text()}`);
  }
  const data = (await resp.json()) as Array<{
    lat: string;
    lon: string;
    display_name: string;
  }>;
  const first = data[0];
  if (!first) return null;
  return {
    lat: Number(first.lat),
    lng: Number(first.lon),
    display_name: first.display_name,
  };
}
