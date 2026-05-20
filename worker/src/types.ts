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

export interface HospitalPoi {
  name: string;
  lat: number;
  lng: number;
  distance_km: number;
  source: "nhi" | "osm";
  has_emergency: boolean;
  is_medical_center?: boolean;
}

export interface HealthcareAccess {
  score: number;
  total_hospitals_within_5km: number;
  emergency_hospitals_within_5km: number;
  medical_centers_within_5km: number;
  nearest: HospitalPoi | null;
  hospitals: HospitalPoi[];
  note?: string;
}

export interface MergedHospital {
  name: string;
  lat: number;
  lng: number;
  source: "nhi" | "osm";
  has_emergency: boolean;
  is_medical_center: boolean;
  type?: string;
  address?: string | null;
  operator?: string | null;
}

export interface MergedHospitalsDataset {
  metadata: {
    source: string;
    fetched_at: string;
    total: number;
    from_nhi: number;
    from_osm: number;
    emergency_count: number;
    medical_center_count: number;
  };
  hospitals: MergedHospital[];
}

export interface OsmPoiBase {
  name: string | null;
  lat: number;
  lng: number;
}

export interface OsmAmenitiesDataset {
  metadata: { source: string; fetched_at: string };
  convenience: OsmPoiBase[];
  pharmacy: OsmPoiBase[];
  park: OsmPoiBase[];
}

export interface OsmRailStation extends OsmPoiBase {
  kind: "train" | "subway" | "light_rail" | "tram";
  operator?: string;
}

export interface OsmTransitDataset {
  metadata: { source: string; fetched_at: string };
  rail: OsmRailStation[];
  bus: OsmPoiBase[];
}

export type SchoolLevel =
  | "university"
  | "high"
  | "junior"
  | "primary"
  | "kindergarten"
  | "other";

export interface OsmSchool extends OsmPoiBase {
  level: SchoolLevel;
}

export interface OsmSchoolsDataset {
  metadata: { source: string; fetched_at: string; level_counts: Record<SchoolLevel, number> };
  schools: OsmSchool[];
}

export interface Poi {
  name: string;
  lat: number;
  lng: number;
  distance_km: number;
  category?: string;
}

export interface Amenities {
  score: number;
  convenience_stores_500m: number;
  pharmacies_500m: number;
  parks_500m: number;
  pois: Poi[];
}

export interface Transit {
  score: number;
  rail_within_500m: number;
  rail_500m_to_1km: number;
  bus_stops_500m: number;
  nearest_rail: { name: string | null; distance_km: number } | null;
  pois: Poi[];
}

export interface FloodRisk {
  score: number;
  nearest_water: {
    name: string | null;
    type: string | null;
    distance_km: number;
  } | null;
  pois: Poi[];
  proxy_note: string;
}

export interface LandslideRisk {
  score: number;
  nearest_stream: {
    name: string;
    risk: string;
    county: string;
    town: string;
    distance_km: number;
  } | null;
  streams_within_1km: number;
  high_risk_within_1km: number;
  proxy_note: string;
}

export interface SchoolDistrict {
  score: number;
  schools_within_1km: number;
  kindergartens_within_1km: number;
  universities_within_1km: number;
  high_schools_within_1km: number;
  junior_schools_within_1km: number;
  primary_schools_within_1km: number;
  nearest_schools: Array<{ name: string; distance_km: number }>;
  pois: Poi[];
  level_labels: Record<string, string>;
  proxy_note: string;
}

export interface AirQualityRisk {
  score: number;
  nearest_station: {
    siteid: string;
    name: string;
    county: string;
    distance_km: number;
    avg_aqi: number;
    avg_pm25: number | null;
    purple_days: number;
    red_days: number;
    orange_days: number;
    good_rate: number;
    unhealthy_for_sensitive_rate: number;
    days_total: number;
  } | null;
  window_days: number;
}

export interface AnnualAqiStation {
  siteid: string;
  name: string;
  county: string;
  lat: number;
  lng: number;
  days_total: number;
  avg_aqi: number;
  purple_days: number;
  red_days: number;
  orange_days: number;
  yellow_days: number;
  good_days: number;
  good_rate: number;
  unhealthy_for_sensitive_rate: number;
  avg_pm25: number | null;
  pm25_days_total: number;
}

export interface AnnualAqiDataset {
  metadata: {
    fetched_at: string;
    window_days: number;
    cutoff_date: string;
    station_count: number;
    avg_aqi_min: number | null;
    avg_aqi_max: number | null;
  };
  stations: AnnualAqiStation[];
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
    safety_score: number | null;
    convenience_score: number | null;
    layer_weights: { safety: number; convenience: number };
  };
  dimensions: {
    healthcare: HealthcareAccess;
    amenities: Amenities;
    air_quality: AirQualityRisk;
    earthquake: EarthquakeRisk;
    transit: Transit;
    flood: FloodRisk;
    school_district: SchoolDistrict;
    landslide: LandslideRisk;
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
  geocode_method: string;
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
