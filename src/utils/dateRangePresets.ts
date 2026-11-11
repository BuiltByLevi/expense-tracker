import { startOfDay, endOfDay, startOfMonth, endOfMonth, startOfYear, subDays, subMonths } from 'date-fns';

export interface DateRange {
  start: Date;
  end: Date;
}

export type QuickRangeKey = 'today' | 'yesterday' | 'last7' | 'last30' | 'thisMonth' | 'lastMonth' | 'thisYear';

export interface QuickRangeOption {
  key: QuickRangeKey;
  label: string;
  range: (now: Date) => DateRange;
}

/**
 * Pure range calculators for the banking-style quick-select filter —
 * parameterized on `now` (rather than reading `new Date()` internally) so
 * they're deterministic and unit-testable without mocking the system clock.
 */
export const QUICK_RANGE_OPTIONS: QuickRangeOption[] = [
  { key: 'today', label: 'Today', range: (now) => ({ start: startOfDay(now), end: endOfDay(now) }) },
  { key: 'yesterday', label: 'Yesterday', range: (now) => { const y = subDays(now, 1); return { start: startOfDay(y), end: endOfDay(y) }; } },
  { key: 'last7', label: 'Last 7 Days', range: (now) => ({ start: startOfDay(subDays(now, 6)), end: endOfDay(now) }) },
  { key: 'last30', label: 'Last 30 Days', range: (now) => ({ start: startOfDay(subDays(now, 29)), end: endOfDay(now) }) },
  { key: 'thisMonth', label: 'This Month', range: (now) => ({ start: startOfMonth(now), end: endOfDay(now) }) },
  { key: 'lastMonth', label: 'Last Month', range: (now) => { const m = subMonths(now, 1); return { start: startOfMonth(m), end: endOfMonth(m) }; } },
  { key: 'thisYear', label: 'This Year', range: (now) => ({ start: startOfYear(now), end: endOfDay(now) }) },
];

/** True when two ranges land on the exact same calendar days (ignoring time-of-day). */
export function sameDateRange(a: DateRange, b: DateRange): boolean {
  return startOfDay(a.start).getTime() === startOfDay(b.start).getTime() && startOfDay(a.end).getTime() === startOfDay(b.end).getTime();
}

/** True when `date` falls within [start, end] inclusive, both ends normalized to day boundaries. */
export function isWithinDateRange(date: Date, range: DateRange): boolean {
  const t = date.getTime();
  return t >= startOfDay(range.start).getTime() && t <= endOfDay(range.end).getTime();
}

/** Filters any date-stamped record list down to a date range. Shared by
 *  useDashboardData's historyExpenses/historyIncome so the two never drift. */
export function filterByDateRange<T extends { date: Date }>(items: T[], range: DateRange): T[] {
  return items.filter((item) => isWithinDateRange(item.date, range));
}
