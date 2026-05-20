/**
 * 空氣品質評分（年度版）
 *
 * 資料源：環境部 aqx_p_434（測站逐日 AQI）+ aqx_p_322（測站逐日 PM2.5）
 * 由 data-pipeline/scripts/fetch_aqi_annual.py 預處理為 aqi_annual.json。
 *
 * 算法（spec §4.1：近 12 個月 PM2.5 年均 + 紫爆天數）：
 *   PM2.5 年均 (µg/m³)：
 *     ≤ 12 (WHO 良好) → 100
 *     12-15           → 85
 *     15-25           → 70
 *     25-35           → 50
 *     35-50           → 25
 *     > 50            → 10
 *   紅色天數扣分 (AQI > 150)：
 *     -2 per day, cap -20
 *   紫爆天數加重扣分 (AQI > 200)：
 *     -3 per day, cap -15
 *
 * 若無 PM2.5 資料，fallback 用年均 AQI 分級。
 */
import { haversineKm } from "./healthcare";
import type {
  AirQualityRisk,
  AnnualAqiDataset,
  AnnualAqiStation,
  Coords,
} from "../types";

function pm25Score(avg: number): number {
  if (avg <= 12) return 100;
  if (avg <= 15) return 85;
  if (avg <= 25) return 70;
  if (avg <= 35) return 50;
  if (avg <= 50) return 25;
  return 10;
}

function avgAqiScore(avg: number): number {
  if (avg <= 50) return 100;
  if (avg <= 70) return 85;
  if (avg <= 100) return 65;
  if (avg <= 150) return 35;
  return 15;
}

export function scoreAirQuality(
  target: Coords,
  dataset: AnnualAqiDataset,
): AirQualityRisk {
  const stations = dataset.stations;
  if (stations.length === 0) {
    return {
      score: 0,
      nearest_station: null,
      window_days: dataset.metadata.window_days,
      current_aqi: null,
      current_publishtime: null,
    };
  }

  let nearest: AnnualAqiStation | null = null;
  let nearestDist = Infinity;
  for (const s of stations) {
    const d = haversineKm(target, { lat: s.lat, lng: s.lng });
    if (d < nearestDist) {
      nearestDist = d;
      nearest = s;
    }
  }
  if (!nearest) {
    return {
      score: 0,
      nearest_station: null,
      window_days: dataset.metadata.window_days,
      current_aqi: null,
      current_publishtime: null,
    };
  }

  // base: 以 PM2.5 年均優先，否則用 AQI 年均
  const base =
    nearest.avg_pm25 != null
      ? pm25Score(nearest.avg_pm25)
      : avgAqiScore(nearest.avg_aqi);

  const redPenalty = Math.min(20, nearest.red_days * 2);
  const purplePenalty = Math.min(15, nearest.purple_days * 3);
  const score = Math.max(0, Math.round(base - redPenalty - purplePenalty));

  return {
    score,
    nearest_station: {
      siteid: nearest.siteid,
      name: nearest.name,
      county: nearest.county,
      distance_km: Number(nearestDist.toFixed(2)),
      avg_aqi: nearest.avg_aqi,
      avg_pm25: nearest.avg_pm25,
      purple_days: nearest.purple_days,
      red_days: nearest.red_days,
      good_rate: nearest.good_rate,
      days_total: nearest.days_total,
    },
    window_days: dataset.metadata.window_days,
    current_aqi: null,
    current_publishtime: null,
  };
}
