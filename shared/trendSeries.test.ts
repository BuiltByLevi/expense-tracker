import { describe, it, expect } from 'vitest';
import { buildCumulativeSpend, sliceMonthlySummaries } from './trendSeries';
import type { MonthlySummary } from './finance';

const today = new Date(2026, 10, 15, 14, 30); // 15 Nov 2026, afternoon
const exp = (amount: number, y: number, m: number, d: number, category = 'Food') => ({
  amount, category, date: new Date(y, m, d, 9),
});

describe('buildCumulativeSpend', () => {
  it('builds a running total for the last 7 days, ending today', () => {
    const r = buildCumulativeSpend([exp(100, 2026, 10, 9), exp(50, 2026, 10, 12), exp(25, 2026, 10, 15)], '1W', today);
    expect(r.dates).toHaveLength(7);
    expect(r.dates[0].getDate()).toBe(9);
    expect(r.dates[6].getDate()).toBe(15);
    expect(r.current).toEqual([100, 100, 100, 150, 150, 150, 175]);
    expect(r.total).toBe(175);
  });

  it('puts the week before into the previous period and ignores anything older', () => {
    const r = buildCumulativeSpend([exp(40, 2026, 10, 2), exp(60, 2026, 10, 8), exp(999, 2026, 10, 1)], '1W', today);
    expect(r.previous).toEqual([40, 40, 40, 40, 40, 40, 100]);
    expect(r.previousTotal).toBe(100);
    expect(r.total).toBe(0);
  });

  it('filters by category', () => {
    const r = buildCumulativeSpend([exp(100, 2026, 10, 14), exp(70, 2026, 10, 14, 'Travel')], '1W', today, 'Travel');
    expect(r.total).toBe(70);
  });

  it('ALL starts at the first expense and has no previous period', () => {
    const r = buildCumulativeSpend([exp(10, 2026, 10, 11), exp(5, 2026, 10, 15)], 'ALL', today);
    expect(r.current).toEqual([10, 10, 10, 10, 15]);
    expect(r.previous).toBeNull();
    expect(r.previousTotal).toBeNull();
  });

  it('ALL with no expenses still returns two flat points', () => {
    expect(buildCumulativeSpend([], 'ALL', today).current).toEqual([0, 0]);
  });
});

describe('sliceMonthlySummaries', () => {
  const months = Array.from({ length: 14 }, (_, i) => ({ month: i, isFuture: i === 13 }) as MonthlySummary);
  it('drops future months and keeps the last N', () => {
    expect(sliceMonthlySummaries(months, '6M').map((s) => s.month)).toEqual([7, 8, 9, 10, 11, 12]);
    expect(sliceMonthlySummaries(months, '1Y')).toHaveLength(12);
    expect(sliceMonthlySummaries(months, 'ALL')).toHaveLength(13);
  });
});
