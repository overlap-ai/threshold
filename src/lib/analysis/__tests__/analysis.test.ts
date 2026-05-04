import { describe, expect, it } from 'vitest';
import {
  knapsack,
  projectIncome,
  timeToGoal,
  weightedScore,
} from '../index';

describe('weightedScore', () => {
  it('returns mean when weights are equal', () => {
    const score = weightedScore({ urgency: 5, importance: 3, roi: 1 });
    expect(score).toBeCloseTo(3);
  });

  it('respects custom weights', () => {
    const score = weightedScore(
      { urgency: 5, importance: 3, roi: 1 },
      { urgency: 4, importance: 1, roi: 1 },
    );
    expect(score).toBeCloseTo((5 * 4 + 3 + 1) / 6);
  });
});

describe('knapsack', () => {
  it('maximizes score within budget', () => {
    const result = knapsack(
      [
        { id: 'a', price: 60, score: 10 },
        { id: 'b', price: 100, score: 20 },
        { id: 'c', price: 120, score: 28 },
      ],
      160,
    );
    expect(result.selectedIds.sort()).toEqual(['a', 'b']);
    expect(result.totalScore).toBeCloseTo(30);
  });

  it('returns empty when budget is zero', () => {
    const result = knapsack([{ id: 'a', price: 10, score: 1 }], 0);
    expect(result.selectedIds).toEqual([]);
  });
});

describe('timeToGoal', () => {
  it('detects achievable now', () => {
    const r = timeToGoal({ goalPrice: 100, availableCapital: 200, cashflow: [] });
    expect(r.achievableNow).toBe(true);
    expect(r.daysToGoal).toBe(0);
  });

  it('counts entries needed', () => {
    const today = new Date();
    const flow = Array.from({ length: 3 }, (_, i) => ({
      date: new Date(today.getTime() + (i + 1) * 30 * 86400 * 1000),
      amount: 1000,
    }));
    const r = timeToGoal({ goalPrice: 2500, availableCapital: 0, cashflow: flow });
    expect(r.entriesNeeded).toBe(3);
    expect(r.totalNeeded).toBe(2500);
  });

  it('returns null daysToGoal when never reached', () => {
    const r = timeToGoal({ goalPrice: 10000, availableCapital: 0, cashflow: [] });
    expect(r.daysToGoal).toBeNull();
  });
});

describe('projectIncome', () => {
  it('projects monthly income within horizon', () => {
    const today = new Date();
    const next = new Date(today.getTime() + 5 * 86400 * 1000);
    const entries = projectIncome(
      { amount: 100, currency: 'MXN', frequency: 'monthly', nextDate: next },
      90,
    );
    expect(entries.length).toBeGreaterThanOrEqual(2);
  });
});
