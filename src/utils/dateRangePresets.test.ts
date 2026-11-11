import { describe, it, expect } from 'vitest';
import { QUICK_RANGE_OPTIONS, sameDateRange, isWithinDateRange, filterByDateRange } from './dateRangePresets';

const NOW = new Date(2026, 10, 15, 14, 30); // 15 Nov 2026, 2:30pm — a Sunday mid-month

describe('QUICK_RANGE_OPTIONS', () => {
  it('"Today" spans exactly the current calendar day', () => {
    const r = QUICK_RANGE_OPTIONS.find((o) => o.key === 'today')!.range(NOW);
    expect(r.start).toEqual(new Date(2026, 10, 15, 0, 0, 0, 0));
    expect(r.end).toEqual(new Date(2026, 10, 15, 23, 59, 59, 999));
  });

  it('"Yesterday" spans the previous calendar day only', () => {
    const r = QUICK_RANGE_OPTIONS.find((o) => o.key === 'yesterday')!.range(NOW);
    expect(r.start.getDate()).toBe(14);
    expect(r.end.getDate()).toBe(14);
  });

  it('"Last 7 Days" includes today and the 6 days before it (7 days total)', () => {
    const r = QUICK_RANGE_OPTIONS.find((o) => o.key === 'last7')!.range(NOW);
    expect(r.start.getDate()).toBe(9);
    expect(r.end.getDate()).toBe(15);
  });

  it('"Last 30 Days" spans 30 calendar days total (today plus the 29 days before it)', () => {
    const r = QUICK_RANGE_OPTIONS.find((o) => o.key === 'last30')!.range(NOW);
    const diffDays = Math.round((r.end.getTime() - r.start.getTime()) / 86400000);
    expect(diffDays).toBe(30);
    expect(r.start.getDate()).toBe(17); // 29 days before 15 Nov -> 17 Oct
    expect(r.start.getMonth()).toBe(9);
  });

  it('"This Month" starts on the 1st of the current month and ends today (not the end of the month)', () => {
    const r = QUICK_RANGE_OPTIONS.find((o) => o.key === 'thisMonth')!.range(NOW);
    expect(r.start).toEqual(new Date(2026, 10, 1, 0, 0, 0, 0));
    expect(r.end.getDate()).toBe(15);
  });

  it('"Last Month" spans the FULL previous calendar month, start to end', () => {
    const r = QUICK_RANGE_OPTIONS.find((o) => o.key === 'lastMonth')!.range(NOW);
    expect(r.start).toEqual(new Date(2026, 9, 1, 0, 0, 0, 0));
    expect(r.end.getDate()).toBe(31); // October has 31 days
    expect(r.end.getMonth()).toBe(9);
  });

  it('"This Year" starts Jan 1 of the current year and ends today', () => {
    const r = QUICK_RANGE_OPTIONS.find((o) => o.key === 'thisYear')!.range(NOW);
    expect(r.start).toEqual(new Date(2026, 0, 1, 0, 0, 0, 0));
    expect(r.end.getMonth()).toBe(10);
    expect(r.end.getDate()).toBe(15);
  });
});

describe('sameDateRange', () => {
  it('matches two ranges with identical calendar-day bounds regardless of time-of-day', () => {
    const a = { start: new Date(2026, 10, 1, 3, 0), end: new Date(2026, 10, 15, 23, 0) };
    const b = { start: new Date(2026, 10, 1, 9, 45), end: new Date(2026, 10, 15, 1, 15) };
    expect(sameDateRange(a, b)).toBe(true);
  });

  it('does not match ranges with different bounds', () => {
    const a = { start: new Date(2026, 10, 1), end: new Date(2026, 10, 15) };
    const b = { start: new Date(2026, 10, 2), end: new Date(2026, 10, 15) };
    expect(sameDateRange(a, b)).toBe(false);
  });
});

describe('isWithinDateRange / filterByDateRange', () => {
  const range = { start: new Date(2026, 10, 5), end: new Date(2026, 10, 10) };

  it('includes dates on the exact start and end boundary', () => {
    expect(isWithinDateRange(new Date(2026, 10, 5, 0, 0, 1), range)).toBe(true);
    expect(isWithinDateRange(new Date(2026, 10, 10, 23, 59), range)).toBe(true);
  });

  it('excludes dates just outside the boundary', () => {
    expect(isWithinDateRange(new Date(2026, 10, 4, 23, 59), range)).toBe(false);
    expect(isWithinDateRange(new Date(2026, 10, 11, 0, 0), range)).toBe(false);
  });

  it('filterByDateRange keeps only records whose date falls inside the range, across a month boundary', () => {
    const items = [
      { id: 'a', date: new Date(2026, 9, 30) }, // just before range
      { id: 'b', date: new Date(2026, 10, 7) },  // inside
      { id: 'c', date: new Date(2026, 10, 12) }, // just after range
    ];
    expect(filterByDateRange(items, range).map((i) => i.id)).toEqual(['b']);
  });

  it('never mutates the input array', () => {
    const items = [{ id: 'a', date: new Date(2026, 10, 7) }];
    const snapshot = JSON.stringify(items);
    filterByDateRange(items, range);
    expect(JSON.stringify(items)).toBe(snapshot);
  });
});
