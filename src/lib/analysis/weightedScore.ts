export interface ScoreInput {
  urgency: number;
  importance: number;
  roi: number;
}

export interface ScoreWeights {
  urgency: number;
  importance: number;
  roi: number;
}

export const DEFAULT_WEIGHTS: ScoreWeights = { urgency: 1, importance: 1, roi: 1 };

export function weightedScore(item: ScoreInput, weights: ScoreWeights = DEFAULT_WEIGHTS): number {
  const total = weights.urgency + weights.importance + weights.roi;
  if (total <= 0) return 0;
  return (
    (item.urgency * weights.urgency +
      item.importance * weights.importance +
      item.roi * weights.roi) /
    total
  );
}

export function normalizedScore(item: ScoreInput, weights: ScoreWeights = DEFAULT_WEIGHTS): number {
  return weightedScore(item, weights) / 5;
}
