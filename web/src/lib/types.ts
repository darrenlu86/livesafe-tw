export type Grade = "A" | "B" | "C" | "D";

export interface HealthcareAccess {
  score: number;
  emergency_hospitals_within_5km: number;
  nearest_emergency: { name: string; distance_km: number } | null;
  note?: string;
}

export interface Amenities {
  score: number;
  convenience_stores_500m: number;
  pharmacies_500m: number;
  parks_500m: number;
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
    description: "最近環境部測站即時 AQI",
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
    label: "淹水潛勢",
    shortLabel: "淹水",
    description: "水利署淹水潛勢圖（650mm/24hr 情境）",
    colorVar: "var(--color-dim-flood)",
    available: false,
    comingSoon: "資料源整合中：水利署淹水潛勢 shapefile → PMTiles",
  },
  {
    key: "school_district",
    label: "學區資訊",
    shortLabel: "學區",
    description: "周邊國中小學分布",
    colorVar: "var(--color-dim-school)",
    available: false,
    comingSoon: "資料源整合中：各縣市教育局學區劃分 CSV",
  },
];

export const DIMENSION_MAP = Object.fromEntries(
  DIMENSIONS.map((d) => [d.key, d]),
) as Record<DimensionKey, DimensionConfig>;
