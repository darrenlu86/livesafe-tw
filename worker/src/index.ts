/**
 * LiveSafe.tw Worker
 *
 * 路由：
 *   GET /health                       — 健康檢查
 *   GET /api/risk?lat=X&lng=Y         — 座標風險（v1：air_quality；快速給地圖點選用）
 *   GET /api/report?address=X         — 風險報告（healthcare + amenities + air_quality）
 *   GET /api/aqi/stations             — 全台 AQI 測站清單（給前端地圖渲染）
 *
 * 注意：hospitals_geocoded.json 與 aqi.json 由 build 腳本從 data-pipeline 複製進來。
 */
import { Hono } from "hono";
import { cors } from "hono/cors";

import { geocodeAddress } from "./geocode";
import { scoreAirQuality } from "./scorers/air_quality";
import { scoreAmenities } from "./scorers/amenities";
import { scoreEarthquake } from "./scorers/earthquake";
import { scoreHealthcare } from "./scorers/healthcare";
import { computeOverall } from "./scorers/overall";
import type {
  ActiveFaultsDataset,
  AqiDataset,
  EarthquakesDataset,
  HospitalsDataset,
  RiskReport,
} from "./types";

// 由 build 步驟複製 data-pipeline/data/processed/* 至此
import hospitalsDataRaw from "./data/hospitals_geocoded.json";
import aqiDataRaw from "./data/aqi.json";
import earthquakesDataRaw from "./data/earthquakes.json";
import activeFaultsDataRaw from "./data/active_faults.json";

const hospitalsData = hospitalsDataRaw as HospitalsDataset;
const aqiData = aqiDataRaw as AqiDataset;
const earthquakesData = earthquakesDataRaw as unknown as EarthquakesDataset;
const activeFaultsData = activeFaultsDataRaw as unknown as ActiveFaultsDataset;

const app = new Hono();

app.use("*", cors({ origin: "*", allowMethods: ["GET"] }));

app.get("/health", (c) =>
  c.json({
    ok: true,
    hospitals_loaded: hospitalsData.hospitals.length,
    hospitals_source: hospitalsData.metadata.source,
    aqi_stations_loaded: aqiData.stations.length,
    aqi_source: aqiData.metadata.source_human,
    aqi_publish_times: aqiData.metadata.publish_times,
  }),
);

/**
 * 全台 AQI 測站清單（含經緯度、即時 AQI），給前端地圖渲染用
 */
app.get("/api/aqi/stations", (c) =>
  c.json({
    metadata: aqiData.metadata,
    stations: aqiData.stations,
  }),
);

/**
 * 座標風險：找最近測站 + AQI 風險評分
 * 用途：地圖點選任一點立即回傳該點的空品評估
 */
app.get("/api/risk", (c) => {
  const latStr = c.req.query("lat");
  const lngStr = c.req.query("lng");
  const lat = Number(latStr);
  const lng = Number(lngStr);
  if (!latStr || !lngStr || Number.isNaN(lat) || Number.isNaN(lng)) {
    return c.json(
      { error: "Missing or invalid query params: lat, lng (numbers)" },
      400,
    );
  }
  if (lat < 21 || lat > 26.5 || lng < 119 || lng > 122.5) {
    return c.json(
      { error: "Coordinates outside Taiwan bounding box (lat 21-26.5, lng 119-122.5)" },
      400,
    );
  }

  const air = scoreAirQuality({ lat, lng }, aqiData);
  return c.json({
    query: { lat, lng, generated_at: new Date().toISOString() },
    air_quality: air,
    source: {
      name: "環境部空氣品質指標 (AQI)",
      url: aqiData.metadata.source_human,
      fetched_at: aqiData.metadata.fetched_at,
      license: aqiData.metadata.license,
    },
  });
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
        hint: "請嘗試格式：縣市 + 行政區 + 路名（例：台北市信義區松壽路）",
      },
      404,
    );
  }

  const [healthcare, amenities, air_quality, earthquake] = await Promise.all([
    Promise.resolve(scoreHealthcare({ lat: geo.lat, lng: geo.lng }, hospitalsData)),
    scoreAmenities({ lat: geo.lat, lng: geo.lng }),
    Promise.resolve(scoreAirQuality({ lat: geo.lat, lng: geo.lng }, aqiData)),
    Promise.resolve(
      scoreEarthquake(
        { lat: geo.lat, lng: geo.lng },
        earthquakesData,
        activeFaultsData,
      ),
    ),
  ]);

  const dimensions = { healthcare, amenities, air_quality, earthquake };
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
        name: "環境部空氣品質指標 (AQI)",
        url: aqiData.metadata.source_human,
        updated_at: aqiData.metadata.fetched_at,
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
