import { describe, expect, it } from 'vitest';
import { cashFlowCredits, outflowKind, spendingOnly, summarizeOutflows } from './accounting';
import { computeFinanceTotals } from './finance';
import { makeCashFlowLookup } from './cashFlowLookup';
import { deriveMonthlyEarnings } from './earningsDerivation';
import { EXPENSE_CATEGORIES, type Expense, type Income } from './types';

const NOV = { year: 2026, month: 10 };
const day = (d: number) => new Date(2026, 10, d);
const expense = (category: string, amount: number, d = 5): Expense => ({
  id: `${category}-${amount}-${d}`, amount, category, description: category, date: day(d), userId: 'u',
});
const income = (category: Income['category'], amount: number, d = 1): Income => ({
  id: `${category}-${amount}-${d}`, amount, category, description: category, date: day(d), userId: 'u',
});
const noRecords = () => null;

describe('outflow kinds', () => {
  it('ATM withdrawals, transfers out and investments are not spending', () => {
    expect(outflowKind('Cash Withdrawal')).toBe('cash_withdrawal');
    expect(outflowKind('Transfers')).toBe('transfer_out');
    expect(outflowKind('Investments')).toBe('investment');
  });

  it('every other expense category is genuine spending, including loans and bank charges', () => {
    const notSpending = new Set(['Cash Withdrawal', 'Transfers', 'Investments']);
    for (const category of EXPENSE_CATEGORIES) {
      expect(outflowKind(category) === 'spending', category).toBe(!notSpending.has(category));
    }
    expect(outflowKind('EMI & Loans')).toBe('spending');
    expect(outflowKind('Bank Charges')).toBe('spending');
    expect(outflowKind('Groceries')).toBe('spending');
  });
});

describe('Monthly Expenses', () => {
  const ledger = [
    expense('Groceries', 450),
    expense('Cash Withdrawal', 2000), // ATM
    expense('Transfers', 3500), // NEFT to own account
    expense('Investments', 10000), // SIP
    expense('EMI & Loans', 1500),
    expense('Bank Charges', 118),
  ];

  it('counts genuine spending only', () => {
    expect(spendingOnly(ledger).map((e) => e.category)).toEqual(['Groceries', 'EMI & Loans', 'Bank Charges']);
    const totals = computeFinanceTotals(ledger, [], 0, noRecords, NOV.year, NOV.month);
    expect(totals.totalSpent).toBe(450 + 1500 + 118);
  });

  it('keeps every outgoing rupee accounted for in exactly one bucket', () => {
    const s = summarizeOutflows(ledger);
    expect(s).toEqual({ spending: 2068, cashWithdrawals: 2000, transfersOut: 3500, investments: 10000 });
    expect(s.spending + s.cashWithdrawals + s.transfersOut + s.investments).toBe(ledger.reduce((t, e) => t + e.amount, 0));
  });

  it('a cash withdrawal followed by manually recorded cash spending counts the cash once', () => {
    const withdrawal = expense('Cash Withdrawal', 1000, 3);
    const spentInCash = expense('Food & Dining', 400, 4);
    const totals = computeFinanceTotals([withdrawal, spentInCash], [], 0, noRecords, NOV.year, NOV.month);
    expect(totals.totalSpent).toBe(400);
    expect(summarizeOutflows([withdrawal, spentInCash]).cashWithdrawals).toBe(1000);
  });

  it('does not mutate or recategorize stored records', () => {
    const before = ledger.map((e) => ({ ...e }));
    spendingOnly(ledger);
    summarizeOutflows(ledger);
    computeFinanceTotals(ledger, [], 0, noRecords, NOV.year, NOV.month);
    expect(ledger).toEqual(before);
  });
});

describe('Net cash flow', () => {
  it('earnings and refunds in, genuine spending out; transfers in are not cash in', () => {
    const incomeEntries = [income('Salary', 50000, 1), income('Refund', 500, 9), income('Transfer', 5000, 12)];
    const expenses = [expense('Groceries', 450), expense('Cash Withdrawal', 2000), expense('Investments', 10000)];
    const credits = makeCashFlowLookup(
      (y, m) => ({ entries: incomeEntries.filter((i) => i.date.getMonth() === m && i.date.getFullYear() === y), total: 0 }),
      noRecords
    );
    const totals = computeFinanceTotals(expenses, incomeEntries, 0, credits, NOV.year, NOV.month);
    expect(totals.monthlySummaries.find((m) => m.month === NOV.month)!.monthBalance).toBe(50500 - 450);
  });

  it('transfers in and transfers out both leave net cash flow unchanged', () => {
    const selfTransfer = income('Transfer', 5000);
    const selfTransferOut = expense('Transfers', 5000);
    expect(cashFlowCredits([selfTransfer])).toEqual([]);
    expect(spendingOnly([selfTransferOut])).toEqual([]);
  });

  it('a transfer in does not make a month look earned', () => {
    expect(deriveMonthlyEarnings([income('Transfer', 5000)])).toBeNull();
  });
});
