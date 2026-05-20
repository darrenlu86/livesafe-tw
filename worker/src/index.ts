/**
 * LiveSafe.tw Worker
 *
 * 路由：
 *   GET /health                       — 健康檢查
 *   GET /api/aqi/stations             — 全台 AQI 測站清單
 *   GET /api/risk?lat=X&lng=Y         — 座標 AQI 風險
 *   GET /api/geocode?address=X        — 地址 → 座標
 *   GET /api/dim/:key?lat=Y&lng=Z     — 單一維度分數（earthquake|air_quality|healthcare|amenities|transit|flood|school_district）
 *   GET /api/report?address=X         — 一次取所有 7 維度
 */
import { Hono } from "hono";
import { cors } from "hono/cors";

import { getLiveAqiDataset } from "./data-sources/aqi-live";
import { geocodeAddress } from "./geocode";
import { scoreAirQuality } from "./scorers/air_quality";
import { scoreAmenities } from "./scorers/amenities";
import { scoreEarthquake } from "./scorers/earthquake";
import { scoreFlood } from "./scorers/flood";
import { scoreHealthcare } from "./scorers/healthcare";
import { computeOverall } from "./scorers/overall";
import { scoreSchool } from "./scorers/school";
import { scoreTransit } from "./scorers/transit";
import type {
  ActiveFaultsDataset,
  AnnualAqiDataset,
  EarthquakesDataset,
  HospitalsDataset,
  RiskReport,
} from "./types";

import hospitalsDataRaw from "./data/hospitals_geocoded.json";
import earthquakesDataRaw from "./data/earthquakes.json";
import activeFaultsDataRaw from "./data/active_faults.json";
import aqiAnnualRaw from "./data/aqi_annual.json";

const hospitalsData = hospitalsDataRaw as HospitalsDataset;
const earthquakesData = earthquakesDataRaw as unknown as EarthquakesDataset;
const activeFaultsData = activeFaultsDataRaw as unknown as ActiveFaultsDataset;
const aqiAnnualData = aqiAnnualRaw as unknown as AnnualAqiDataset;

const app = new Hono();

app.use("*", cors({ origin: "*", allowMethods: ["GET"] }));

app.get("/health", (c) =>
  c.json({
    ok: true,
    hospitals_loaded: hospitalsData.hospitals.length,
    aqi_annual_stations: aqiAnnualData.stations.length,
    aqi_annual_window_days: aqiAnnualData.metadata.window_days,
  }),
);

app.get("/api/aqi/stations", async (c) => {
  // 即時 AQI 測站清單（給地圖渲染當下空氣，與年度評分分離）
  try {
    const aqi = await getLiveAqiDataset();
    return c.json({ metadata: aqi.metadata, stations: aqi.stations });
  } catch (e) {
    return c.json(
      { error: e instanceof Error ? e.message : String(e) },
      500,
    );
  }
});

function parseCoords(c: { req: { query: (k: string) => string | undefined } }):
  | { lat: number; lng: number }
  | { error: string; status: 400 } {
  const latStr = c.req.query("lat");
  const lngStr = c.req.query("lng");
  const lat = Number(latStr);
  const lng = Number(lngStr);
  if (!latStr || !lngStr || Number.isNaN(lat) || Number.isNaN(lng)) {
    return { error: "Missing or invalid lat/lng", status: 400 };
  }
  if (lat < 21 || lat > 26.5 || lng < 119 || lng > 122.5) {
    return {
      error: "Coordinates outside Taiwan (lat 21-26.5, lng 119-122.5)",
      status: 400,
    };
  }
  return { lat, lng };
}

app.get("/api/risk", (c) => {
  const parsed = parseCoords(c);
  if ("error" in parsed) return c.json({ error: parsed.error }, parsed.status);
  const air = scoreAirQuality(parsed, aqiAnnualData);
  return c.json({
    query: { ...parsed, generated_at: new Date().toISOString() },
    air_quality: air,
  });
});

app.get("/api/geocode", async (c) => {
  const address = c.req.query("address")?.trim();
  if (!address) return c.json({ error: "Missing address" }, 400);
  const geo = await geocodeAddress(address);
  if (!geo) {
    return c.json(
      {
        error: "Address not found",
        hint: "請嘗試格式：縣市 + 行政區 + 路名",
      },
      404,
    );
  }
  return c.json({
    address,
    lat: geo.lat,
    lng: geo.lng,
    display_name: geo.display_name,
  });
});

app.get("/api/dim/:key", async (c) => {
  const key = c.req.param("key");
  const parsed = parseCoords(c);
  if ("error" in parsed) return c.json({ error: parsed.error }, parsed.status);
  try {
    switch (key) {
      case "earthquake":
        return c.json(scoreEarthquake(parsed, earthquakesData, activeFaultsData));
      case "air_quality":
        return c.json(scoreAirQuality(parsed, aqiAnnualData));
      case "healthcare":
        return c.json(scoreHealthcare(parsed, hospitalsData));
      case "amenities":
        return c.json(await scoreAmenities(parsed));
      case "transit":
        return c.json(await scoreTransit(parsed));
      case "flood":
        return c.json(await scoreFlood(parsed));
      case "school_district":
        return c.json(await scoreSchool(parsed));
      default:
        return c.json({ error: `Unknown dimension: ${key}` }, 400);
    }
  } catch (e) {
    return c.json(
      { error: e instanceof Error ? e.message : String(e) },
      500,
    );
  }
});

app.get("/api/report", async (c) => {
  const address = c.req.query("address")?.trim();
  if (!address) {
    return c.json({ error: "Missing required query param: address" }, 400);
  }
  const geo = await geocodeAddress(address);
  if (!geo) {
    return c.json(
      {
        error: "Address not found",
        hint: "請嘗試格式：縣市 + 行政區 + 路名",
      },
      404,
    );
  }

  const coords = { lat: geo.lat, lng: geo.lng };
  const [healthcare, amenities, air_quality, earthquake, transit, flood, school_district] =
    await Promise.all([
      Promise.resolve(scoreHealthcare(coords, hospitalsData)),
      scoreAmenities(coords),
      Promise.resolve(scoreAirQuality(coords, aqiAnnualData)),
      Promise.resolve(scoreEarthquake(coords, earthquakesData, activeFaultsData)),
      scoreTransit(coords),
      scoreFlood(coords),
      scoreSchool(coords),
    ]);

  const dimensions = {
    healthcare,
    amenities,
    air_quality,
    earthquake,
    transit,
    flood,
    school_district,
  };
  const overall = computeOverall(dimensions);

  const report: RiskReport = {
    query: {
      address,
      lat: geo.lat,
      lng: geo.lng,
      geocode_source: "nominatim",
      geocode_display_name: geo.display_name,
      generated_at: new Date().toISOString(),
    },
    overall,
    dimensions,
    sources: [
      {
        name: "健保特約醫事機構-地區醫院",
        url: hospitalsData.metadata.source,
        updated_at: hospitalsData.metadata.fetched_at,
      },
      {
        name: "OpenStreetMap (Overpass API)",
        url: "https://overpass-api.de/api/interpreter",
        updated_at: new Date().toISOString(),
      },
      {
        name: "OSM Nominatim Geocoding",
        url: "https://nominatim.openstreetmap.org/",
        updated_at: new Date().toISOString(),
      },
      {
        name: `環境部空品 (近 ${aqiAnnualData.metadata.window_days} 天年均)`,
        url: "https://data.gov.tw/dataset/40448",
        updated_at: aqiAnnualData.metadata.fetched_at,
      },
      {
        name: "USGS Earthquake Catalog (台灣近 5 年 M>=4)",
        url: "https://earthquake.usgs.gov/earthquakes/search/",
        updated_at: earthquakesData.metadata.fetched_at,
      },
      {
        name: "GEM Global Active Faults Database (台灣)",
        url: "https://github.com/GEMScienceTools/gem-global-active-faults",
        updated_at: activeFaultsData.metadata.fetched_at,
      },
    ],
  };

  return c.json(report);
});

app.onError((err, c) => {
  console.error("[worker error]", err);
  return c.json({ error: "Internal Error", message: err.message }, 500);
});

export default app;
