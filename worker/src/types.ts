/**
 * LiveSafe.tw 型別定義
 *
 * 依規格 livesafe-spec.md §5.1 RiskReport。
 * v1 僅包含已可實作的維度（healthcare、amenities）。
 * v1.1 加入 air_quality、earthquake（等 API key）。
 */

export type Grade = "A" | "B" | "C" | "D";

export interface Coords {
  lat: number;
  lng: number;
}

export interface SourceRef {
  name: string;
  url: string;
  updated_at: string;
}

export interface HealthcareAccess {
  score: number;
  emergency_hospitals_within_5km: number;
  nearest_emergency: {
    name: string;
    distance_km: number;
  } | null;
  note?: string;
}

export interface Amenities {
  score: number;
  convenience_stores_500m: number;
  pharmacies_500m: number;
  parks_500m: number;
}

export interface Transit {
  score: number;
  rail_within_500m: number;
  rail_500m_to_1km: number;
  bus_stops_500m: number;
  nearest_rail: {
    name: string | null;
    distance_km: number;
  } | null;
}

export interface FloodRisk {
  score: number;
  nearest_water: {
    name: string | null;
    type: string | null;
    distance_km: number;
  } | null;
  proxy_note: string;
}

export interface SchoolDistrict {
  score: number;
  schools_within_1km: number;
  kindergartens_within_1km: number;
  nearest_schools: Array<{ name: string; distance_km: number }>;
  proxy_note: string;
}

export interface AirQualityRisk {
  score: number;
  nearest_station: {
    siteid: string;
    name: string;
    county: string;
    distance_km: number;
    aqi: number | null;
    status: string;
    pollutant: string;
    pm25: number | null;
    publishtime: string;
  } | null;
  data_publishtime: string | null;
}

export interface EarthquakeRecord {
  id: string;
  date: string;
  lat: number;
  lng: number;
  magnitude: number;
  depth_km: number | null;
  place: string;
}

export interface EarthquakesDataset {
  metadata: {
    fetched_at: string;
    count: number;
    magnitude_min: number;
    magnitude_max: number;
    date_earliest: string;
    date_latest: string;
  };
  earthquakes: EarthquakeRecord[];
}

export interface ActiveFaultFeature {
  type: "Feature";
  geometry: {
    type: "LineString" | "MultiLineString";
    coordinates: number[][] | number[][][];
  };
  properties: {
    name?: string;
    slip_type?: string;
    catalog_id?: string;
    net_slip_rate?: number;
    average_dip?: number;
  };
}

export interface ActiveFaultsDataset {
  type: "FeatureCollection";
  metadata: {
    fetched_at: string;
    count: number;
  };
  features: ActiveFaultFeature[];
}

export interface EarthquakeRisk {
  score: number;
  nearest_fault: {
    name: string | null;
    slip_type: string | null;
    distance_km: number;
  } | null;
  recent_quakes_within_5km: number;
  max_magnitude_within_5km: number | null;
  window_years: number;
}

export interface RiskReport {
  query: {
    address: string;
    lat: number;
    lng: number;
    geocode_source: "nominatim";
    geocode_display_name?: string;
    generated_at: string;
  };
  overall: {
    grade: Grade;
    score: number;
  };
  dimensions: {
    healthcare: HealthcareAccess;
    amenities: Amenities;
    air_quality: AirQualityRisk;
    earthquake: EarthquakeRisk;
    transit: Transit;
    flood: FloodRisk;
    school_district: SchoolDistrict;
  };
  sources: SourceRef[];
}

export interface HospitalRecord {
  code: string;
  name: string;
  type: string;
  phone: string;
  address: string;
  county_code: string;
  region_group: string;
  has_emergency: boolean;
  services: string[];
  specialties: string[];
  contract_start: string | null;
  contract_end: string | null;
  is_active: boolean;
  lat: number | null;
  lng: number | null;
  geocode_method: "name" | "name_stripped" | "address_street" | "unresolved";
}

export interface HospitalsDataset {
  metadata: {
    source: string;
    fetched_at: string;
    geocoded_at?: string;
    license: string;
    row_count: number;
    emergency_hospital_count: number;
    active_count: number;
  };
  hospitals: HospitalRecord[];
}

export interface AqiStation {
  siteid: string;
  name: string;
  county: string;
  lat: number;
  lng: number;
  aqi: number | null;
  status: string;
  pollutant: string;
  pm25: number | null;
  pm25_avg: number | null;
  pm10: number | null;
  o3_8hr: number | null;
  publishtime: string;
}

export interface AqiDataset {
  metadata: {
    source: string;
    source_human: string;
    fetched_at: string;
    license: string;
    station_count: number;
    station_with_aqi: number;
    aqi_min: number | null;
    aqi_max: number | null;
    publish_times: string[];
  };
  stations: AqiStation[];
}

export interface OverpassElement {
  type: "node" | "way" | "relation";
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

export interface OverpassResponse {
  version: number;
  generator: string;
  elements: OverpassElement[];
}
