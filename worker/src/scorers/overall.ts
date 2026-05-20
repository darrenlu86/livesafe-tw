/**
 * 總評 — 雙層加權架構（v2，更貼近實際分布）
 *
 * 安全層 (60%)：地震、淹水、坊地災害、空品（不可逆 / 人命級風險）
 *   - 等權平均，但 flood 在 data_available=false 時自動排除（避免假裝 95）。
 *
 * 便利層 (40%)：醫療、機能、交通、學校、嫌惡設施（生活品質）
 *   - 加權平均（非等權）以避免共線維度疊加（healthcare/transit/amenities 均量測都市化）：
 *       healthcare 0.35
 *       transit    0.25
 *       amenities  0.20
 *       school     0.10
 *       nuisance   0.10
 *   - 若使用者排除某維度，剩餘維度的權重按比例 renormalize。
 *
 * 評級門檻 (v2，避免大部分都市都是 A)：
 *   A ≥ 85, B 65-84, C 45-64, D < 45
 *
 * 兩層都空 → D 40 分。
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

const CONVENIENCE_WEIGHTS: Record<Extract<DimensionKey, "healthcare" | "transit" | "amenities" | "school_district" | "nuisance">, number> = {
  healthcare: 0.35,
  transit: 0.25,
  amenities: 0.2,
  school_district: 0.1,
  nuisance: 0.1,
};

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
      return dimensions.flood.data_available ? dimensions.flood.score : null;
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

function weightedAvg(
  scores: Array<{ score: number; weight: number }>,
): number | null {
  if (scores.length === 0) return null;
  const totalWeight = scores.reduce((a, b) => a + b.weight, 0);
  if (totalWeight === 0) return null;
  const sum = scores.reduce((a, b) => a + b.score * b.weight, 0);
  return sum / totalWeight;
}

function grade(score: number): Grade {
  if (score >= 85) return "A";
  if (score >= 65) return "B";
  if (score >= 45) return "C";
  return "D";
}

export function computeOverall(
  dimensions: RiskReport["dimensions"],
  excluded: Set<DimensionKey> = new Set(),
): RiskReport["overall"] {
  const safetyScores = SAFETY_DIMS.filter((k) => !excluded.has(k))
    .map((k) => dimScore(dimensions, k))
    .filter((v): v is number => v != null);
  const safetyAvg = avg(safetyScores);

  const convenInputs = (
    Object.entries(CONVENIENCE_WEIGHTS) as Array<[
      Extract<DimensionKey, "healthcare" | "transit" | "amenities" | "school_district" | "nuisance">,
      number,
    ]>
  )
    .filter(([k]) => !excluded.has(k))
    .map(([k, weight]) => {
      const score = dimScore(dimensions, k);
      return score == null ? null : { score, weight };
    })
    .filter((v): v is { score: number; weight: number } => v != null);
  const convenAvg = weightedAvg(convenInputs);

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
