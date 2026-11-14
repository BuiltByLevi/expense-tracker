import type { Income, MonthlyEarnings } from './types';
import type { EarningsLookup } from './finance';

type IncomeForMonth = (year: number, month: number) => { entries: Income[]; total: number };
type EarningsForMonth = (year: number, month: number) => MonthlyEarnings | null;

/**
 * Builds the cash-flow credits lookup used by computeFinanceTotals: EVERY
 * credit in a month (salary, interest, refunds, transfers-in alike) counts,
 * matching exactly what the Transaction Ledger totals for the same month.
 * Months with no itemized income fall back to the manual/default earnings
 * record. A month the user has explicitly overridden (record.override)
 * uses the override amount instead of the itemized total — that is the whole
 * point of an override, so Net Cash Flow and the running balance follow it
 * (the ledger still lists the real transactions). Shared by the Dashboard and the Profile page so both always show
 * the same Cumulative Net Cash Flow — a Profile stat computed any other way
 * would silently disagree with the Dashboard for the same data.
 */
export function makeCashFlowLookup(
  getIncomeForMonth: IncomeForMonth,
  getEarningsForMonth: EarningsForMonth
): EarningsLookup {
  return (year: number, month: number): MonthlyEarnings | null => {
    const record = getEarningsForMonth(year, month);
    if (record?.override) return record;
    const { entries, total } = getIncomeForMonth(year, month);
    if (entries.length > 0) {
      const lastDate = entries.reduce((max, e) => (e.date.getTime() > max.getTime() ? e.date : max), entries[0].date);
      return { year, month, amount: total, status: 'confirmed', source: 'import', updatedAt: lastDate.toISOString() };
    }
    return record;
  };
}
