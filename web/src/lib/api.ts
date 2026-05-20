import type {
  AirQualityRisk,
  Amenities,
  DimensionKey,
  EarthquakeRisk,
  FloodRisk,
  GeocodeResult,
  HealthcareAccess,
  LandslideRisk,
  NuisanceRisk,
  RiskReport,
  SchoolDistrict,
  Transit,
} from "./types";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8787";

async function jsonOrThrow<T>(url: string): Promise<T> {
  const resp = await fetch(url);
  if (!resp.ok) {
    const body = (await resp.json().catch(() => ({}))) as {
      error?: string;
      hint?: string;
    };
    throw new Error(body.hint ?? body.error ?? `HTTP ${resp.status}`);
  }
  return (await resp.json()) as T;
}

export async function fetchReport(address: string): Promise<RiskReport> {
  return jsonOrThrow(
    `${API_BASE}/api/report?address=${encodeURIComponent(address)}`,
  );
}

export async function fetchGeocode(address: string): Promise<GeocodeResult> {
  return jsonOrThrow(
    `${API_BASE}/api/geocode?address=${encodeURIComponent(address)}`,
  );
}

export type DimensionPayload = {
  earthquake: EarthquakeRisk;
  air_quality: AirQualityRisk;
  healthcare: HealthcareAccess;
  amenities: Amenities;
  transit: Transit;
  flood: FloodRisk;
  school_district: SchoolDistrict;
  landslide: LandslideRisk;
  nuisance: NuisanceRisk;
};

export async function fetchDimension<K extends DimensionKey>(
  key: K,
  lat: number,
  lng: number,
): Promise<DimensionPayload[K]> {
  return jsonOrThrow(
    `${API_BASE}/api/dim/${key}?lat=${lat}&lng=${lng}`,
  );
}
