import type { IncomeFrequency } from '@/lib/types/database';

export interface CashflowEntry {
  date: Date;
  amount: number;
}

export interface ProjectionInput {
  amount: number;
  currency: string;
  frequency: IncomeFrequency;
  nextDate: Date;
}

const MS_DAY = 24 * 60 * 60 * 1000;

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * MS_DAY);
}

function addMonths(date: Date, months: number): Date {
  const out = new Date(date);
  out.setMonth(out.getMonth() + months);
  return out;
}

export function projectIncome(
  source: ProjectionInput,
  horizonDays: number,
  fxRate: (currency: string) => number = () => 1,
): CashflowEntry[] {
  const out: CashflowEntry[] = [];
  const end = addDays(new Date(), horizonDays);
  const rate = fxRate(source.currency);
  const amount = source.amount * rate;
  let cursor = new Date(source.nextDate);

  if (source.frequency === 'one_time') {
    if (cursor <= end) out.push({ date: cursor, amount });
    return out;
  }

  while (cursor <= end) {
    out.push({ date: new Date(cursor), amount });
    if (source.frequency === 'weekly') cursor = addDays(cursor, 7);
    else if (source.frequency === 'biweekly') cursor = addDays(cursor, 14);
    else cursor = addMonths(cursor, 1);
  }
  return out;
}

export function projectAll(
  sources: ProjectionInput[],
  horizonDays: number,
  fxRate: (currency: string) => number = () => 1,
): CashflowEntry[] {
  return sources
    .flatMap((s) => projectIncome(s, horizonDays, fxRate))
    .sort((a, b) => a.date.getTime() - b.date.getTime());
}

export interface TimeToGoalResult {
  achievableNow: boolean;
  totalNeeded: number;
  daysToGoal: number | null;
  entriesNeeded: number;
  reachedAt: Date | null;
}

export function timeToGoal(params: {
  goalPrice: number;
  availableCapital: number;
  cashflow: CashflowEntry[];
}): TimeToGoalResult {
  const { goalPrice, availableCapital, cashflow } = params;
  if (availableCapital >= goalPrice) {
    return {
      achievableNow: true,
      totalNeeded: 0,
      daysToGoal: 0,
      entriesNeeded: 0,
      reachedAt: new Date(),
    };
  }
  let acc = availableCapital;
  let entries = 0;
  for (const entry of cashflow) {
    acc += entry.amount;
    entries += 1;
    if (acc >= goalPrice) {
      const daysToGoal = Math.ceil(
        (entry.date.getTime() - Date.now()) / MS_DAY,
      );
      return {
        achievableNow: false,
        totalNeeded: goalPrice - availableCapital,
        daysToGoal: Math.max(0, daysToGoal),
        entriesNeeded: entries,
        reachedAt: entry.date,
      };
    }
  }
  return {
    achievableNow: false,
    totalNeeded: goalPrice - availableCapital,
    daysToGoal: null,
    entriesNeeded: 0,
    reachedAt: null,
  };
}
