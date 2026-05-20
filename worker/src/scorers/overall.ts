/**
 * 總評 — 雙層加權架構
 *
 * 安全層 (60%)：地震、淹水、空品（長期健康影響）— 不可逆 / 人命級風險
 * 便利層 (40%)：醫療可近性、生活機能、交通、學區 — 生活品質
 *
 * 使用者可自訂某些維度不計入總評。實作上，被排除的 dim 不參與該層平均；
 * 若某層全部被排除，自動退化為單層；兩層都空 → D 40 分。
 */
import type { Grade, RiskReport } from "../types";

type DimensionKey =
  | "earthquake"
  | "flood"
  | "air_quality"
  | "healthcare"
  | "amenities"
  | "transit"
  | "school_district"
  | "landslide"
  | "nuisance";

const SAFETY_DIMS: DimensionKey[] = ["earthquake", "flood", "landslide", "air_quality"];
const CONVENIENCE_DIMS: DimensionKey[] = [
  "healthcare",
  "amenities",
  "transit",
  "school_district",
  "nuisance",
];
const SAFETY_WEIGHT = 0.6;
const CONVENIENCE_WEIGHT = 0.4;

function dimScore(
  dimensions: RiskReport["dimensions"],
  key: DimensionKey,
): number | null {
  switch (key) {
    case "earthquake":
      return dimensions.earthquake.score;
    case "flood":
      return dimensions.flood.score;
    case "air_quality":
      return dimensions.air_quality.score;
    case "healthcare":
      return dimensions.healthcare.score;
    case "amenities":
      return dimensions.amenities.score;
    case "transit":
      return dimensions.transit.score;
    case "school_district":
      return dimensions.school_district.score;
    case "landslide":
      return dimensions.landslide.score;
    case "nuisance":
      return dimensions.nuisance.score;
    default:
      return null;
  }
}

function avg(nums: number[]): number | null {
  if (nums.length === 0) return null;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function grade(score: number): Grade {
  if (score >= 80) return "A";
  if (score >= 60) return "B";
  if (score >= 40) return "C";
  return "D";
}

export function computeOverall(
  dimensions: RiskReport["dimensions"],
  excluded: Set<DimensionKey> = new Set(),
): RiskReport["overall"] {
  const safetyScores = SAFETY_DIMS.filter((k) => !excluded.has(k))
    .map((k) => dimScore(dimensions, k))
    .filter((v): v is number => v != null);
  const convenScores = CONVENIENCE_DIMS.filter((k) => !excluded.has(k))
    .map((k) => dimScore(dimensions, k))
    .filter((v): v is number => v != null);

  const safetyAvg = avg(safetyScores);
  const convenAvg = avg(convenScores);

  let combined: number;
  if (safetyAvg == null && convenAvg == null) {
    combined = 40;
  } else if (safetyAvg == null) {
    combined = convenAvg!;
  } else if (convenAvg == null) {
    combined = safetyAvg;
  } else {
    combined = safetyAvg * SAFETY_WEIGHT + convenAvg * CONVENIENCE_WEIGHT;
  }
  const score = Math.round(combined);
  return {
    grade: grade(score),
    score,
    safety_score: safetyAvg == null ? null : Math.round(safetyAvg),
    convenience_score: convenAvg == null ? null : Math.round(convenAvg),
    layer_weights: { safety: SAFETY_WEIGHT, convenience: CONVENIENCE_WEIGHT },
  };
}
