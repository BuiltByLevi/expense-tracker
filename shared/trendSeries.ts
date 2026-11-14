import type { Expense } from './types';
import type { MonthlySummary } from './finance';

/** Range buttons shown above the trend charts, like a stock app's 1W / 1M / 1Y. */
export type TrendRange = '1W' | '1M' | '3M' | '6M' | '1Y' | 'ALL';

export const DAILY_RANGES: TrendRange[] = ['1W', '1M', '3M', '6M', '1Y', 'ALL'];
export const MONTHLY_RANGES: TrendRange[] = ['6M', '1Y', 'ALL'];

const RANGE_DAYS: Record<Exclude<TrendRange, 'ALL'>, number> = {
  '1W': 7, '1M': 30, '3M': 90, '6M': 182, '1Y': 365,
};
const RANGE_MONTHS: Partial<Record<TrendRange, number>> = { '6M': 6, '1Y': 12 };

export const RANGE_LABELS: Record<TrendRange, string> = {
  '1W': '7 days', '1M': '30 days', '3M': '90 days', '6M': '6 months', '1Y': '12 months', 'ALL': 'all time',
};

/** Local-calendar day number; differences between two of these are whole days. */
function dayNumber(d: Date): number {
  return Math.round(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86_400_000);
}

export interface CumulativeSpend {
  /** One entry per day in the range, oldest first. */
  dates: Date[];
  /** Running total spent from the start of the range up to each day. */
  current: number[];
  /** Same, for the equally long period just before the range. Null for ALL. */
  previous: number[] | null;
  total: number;
  previousTotal: number | null;
}

/**
 * Running total of spending, day by day, for a range ending today — plus the
 * same line for the period just before it, so the two can be compared.
 * Optionally limited to one category.
 */
export function buildCumulativeSpend(
  expenses: Pick<Expense, 'amount' | 'date' | 'category'>[],
  range: TrendRange,
  today: Date,
  category?: string,
): CumulativeSpend {
  const rows = category ? expenses.filter((e) => e.category === category) : expenses;
  const end = dayNumber(today);

  let days: number;
  if (range === 'ALL') {
    let first = end;
    for (const e of rows) first = Math.min(first, dayNumber(e.date));
    days = Math.max(2, end - first + 1);
  } else {
    days = RANGE_DAYS[range];
  }
  const start = end - days + 1;

  const cur = new Array<number>(days).fill(0);
  const prev = range === 'ALL' ? null : new Array<number>(days).fill(0);
  for (const e of rows) {
    const n = dayNumber(e.date);
    if (n >= start && n <= end) cur[n - start] += e.amount;
    else if (prev && n >= start - days && n < start) prev[n - (start - days)] += e.amount;
  }
  const accumulate = (a: number[]) => {
    let sum = 0;
    return a.map((v) => (sum += v));
  };
  const current = accumulate(cur);
  const previous = prev ? accumulate(prev) : null;

  const dates = cur.map((_, i) => new Date(today.getFullYear(), today.getMonth(), today.getDate() - (days - 1 - i)));
  return {
    dates,
    current,
    previous,
    total: current[days - 1],
    previousTotal: previous ? previous[days - 1] : null,
  };
}

/** Past and current months only, trimmed to the range (oldest first). */
export function sliceMonthlySummaries(summaries: MonthlySummary[], range: TrendRange): MonthlySummary[] {
  const past = summaries.filter((s) => !s.isFuture);
  const n = RANGE_MONTHS[range];
  return n ? past.slice(-n) : past;
}
