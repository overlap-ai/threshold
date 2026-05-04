import { timeToGoal, type CashflowEntry } from './timeToGoal';

export interface OppCostInput {
  id: string;
  name: string;
  price: number;
}

export interface OppCostDelay {
  id: string;
  name: string;
  daysBefore: number | null;
  daysAfter: number | null;
  delayDays: number | null;
}

/**
 * For each `other` goal, compute how many extra days it takes to reach it
 * if `target` is purchased now (capital - target.price).
 */
export function opportunityCost(params: {
  target: OppCostInput;
  others: OppCostInput[];
  availableCapital: number;
  cashflow: CashflowEntry[];
}): OppCostDelay[] {
  const { target, others, availableCapital, cashflow } = params;
  const reduced = Math.max(0, availableCapital - target.price);
  return others.map((g) => {
    const before = timeToGoal({ goalPrice: g.price, availableCapital, cashflow });
    const after = timeToGoal({ goalPrice: g.price, availableCapital: reduced, cashflow });
    const delay =
      before.daysToGoal !== null && after.daysToGoal !== null
        ? after.daysToGoal - before.daysToGoal
        : null;
    return {
      id: g.id,
      name: g.name,
      daysBefore: before.daysToGoal,
      daysAfter: after.daysToGoal,
      delayDays: delay,
    };
  });
}
