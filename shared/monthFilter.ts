import { sumMoney } from './money';

/** Entries dated in one calendar month, by the device's local calendar —
 *  the app's single rule for which month a transaction belongs to. */
export function entriesForMonth<T extends { date: Date; amount: number }>(
  items: T[],
  year: number,
  month: number
): { entries: T[]; total: number } {
  const entries = items.filter((i) => i.date.getFullYear() === year && i.date.getMonth() === month);
  return { entries, total: sumMoney(entries.map((i) => i.amount)) };
}
