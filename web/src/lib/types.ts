export type Grade = "A" | "B" | "C" | "D";

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

export interface SchoolDistrict {
  score: number;
  schools_within_1km: number;
  kindergartens_within_1km: number;
  nearest_schools: Array<{ name: string; distance_km: number }>;
  pois: Poi[];
  proxy_note: string;
}

export interface GeocodeResult {
  address: string;
  lat: number;
  lng: number;
  display_name: string;
}

export interface RiskReport {
  query: {
    address: string;
    lat: number;
    lng: number;
    geocode_source: string;
    geocode_display_name?: string;
    generated_at: string;
  };
  overall: { grade: Grade; score: number };
  dimensions: {
    healthcare: HealthcareAccess;
    amenities: Amenities;
    air_quality: AirQualityRisk;
    earthquake: EarthquakeRisk;
    transit: Transit;
    flood: FloodRisk;
    school_district: SchoolDistrict;
  };
  sources: { name: string; url: string; updated_at: string }[];
}

export type DimensionKey =
  | "earthquake"
  | "air_quality"
  | "healthcare"
  | "amenities"
  | "transit"
  | "flood"
  | "school_district";

export interface DimensionConfig {
  key: DimensionKey;
  label: string;
  shortLabel: string;
  description: string;
  colorVar: string;
  available: boolean;
  comingSoon?: string;
}

export const DIMENSIONS: DimensionConfig[] = [
  {
    key: "earthquake",
    label: "地震風險",
    shortLabel: "地震",
    description: "距活動斷層距離 + 近 5 年 5km 內 M≥5 地震密度",
    colorVar: "var(--color-dim-earthquake)",
    available: true,
  },
  {
    key: "air_quality",
    label: "空氣品質",
    shortLabel: "空品",
    description: "近 1 年 PM2.5 年均、紫爆／紅色不健康天數、AQI 良好率",
    colorVar: "var(--color-dim-air)",
    available: true,
  },
  {
    key: "healthcare",
    label: "醫療可近性",
    shortLabel: "醫療",
    description: "5km 內急救責任醫院家數 + 最近醫院距離",
    colorVar: "var(--color-dim-healthcare)",
    available: true,
  },
  {
    key: "amenities",
    label: "生活機能",
    shortLabel: "機能",
    description: "500m 內超商、藥局、公園密度",
    colorVar: "var(--color-dim-amenities)",
    available: true,
  },
  {
    key: "transit",
    label: "交通便利",
    shortLabel: "交通",
    description: "1km 內捷運/火車站 + 500m 內公車站",
    colorVar: "var(--color-dim-transit)",
    available: true,
  },
  {
    key: "flood",
    label: "淹水鄰近",
    shortLabel: "淹水",
    description: "距最近水體（河川、湖泊、運河）距離 — OSM 代理",
    colorVar: "var(--color-dim-flood)",
    available: true,
  },
  {
    key: "school_district",
    label: "學校密度",
    shortLabel: "學區",
    description: "1km 內國中小、幼兒園數量 — 代理「學區資訊」",
    colorVar: "var(--color-dim-school)",
    available: true,
  },
];

export const DIMENSION_MAP = Object.fromEntries(
  DIMENSIONS.map((d) => [d.key, d]),
) as Record<DimensionKey, DimensionConfig>;
