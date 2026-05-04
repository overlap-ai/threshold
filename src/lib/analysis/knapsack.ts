export interface KnapsackItem {
  id: string;
  price: number;
  score: number;
}

export interface KnapsackResult {
  selectedIds: string[];
  totalPrice: number;
  totalScore: number;
}

/**
 * 0/1 knapsack: choose subset that maximizes total score within budget.
 * Discretizes prices to cents to keep the DP table small.
 */
export function knapsack(items: KnapsackItem[], budget: number): KnapsackResult {
  if (budget <= 0 || items.length === 0) {
    return { selectedIds: [], totalPrice: 0, totalScore: 0 };
  }
  const cap = Math.floor(budget * 100);
  const n = items.length;
  const weights = items.map((i) => Math.max(0, Math.floor(i.price * 100)));
  const values = items.map((i) => i.score);

  const dp: Float64Array[] = Array.from({ length: n + 1 }, () => new Float64Array(cap + 1));
  for (let i = 1; i <= n; i++) {
    const w = weights[i - 1];
    const v = values[i - 1];
    for (let c = 0; c <= cap; c++) {
      dp[i][c] = dp[i - 1][c];
      if (w <= c) {
        const candidate = dp[i - 1][c - w] + v;
        if (candidate > dp[i][c]) dp[i][c] = candidate;
      }
    }
  }
  const selectedIds: string[] = [];
  let c = cap;
  for (let i = n; i >= 1; i--) {
    if (dp[i][c] !== dp[i - 1][c]) {
      selectedIds.push(items[i - 1].id);
      c -= weights[i - 1];
    }
  }
  selectedIds.reverse();
  const totalPrice =
    selectedIds.reduce((s, id) => s + (items.find((i) => i.id === id)?.price ?? 0), 0);
  return { selectedIds, totalPrice, totalScore: dp[n][cap] };
}
