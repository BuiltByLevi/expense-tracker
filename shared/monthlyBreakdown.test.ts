import { describe, expect, it } from 'vitest';
import { monthlyBreakdown } from './accounting';
import { computeFinanceTotals } from './finance';
import { makeCashFlowLookup } from './cashFlowLookup';
import { deriveMonthlyEarnings } from './earningsDerivation';
import { entriesForMonth } from './monthFilter';
import type { Expense, Income } from './types';

const NOV = { year: 2026, month: 10 };
const d = (day: number, month = 10) => new Date(2026, month, day);
const ex = (id: string, category: string, amount: number, day = 5, month = 10): Expense => ({
  id, category, amount, description: id, date: d(day, month), userId: 'u',
});
const inc = (id: string, category: Income['category'], amount: number, day = 1, month = 10): Income => ({
  id, category, amount, description: id, date: d(day, month), userId: 'u',
});

/** One month with every kind of movement the accounting model distinguishes. */
const ledger = {
  incomes: [
    inc('salary', 'Salary', 50000, 1),
    inc('interest', 'Interest', 15.5, 30),
    inc('razorpay', 'Other Income', 2500, 3),
    inc('refund', 'Refund', 500, 9),
    inc('self-in', 'Transfer', 5000, 12), // savings moved into current account
    inc('october-salary', 'Salary', 40000, 1, 9), // a different month: excluded
  ],
  expenses: [
    ex('groceries', 'Groceries', 450, 10),
    ex('emi', 'EMI & Loans', 1500, 7),
    ex('charges', 'Bank Charges', 118, 28),
    ex('atm', 'Cash Withdrawal', 2000, 15),
    ex('cash-food', 'Food & Dining', 400, 16), // paid in cash after the ATM visit
    ex('self-out', 'Transfers', 3500, 18), // to own account
    ex('sip', 'Investments', 10000, 20),
    ex('october-rent', 'Rent', 9000, 2, 9), // a different month: excluded
  ],
};

describe('monthly figures are separate and each correct', () => {
  const b = monthlyBreakdown(ledger.expenses, ledger.incomes, NOV.year, NOV.month);

  it('Monthly Earnings: confirmed Salary, Interest and Other Income only', () => {
    expect(b.monthlyEarnings).toBe(50000 + 15.5 + 2500);
  });

  it('Monthly Expenses: genuine purchases, EMI, bank charges and cash spent later — nothing else', () => {
    expect(b.monthlyExpenses).toBe(450 + 1500 + 118 + 400);
  });

  it('each excluded movement is reported on its own line', () => {
    expect(b.refunds).toBe(500);
    expect(b.transfersIn).toBe(5000);
    expect(b.transfersOut).toBe(3500);
    expect(b.cashWithdrawals).toBe(2000);
    expect(b.investments).toBe(10000);
  });

  it('Net Cash Flow = earnings + refunds − Monthly Expenses', () => {
    expect(b.netCashFlow).toBe(52515.5 + 500 - 2468);
  });

  it('the full bank movement reconciles to the raw ledger: credits − debits', () => {
    const inMonth = (date: Date) => date.getMonth() === NOV.month;
    const credits = ledger.incomes.filter((i) => inMonth(i.date)).reduce((s, i) => s + i.amount, 0);
    const debits = ledger.expenses.filter((e) => inMonth(e.date)).reduce((s, e) => s + e.amount, 0);
    expect(b.bankNetChange).toBeCloseTo(credits - debits, 2);
  });

  it('Monthly Earnings agrees with the independent earnings derivation', () => {
    const derived = deriveMonthlyEarnings(entriesForMonth(ledger.incomes, NOV.year, NOV.month).entries);
    expect(derived!.amount).toBe(b.monthlyEarnings);
  });

  it('Net Cash Flow agrees with the dashboard\'s independent month balance', () => {
    const credits = makeCashFlowLookup((y, m) => entriesForMonth(ledger.incomes, y, m), () => null);
    const totals = computeFinanceTotals(ledger.expenses, ledger.incomes, 0, credits, NOV.year, NOV.month);
    const month = totals.monthlySummaries.find((m) => m.month === NOV.month)!;
    expect(month.spent).toBe(b.monthlyExpenses);
    expect(month.monthBalance).toBe(b.netCashFlow);
  });
});

describe('internal movements never change earnings or cash flow', () => {
  it('a self-transfer pair (in and out) leaves Net Cash Flow and Monthly Earnings unchanged', () => {
    const base = monthlyBreakdown(ledger.expenses, ledger.incomes, NOV.year, NOV.month);
    const withPair = monthlyBreakdown(
      [...ledger.expenses, ex('pair-out', 'Transfers', 7000, 22)],
      [...ledger.incomes, inc('pair-in', 'Transfer', 7000, 22)],
      NOV.year,
      NOV.month
    );
    expect(withPair.netCashFlow).toBe(base.netCashFlow);
    expect(withPair.monthlyEarnings).toBe(base.monthlyEarnings);
    expect(withPair.monthlyExpenses).toBe(base.monthlyExpenses);
    expect(withPair.transfersIn - base.transfersIn).toBe(7000);
    expect(withPair.transfersOut - base.transfersOut).toBe(7000);
  });

  it('a refund is never earnings, but it does offset spending in cash flow', () => {
    const withRefund = monthlyBreakdown([ex('x', 'Shopping', 1000)], [inc('r', 'Refund', 1000)], NOV.year, NOV.month);
    expect(withRefund.monthlyEarnings).toBe(0);
    expect(withRefund.monthlyExpenses).toBe(1000);
    expect(withRefund.netCashFlow).toBe(0);
  });

  it('an ATM withdrawal and a manual cash purchase of the same cash count once', () => {
    const b = monthlyBreakdown([ex('atm', 'Cash Withdrawal', 2000), ex('cash', 'Groceries', 2000)], [inc('s', 'Salary', 5000)], NOV.year, NOV.month);
    expect(b.monthlyExpenses).toBe(2000);
    expect(b.cashWithdrawals).toBe(2000);
    expect(b.netCashFlow).toBe(3000);
  });

  it('an investment is saved money, not spending, and still leaves the bank', () => {
    const b = monthlyBreakdown([ex('sip', 'Investments', 10000)], [inc('s', 'Salary', 50000)], NOV.year, NOV.month);
    expect(b.monthlyExpenses).toBe(0);
    expect(b.netCashFlow).toBe(50000);
    expect(b.bankNetChange).toBe(40000);
  });
});

describe('a breakdown is read-only and keeps every record', () => {
  it('does not change its inputs', () => {
    const before = JSON.stringify([ledger.expenses, ledger.incomes]);
    monthlyBreakdown(ledger.expenses, ledger.incomes, NOV.year, NOV.month);
    expect(JSON.stringify([ledger.expenses, ledger.incomes])).toBe(before);
  });

  it('excluded records are still in the ledger, classified and not dropped', () => {
    const b = monthlyBreakdown(ledger.expenses, ledger.incomes, NOV.year, NOV.month);
    const reported = b.monthlyExpenses + b.cashWithdrawals + b.transfersOut + b.investments;
    const debitsThisMonth = ledger.expenses.filter((e) => e.date.getMonth() === NOV.month).reduce((s, e) => s + e.amount, 0);
    expect(reported).toBe(debitsThisMonth);
  });
});
