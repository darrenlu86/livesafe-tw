/**
 * 空氣品質評分（年度版 + 橘色天數）
 *
 * 算法：
 *   base (PM2.5 年均)：≤12 100、≤15 85、≤25 70、≤35 50、≤50 25、>50 10
 *   橘色 (101-150) 扣分： -0.4/day, cap -12
 *   紅色 (>150)    扣分： -2/day,  cap -20
 *   紫爆 (>200)    扣分： -3/day,  cap -15
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
    };
  }

  const base =
    nearest.avg_pm25 != null
      ? pm25Score(nearest.avg_pm25)
      : avgAqiScore(nearest.avg_aqi);

  const orangePenalty = Math.min(12, nearest.orange_days * 0.4);
  const redPenalty = Math.min(20, nearest.red_days * 2);
  const purplePenalty = Math.min(15, nearest.purple_days * 3);
  const score = Math.max(
    0,
    Math.round(base - orangePenalty - redPenalty - purplePenalty),
  );

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
      orange_days: nearest.orange_days,
      good_rate: nearest.good_rate,
      unhealthy_for_sensitive_rate: nearest.unhealthy_for_sensitive_rate,
      days_total: nearest.days_total,
    },
    window_days: dataset.metadata.window_days,
  };
}
