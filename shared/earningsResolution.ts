import { deriveMonthlyEarnings } from './earningsDerivation';
import type { Income, MonthlyEarnings } from './types';

/**
 * The single rule for "what are this month's earnings", shared by the web
 * and mobile dashboards, the Earnings modal and Earnings History so none of
 * them can disagree.
 *
 * Precedence:
 *   1. A manual override (record.override) — the user deliberately replaced
 *      the imported total for this month.
 *   2. Imported income — the derived sum of eligible credits (salary,
 *      interest, settlements; never refunds or transfers).
 *   3. The stored manual/migrated record.
 *   4. null — caller falls back to the default earnings.
 *
 * An override only matters for months WITH imported income; for every other
 * month the stored record already wins, so `override` changes nothing there.
 */
export function resolveMonthlyEarnings(
  year: number,
  month: number,
  importedEntries: Income[],
  record: MonthlyEarnings | null
): MonthlyEarnings | null {
  if (record?.override) return record;
  const derived = deriveMonthlyEarnings(importedEntries);
  if (derived) {
    return {
      year,
      month,
      amount: derived.amount,
      status: 'confirmed',
      source: 'import',
      updatedAt: derived.lastDate.toISOString(),
    };
  }
  return record;
}

/** True when a month's figure is a manual override of imported income. */
export function isOverriddenImport(importedEntries: Income[], record: MonthlyEarnings | null): boolean {
  return !!record?.override && deriveMonthlyEarnings(importedEntries) !== null;
}
