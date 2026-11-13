import { describe, it, expect } from 'vitest';
import { computeFinanceTotals, type EarningsLookup } from './finance';
import { deriveMonthlyEarnings } from './earningsDerivation';
import type { Expense, Income, MonthlyEarnings } from './types';

function exp(id: string, amount: number, category: string, date: Date): Expense {
  return { id, amount, category, description: id, date, userId: 'u1' };
}
function inc(id: string, amount: number, category: Income['category'], date: Date): Income {
  return { id, amount, category, description: id, date, userId: 'u1' };
}

/** Mirrors useDashboardData's getMonthlyCashFlowCredits: cash-flow math must
 *  use EVERY credit (refunds/transfers included), not just the "earnings"
 *  label subset — see the audit write-up for why these must differ. */
function cashFlowLookup(income: Income[]): EarningsLookup {
  return (year, month): MonthlyEarnings | null => {
    const monthEntries = income.filter((i) => i.date.getFullYear() === year && i.date.getMonth() === month);
    if (monthEntries.length === 0) return null;
    const total = monthEntries.reduce((s, e) => s + e.amount, 0);
    return { year, month, amount: total, status: 'confirmed', source: 'import', updatedAt: new Date().toISOString() };
  };
}

/** Mirrors useDashboardData's "Monthly Earnings" KPI label: refund/transfer
 *  excluded, for display purposes only — must never feed cash-flow math. */
function earningsLabelLookup(income: Income[]): EarningsLookup {
  return (year, month): MonthlyEarnings | null => {
    const monthEntries = income.filter((i) => i.date.getFullYear() === year && i.date.getMonth() === month);
    const derived = deriveMonthlyEarnings(monthEntries);
    if (!derived) return null;
    return { year, month, amount: derived.amount, status: 'confirmed', source: 'import', updatedAt: derived.lastDate.toISOString() };
  };
}

describe('refund/transfer accounting — end to end (Salary 50,000 / Expenses 18,000 / Refund 1,500, same day)', () => {
  const income: Income[] = [
    inc('salary', 50000, 'Salary', new Date(2026, 10, 30)),
    inc('refund', 1500, 'Refund', new Date(2026, 10, 30)),
  ];
  const expenses: Expense[] = [exp('e1', 18000, 'Shopping', new Date(2026, 10, 5))];

  it('"Monthly Earnings" label excludes the refund (50,000, not 51,500)', () => {
    const result = computeFinanceTotals(expenses, 0, earningsLabelLookup(income), 2026, 10);
    expect(result.monthlySummaries[0].earnings).toBe(50000);
  });

  it('cash-flow math (Net Cash Flow / running balance) INCLUDES the refund — real money, just not "earnings"', () => {
    const result = computeFinanceTotals(expenses, 0, cashFlowLookup(income), 2026, 10);
    const month = result.monthlySummaries[0];
    expect(month.earnings).toBe(51500); // total credits used as the cash-flow basis
    expect(month.spent).toBe(18000);
    expect(month.monthBalance).toBe(33500); // 50,000 + 1,500 - 18,000 — matches the Ledger page's balance
    expect(result.cumulativeNetCashFlow).toBe(33500);
    expect(result.cashFlowDeficit).toBe(0);
  });

  it('the refund never silently disappears: total expenses are unaffected by it either', () => {
    const result = computeFinanceTotals(expenses, 0, cashFlowLookup(income), 2026, 10);
    expect(result.totalSpent).toBe(18000); // the original ₹18,000 purchase is still a real expense, un-netted
  });
});

describe('transfer-in accounting — single-ledger model, no multi-account assumptions', () => {
  it('a transfer-in is excluded from the "Monthly Earnings" label but still counts as cash-flow credit (same treatment as a refund)', () => {
    const income: Income[] = [
      inc('salary', 52000, 'Salary', new Date(2026, 10, 28)),
      inc('xfer', 10000, 'Transfer', new Date(2026, 10, 30)),
    ];
    const expenses: Expense[] = [exp('e1', 40000, 'Rent', new Date(2026, 10, 2))];

    const label = computeFinanceTotals(expenses, 0, earningsLabelLookup(income), 2026, 10);
    expect(label.monthlySummaries[0].earnings).toBe(52000); // transfer excluded from the label

    const cashFlow = computeFinanceTotals(expenses, 0, cashFlowLookup(income), 2026, 10);
    expect(cashFlow.monthlySummaries[0].earnings).toBe(62000); // 52,000 + 10,000 — real cash, included
    expect(cashFlow.monthlySummaries[0].monthBalance).toBe(22000); // 62,000 - 40,000
  });
});

describe('multi-month reconciliation — salary, interest, refund, transfer together', () => {
  const income: Income[] = [
    inc('sep-salary', 50000, 'Salary', new Date(2026, 8, 30)),
    inc('sep-refund', 1500, 'Refund', new Date(2026, 8, 30)),
    inc('oct-salary', 50000, 'Salary', new Date(2026, 9, 31)),
    inc('oct-interest', 120, 'Interest', new Date(2026, 9, 31)),
    inc('nov-salary', 52000, 'Salary', new Date(2026, 10, 28)),
    inc('nov-transfer', 10000, 'Transfer', new Date(2026, 10, 30)),
  ];
  const expenses: Expense[] = [
    exp('sep-e1', 18000, 'Food & Dining', new Date(2026, 8, 5)),
    exp('oct-e1', 22500, 'Shopping', new Date(2026, 9, 10)),
    exp('nov-e1', 40000, 'Rent', new Date(2026, 10, 2)),
  ];

  it('matches hand-computed expected totals across all three months', () => {
    const result = computeFinanceTotals(expenses, 0, cashFlowLookup(income), 2026, 10);
    const byMonth = (m: number) => result.monthlySummaries.find((s) => s.month === m)!;

    expect(byMonth(8).monthBalance).toBe(33500); // Sep: 50,000 + 1,500 - 18,000
    expect(byMonth(9).monthBalance).toBe(27620); // Oct: 50,000 + 120 - 22,500
    expect(byMonth(10).monthBalance).toBe(22000); // Nov: 52,000 + 10,000 - 40,000

    expect(result.cumulativeNetCashFlow).toBe(33500 + 27620 + 22000);
    expect(result.cashFlowDeficit).toBe(0);
  });
});
