/**
 * 空氣品質評分
 *
 * 資料源：環境部 aqx_p_432，每小時更新（見 data-pipeline/scripts/fetch_aqi.py）
 * 算法（依規格 §4.1）：
 *   - 找最近測站（haversine）
 *   - 以即時 AQI 換算分數，AQI 越低分數越高
 *     AQI <=50 良好          → 100
 *     AQI <=100 普通         → 80
 *     AQI <=150 對敏感族群不健康 → 55
 *     AQI <=200 不健康       → 30
 *     AQI <=300 非常不健康   → 15
 *     AQI >300 危害          → 0
 *
 * v1 限制：未做近 12 個月年均 / 紫爆天數（須累積歷史資料）。
 * 規格 §4.1 將之列為 v2 後續工作，見 docs/roadmap.md。
 */
import { haversineKm } from "./healthcare";
import type { AirQualityRisk, AqiDataset, AqiStation, Coords } from "../types";

function aqiToScore(aqi: number | null): number {
  if (aqi === null) return 50; // 無資料給中性分
  if (aqi <= 50) return 100;
  if (aqi <= 100) return 80;
  if (aqi <= 150) return 55;
  if (aqi <= 200) return 30;
  if (aqi <= 300) return 15;
  return 0;
}

export function scoreAirQuality(
  target: Coords,
  dataset: AqiDataset,
): AirQualityRisk {
  const stations = dataset.stations;
  if (stations.length === 0) {
    return { score: 0, nearest_station: null, data_publishtime: null };
  }

  let nearest: AqiStation | null = null;
  let nearestDist = Infinity;
  for (const s of stations) {
    const d = haversineKm(target, { lat: s.lat, lng: s.lng });
    if (d < nearestDist) {
      nearestDist = d;
      nearest = s;
    }
  }

  if (!nearest) {
    return { score: 0, nearest_station: null, data_publishtime: null };
  }

  const score = aqiToScore(nearest.aqi);

  return {
    score,
    nearest_station: {
      siteid: nearest.siteid,
      name: nearest.name,
      county: nearest.county,
      distance_km: Number(nearestDist.toFixed(2)),
      aqi: nearest.aqi,
      status: nearest.status,
      pollutant: nearest.pollutant,
      pm25: nearest.pm25,
      publishtime: nearest.publishtime,
    },
    data_publishtime: dataset.metadata.publish_times[0] ?? null,
  };
}
