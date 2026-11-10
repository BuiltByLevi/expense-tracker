import type { Income } from '../types';

export interface DerivedEarnings {
  amount: number;
  lastDate: Date;
  countedEntries: Income[];
  otherEntries: Income[];
}

// Refunds and inter-account transfers are never earnings — a refund or
// transfer that happens to land on the same day as salary must not inflate
// the derived "Monthly Earnings" figure (and therefore cash-flow/net-worth
// calculations downstream).
const NON_EARNINGS_CATEGORIES = new Set(['Refund', 'Transfer']);

/** Calendar-day key (not exact timestamp) — see comment below on why. */
function dayKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

/**
 * Salary is reliably credited on the last day of the month, so "Monthly
 * Earnings" for a month with imported income is the sum of entries dated on
 * that month's LATEST transaction date — not a sum of every credit, which
 * would also pull in interest, refunds, or P2P transfers received earlier
 * in the month and inflate the figure beyond actual salary.
 */
export function deriveMonthlyEarnings(entries: Income[]): DerivedEarnings | null {
  if (entries.length === 0) return null;

  const eligible = entries.filter((e) => !NON_EARNINGS_CATEGORIES.has(e.category));
  if (eligible.length === 0) return null;

  // Group by calendar day rather than exact Date#getTime(): parsed statement
  // rows don't all carry the same time-of-day, so two entries truly on the
  // same date can otherwise fail an exact-timestamp equality check and get
  // wrongly split apart (silently under-counting earnings).
  let latest = eligible[0];
  for (const e of eligible) {
    if (e.date.getTime() > latest.date.getTime()) latest = e;
  }
  const maxKey = dayKey(latest.date);

  const countedEntries = entries.filter((e) => !NON_EARNINGS_CATEGORIES.has(e.category) && dayKey(e.date) === maxKey);
  const otherEntries = entries.filter((e) => NON_EARNINGS_CATEGORIES.has(e.category) || dayKey(e.date) !== maxKey);
  const amount = countedEntries.reduce((s, e) => s + e.amount, 0);
  return { amount, lastDate: latest.date, countedEntries, otherEntries };
}
