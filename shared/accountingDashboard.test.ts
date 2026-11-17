import { describe, expect, it } from 'vitest';
import { breakdownForPeriod, inPeriod, monthlyBreakdown } from './accounting';
import { computeFinanceTotals } from './finance';
import { computeBudgetStatuses, isBudgetableCategory } from './budgets';
import { ACCOUNTING_STRINGS, accountingStrings } from './i18n/accountingStrings';
import { APP_LANGUAGES } from './i18n/types';
import type { Expense, Income } from './types';

const base = { userId: 'u1', source: 'import' as const };
const exp = (id: string, category: Expense['category'], amount: number, date: string): Expense =>
  ({ ...base, id, category, amount, description: id, date: new Date(date) } as Expense);
const inc = (id: string, category: Income['category'], amount: number, date: string): Income =>
  ({ ...base, id, category, amount, description: id, date: new Date(date) } as Income);

// Noon-UTC dates keep the calendar day stable across viewer time zones.
const EXPENSES: Expense[] = [
  exp('food', 'Food & Dining', 1000, '2026-03-05T12:00:00Z'),
  exp('bill', 'Bills & Utilities', 500, '2026-03-20T12:00:00Z'),
  exp('atm', 'Cash Withdrawal', 2000, '2026-03-10T12:00:00Z'),
  exp('move', 'Transfers', 3000, '2026-03-12T12:00:00Z'),
  exp('sip', 'Investments', 4000, '2026-03-15T12:00:00Z'),
  exp('food-apr', 'Food & Dining', 700, '2026-04-02T12:00:00Z'),
  exp('atm-2025', 'Cash Withdrawal', 900, '2025-12-30T12:00:00Z'),
];
const INCOME: Income[] = [
  inc('salary', 'Salary', 50000, '2026-03-28T12:00:00Z'),
  inc('refund', 'Refund', 300, '2026-03-25T12:00:00Z'),
  inc('in', 'Transfer', 8000, '2026-03-14T12:00:00Z'),
  inc('interest', 'Interest', 120, '2026-04-01T12:00:00Z'),
];

describe('dashboard figures — one source of truth', () => {
  it('the dashboard month figure equals the breakdown Monthly Expenses (spending only)', () => {
    const b = monthlyBreakdown(EXPENSES, INCOME, 2026, 2);
    expect(b.monthlyExpenses).toBe(1500);
    expect(b.cashWithdrawals).toBe(2000);
    expect(b.transfersOut).toBe(3000);
    expect(b.investments).toBe(4000);
  });

  it('monthly Net Cash Flow matches the finance summary when earnings are the same figure', () => {
    const b = monthlyBreakdown(EXPENSES, INCOME, 2026, 2);
    // Finance summary uses earnings from the lookup only; supply the breakdown's earnings.
    const totals = computeFinanceTotals(EXPENSES, INCOME, 0, () => ({ amount: b.monthlyEarnings, status: 'confirmed' } as never), 2026, 2);
    const march = totals.monthlySummaries.find((m) => m.year === 2026 && m.month === 2)!;
    expect(march.spent).toBe(b.monthlyExpenses);
    expect(march.monthBalance).toBe(b.monthlyEarnings - b.monthlyExpenses);
  });

  it('Transfers In never change earnings or cash flow', () => {
    const without = monthlyBreakdown(EXPENSES, INCOME.filter((i) => i.id !== 'in'), 2026, 2);
    const withIt = monthlyBreakdown(EXPENSES, INCOME, 2026, 2);
    expect(withIt.monthlyEarnings).toBe(without.monthlyEarnings);
    expect(withIt.netCashFlow).toBe(without.netCashFlow);
    expect(withIt.transfersIn).toBe(8000);
  });

  it('Refunds offset spending in cash flow but are not earnings', () => {
    const b = monthlyBreakdown(EXPENSES, INCOME, 2026, 2);
    expect(b.refunds).toBe(300);
    expect(b.monthlyEarnings).toBe(50000);
    expect(b.netCashFlow).toBe(50000 + 300 - 1500);
  });

  it('excluded movements stay visible in their own breakdown lines (never dropped)', () => {
    const b = monthlyBreakdown(EXPENSES, INCOME, 2026, 2);
    expect(b.cashWithdrawals + b.transfersOut + b.investments).toBe(9000);
  });

  it('Bank net movement equals every credit minus every debit for the period', () => {
    const b = monthlyBreakdown(EXPENSES, INCOME, 2026, 2);
    const credits = INCOME.filter((i) => i.date.getMonth() === 2).reduce((s, i) => s + i.amount, 0);
    const debits = EXPENSES.filter((e) => e.date.getMonth() === 2).reduce((s, e) => s + e.amount, 0);
    expect(b.bankNetChange).toBe(credits - debits);
  });
});

describe('monthly vs yearly filtering', () => {
  it('the year total equals the sum of its twelve months for every figure', () => {
    const year = breakdownForPeriod(EXPENSES, INCOME, { kind: 'year', year: 2026 });
    const months = Array.from({ length: 12 }, (_, m) => monthlyBreakdown(EXPENSES, INCOME, 2026, m));
    const sum = (k: keyof typeof year) => months.reduce((s, m) => s + (m[k] as number), 0);
    for (const k of ['monthlyEarnings', 'monthlyExpenses', 'netCashFlow', 'transfersIn', 'transfersOut', 'cashWithdrawals', 'investments', 'refunds', 'bankNetChange'] as const) {
      expect(year[k], k).toBeCloseTo(sum(k), 2);
    }
  });

  it('a year period excludes December of the previous year', () => {
    const year = breakdownForPeriod(EXPENSES, INCOME, { kind: 'year', year: 2026 });
    expect(year.cashWithdrawals).toBe(2000); // the 2025-12-30 ATM withdrawal is not in 2026
  });

  it('inPeriod honours calendar months and years', () => {
    expect(inPeriod(new Date('2026-03-05T12:00:00Z'), { kind: 'month', year: 2026, month: 2 })).toBe(true);
    expect(inPeriod(new Date('2026-03-05T12:00:00Z'), { kind: 'month', year: 2026, month: 3 })).toBe(false);
    expect(inPeriod(new Date('2026-12-31T12:00:00Z'), { kind: 'year', year: 2026 })).toBe(true);
  });
});

describe('budget consistency — same expense definition as the totals', () => {
  it('ATM, transfer and investment categories cannot have budgets', () => {
    expect(isBudgetableCategory('Cash Withdrawal')).toBe(false);
    expect(isBudgetableCategory('Transfers')).toBe(false);
    expect(isBudgetableCategory('Investments')).toBe(false);
    expect(isBudgetableCategory('Food & Dining')).toBe(true);
  });

  it('a stored budget on a non-spending category is ignored and its outflow is not counted', () => {
    const statuses = computeBudgetStatuses(
      { 'Food & Dining': 2000, Investments: 1000, Transfers: 1000, 'Cash Withdrawal': 1000 },
      EXPENSES.filter((e) => e.date.getMonth() === 2).map((e) => ({ category: e.category, amount: e.amount })),
    );
    expect(statuses.map((s) => s.category)).toEqual(['Food & Dining']);
    expect(statuses[0].spent).toBe(1000);
  });

  it('a budget total for a month equals the Monthly Expenses figure when every category is budgeted', () => {
    const march = EXPENSES.filter((e) => e.date.getMonth() === 2).map((e) => ({ category: e.category, amount: e.amount }));
    const spendingCategories = [...new Set(march.map((e) => e.category))].filter(isBudgetableCategory);
    const budgets = Object.fromEntries(spendingCategories.map((c) => [c, 10000]));
    const statuses = computeBudgetStatuses(budgets, march);
    const budgetedSpent = statuses.reduce((s, x) => s + x.spent, 0);
    expect(budgetedSpent).toBe(monthlyBreakdown(EXPENSES, INCOME, 2026, 2).monthlyExpenses);
  });
});

describe('accounting labels — every app language has every key', () => {
  const keys = Object.keys(ACCOUNTING_STRINGS.en).sort();
  it.each(APP_LANGUAGES)('%s has the same keys and no empty text', (lang) => {
    expect(Object.keys(ACCOUNTING_STRINGS[lang]).sort()).toEqual(keys);
    for (const k of keys) expect(ACCOUNTING_STRINGS[lang][k as keyof typeof ACCOUNTING_STRINGS.en].trim().length).toBeGreaterThan(0);
  });

  it('falls back to English for an unknown language value', () => {
    expect(accountingStrings('xx' as never)).toBe(ACCOUNTING_STRINGS.en);
  });
});

describe('dashboard edge cases — empty months, transitions, refunds', () => {
  it('an empty month reports zero for every figure', () => {
    const b = monthlyBreakdown(EXPENSES, INCOME, 2026, 0); // January 2026 has no records
    expect(b).toMatchObject({
      monthlyEarnings: 0, monthlyExpenses: 0, netCashFlow: 0, transfersIn: 0,
      transfersOut: 0, cashWithdrawals: 0, investments: 0, refunds: 0, bankNetChange: 0,
    });
  });

  it('a year with no records reports zero, not NaN', () => {
    const b = breakdownForPeriod(EXPENSES, INCOME, { kind: 'year', year: 2031 });
    expect(Object.values(b).every((v) => v === 0)).toBe(true);
  });

  it('month transition: December 2025 and January 2026 are separate, and the ATM on 30 Dec belongs to 2025', () => {
    const dec = monthlyBreakdown(EXPENSES, INCOME, 2025, 11);
    const jan = monthlyBreakdown(EXPENSES, INCOME, 2026, 0);
    expect(dec.cashWithdrawals).toBe(900);
    expect(jan.cashWithdrawals).toBe(0);
  });

  it('refunds reduce Net Cash Flow but never raise Monthly Earnings', () => {
    const withRefund = monthlyBreakdown(EXPENSES, INCOME, 2026, 2);
    const noRefund = monthlyBreakdown(EXPENSES, INCOME.filter((i) => i.category !== 'Refund'), 2026, 2);
    expect(withRefund.monthlyEarnings).toBe(noRefund.monthlyEarnings);
    expect(withRefund.netCashFlow - noRefund.netCashFlow).toBe(300);
  });

  it('breakdown does not change the input arrays (historical records are only read)', () => {
    const before = JSON.stringify([EXPENSES, INCOME]);
    monthlyBreakdown(EXPENSES, INCOME, 2026, 2);
    breakdownForPeriod(EXPENSES, INCOME, { kind: 'year', year: 2026 });
    expect(JSON.stringify([EXPENSES, INCOME])).toBe(before);
  });
});

describe('budget regression — spending reduces budget, excluded outflows do not', () => {
  const march = EXPENSES.filter((e) => inPeriod(e.date, { kind: 'month', year: 2026, month: 2 })).map((e) => ({ category: e.category, amount: e.amount }));

  it('normal spending reduces the remaining budget', () => {
    const [food] = computeBudgetStatuses({ 'Food & Dining': 2000 }, march);
    expect(food.spent).toBe(1000);
    expect(food.remaining).toBe(1000);
  });

  it('ATM, transfers and investments do not reduce any spending budget', () => {
    const noisy = [...march, { category: 'Cash Withdrawal', amount: 99999 }, { category: 'Transfers', amount: 99999 }, { category: 'Investments', amount: 99999 }];
    const clean = computeBudgetStatuses({ 'Food & Dining': 2000 }, march);
    expect(computeBudgetStatuses({ 'Food & Dining': 2000 }, noisy)).toEqual(clean);
  });

  it('stored budget records are preserved — computing statuses does not change them', () => {
    const stored = { 'Food & Dining': 2000, Investments: 1000 };
    const before = JSON.stringify(stored);
    computeBudgetStatuses(stored, march);
    expect(JSON.stringify(stored)).toBe(before);
  });

  it('monthly budgets only count that month; the yearly spend is the sum of monthly spends', () => {
    const all = EXPENSES.map((e) => ({ category: e.category, amount: e.amount }));
    const monthSpend = (m: number) => computeBudgetStatuses({ 'Food & Dining': 1e9 }, EXPENSES.filter((e) => inPeriod(e.date, { kind: 'month', year: 2026, month: m })).map((e) => ({ category: e.category, amount: e.amount })))[0]?.spent ?? 0;
    const yearFood = computeBudgetStatuses({ 'Food & Dining': 1e9 }, all)[0].spent;
    const summed = Array.from({ length: 12 }, (_, m) => monthSpend(m)).reduce((s, x) => s + x, 0);
    expect(yearFood).toBe(1700); // food: 1000 in March + 700 in April
    expect(summed).toBe(1700);
  });
});
