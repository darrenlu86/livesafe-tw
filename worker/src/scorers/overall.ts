/**
 * 總評：等權重平均各維度分數，映射為 A/B/C/D 四段。
 */
import type { Grade, RiskReport } from "../types";

export function computeOverall(dimensions: RiskReport["dimensions"]): {
  grade: Grade;
  score: number;
} {
  const scores = [
    dimensions.healthcare.score,
    dimensions.amenities.score,
    dimensions.air_quality.score,
    dimensions.earthquake.score,
  ];
  const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
  const score = Math.round(avg);

  let grade: Grade;
  if (score >= 80) grade = "A";
  else if (score >= 60) grade = "B";
  else if (score >= 40) grade = "C";
  else grade = "D";

  return { grade, score };
}
