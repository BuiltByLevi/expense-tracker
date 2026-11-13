import type { Income } from './types';

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

/**
 * "Monthly Earnings" for a month with imported income is the sum of EVERY
 * eligible credit in that month — salary, interest, Razorpay/Payload
 * settlements, or any other genuine income, regardless of which calendar
 * day it landed on. Only refunds and transfers are excluded (see
 * NON_EARNINGS_CATEGORIES) since those are real cash but not earned income.
 *
 * This deliberately does NOT restrict counting to the month's single
 * latest-dated transaction's calendar day. An earlier version did exactly
 * that (salary is reliably credited on the last day of the month, so "just
 * that day" seemed like a safe way to exclude interest/refunds/transfers
 * landing earlier) — but it silently dropped every other genuine income
 * source dated on a different day, e.g. gig/freelance settlements (Razorpay,
 * Payload) that post throughout the month rather than on salary day, or
 * interest posted on a day later than salary. Category alone (not date)
 * already correctly distinguishes real earnings from refunds/transfers, so
 * no day-based narrowing is needed or safe.
 */
export function deriveMonthlyEarnings(entries: Income[]): DerivedEarnings | null {
  if (entries.length === 0) return null;

  const countedEntries = entries.filter((e) => !NON_EARNINGS_CATEGORIES.has(e.category));
  if (countedEntries.length === 0) return null;

  const otherEntries = entries.filter((e) => NON_EARNINGS_CATEGORIES.has(e.category));
  const amount = countedEntries.reduce((s, e) => s + e.amount, 0);

  let latest = countedEntries[0];
  for (const e of countedEntries) {
    if (e.date.getTime() > latest.date.getTime()) latest = e;
  }

  return { amount, lastDate: latest.date, countedEntries, otherEntries };
}
