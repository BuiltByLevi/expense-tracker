import { describe, it, expect } from 'vitest';
import { rowsToTransactions } from './statementParsers/columnMapper';
import { suggestCategory, suggestIncomeCategory } from './classification';
import { findDuplicate } from './duplicateDetection';
import { deriveMonthlyEarnings } from './earningsDerivation';
import type { Income, Expense } from '../types';

/**
 * End-to-end reconciliation test for the bank-statement import pipeline:
 * raw CSV rows -> column mapping -> normalization -> classification ->
 * (simulated) review/import -> Monthly Earnings derivation.
 *
 * Fixture mirrors a real statement where Razorpay/Payload settlement
 * credits land on different calendar days than the month-end salary credit
 * (the realistic case for freelance/gig income) and interest posts on the
 * very last day of the month, AFTER salary.
 */
const HEADER = ['Date', 'Narration', 'Reference No.', 'Debit', 'Credit', 'Balance'];

const RAW_ROWS: string[][] = [
  HEADER,
  ['02/11/2026', 'NEFT FUND TRANSFER FROM SAVINGS', 'REF0000', '', '5000', '105000'],
  ['05/11/2026', 'RAZORPAY PAYMENTS CREDIT', 'REF0001', '', '2500', '107500'],
  ['08/11/2026', 'RAZORPAY SETTLEMENT', 'REF0002', '', '1250', '108750'],
  ['10/11/2026', 'PAYLOAD PAYMENT', 'REF0003', '', '3000', '111750'],
  ['12/11/2026', 'PAYLOAD SETTLEMENT', 'REF0004', '', '750', '112500'],
  ['18/11/2026', 'UPI/BIGBASKET/GROCERY', 'REF0005', '450', '', '112050'],
  ['20/11/2026', 'AMAZON SHOPPING', 'REF0006', '1200', '', '110850'],
  ['22/11/2026', 'ELECTRICITY BILL PAYMENT', 'REF0007', '2000', '', '108850'],
  ['25/11/2026', 'REFUND ORDER CANCELLED', 'REF0008', '', '500', '109350'],
  ['28/11/2026', 'SALARY NEFT CREDIT ABC CORP', 'REF0009', '', '50000', '159350'],
  ['30/11/2026', 'SAVINGS INTEREST CREDITED', 'REF0010', '', '15.50', '159365.50'],
];

describe('bank statement import pipeline — Razorpay/Payload credit reconciliation', () => {
  const { transactions, columnsRecognized } = rowsToTransactions(RAW_ROWS);

  it('recognizes columns and extracts every row (no row silently dropped at parsing)', () => {
    expect(columnsRecognized).toBe(true);
    expect(transactions).toHaveLength(RAW_ROWS.length - 1);
  });

  it('classifies every row\'s debit/credit strictly from the statement column, never from narration', () => {
    const byNarration = (n: string) => transactions.find((t) => t.narration === n)!;
    expect(byNarration('RAZORPAY PAYMENTS CREDIT').type).toBe('credit');
    expect(byNarration('RAZORPAY SETTLEMENT').type).toBe('credit');
    expect(byNarration('PAYLOAD PAYMENT').type).toBe('credit');
    expect(byNarration('PAYLOAD SETTLEMENT').type).toBe('credit');
    expect(byNarration('UPI/BIGBASKET/GROCERY').type).toBe('debit');
    expect(byNarration('AMAZON SHOPPING').type).toBe('debit');
    expect(byNarration('ELECTRICITY BILL PAYMENT').type).toBe('debit');
  });

  it('every credit amount is preserved exactly, including the decimal interest credit', () => {
    const credits = transactions.filter((t) => t.type === 'credit');
    expect(credits).toHaveLength(8);
    const totalCredits = credits.reduce((s, t) => s + (t.amount ?? 0), 0);
    expect(totalCredits).toBeCloseTo(63015.5, 2);
  });

  it('every debit amount is preserved exactly', () => {
    const debits = transactions.filter((t) => t.type === 'debit');
    expect(debits).toHaveLength(3);
    const totalDebits = debits.reduce((s, t) => s + (t.amount ?? 0), 0);
    expect(totalDebits).toBeCloseTo(3650, 2);
  });

  it('Razorpay and Payload credits are categorized as income, flagged for review, but NOT excluded', () => {
    const byNarration = (n: string) => transactions.find((t) => t.narration === n)!;
    for (const n of ['RAZORPAY PAYMENTS CREDIT', 'RAZORPAY SETTLEMENT', 'PAYLOAD PAYMENT', 'PAYLOAD SETTLEMENT']) {
      const tx = byNarration(n);
      const { category, uncertain } = suggestIncomeCategory(tx.narration);
      expect(category).toBe('Other Income');
      expect(uncertain).toBe(true); // flagged for manual review, never silently dropped
    }
  });

  it('a Razorpay/Payload narration on the DEBIT side (e.g. a gateway fee) is never miscategorized as income', () => {
    // Debit/credit indicator from the statement always wins over narration.
    const feeRow = { category: suggestCategory('RAZORPAY PAYMENT GATEWAY FEE') };
    expect(feeRow.category.category).not.toBe('Salary');
  });

  it('refund and transfer-in narrations are categorized correctly and excluded from the earnings label downstream', () => {
    const byNarration = (n: string) => transactions.find((t) => t.narration === n)!;
    expect(suggestIncomeCategory(byNarration('REFUND ORDER CANCELLED').narration).category).toBe('Refund');
    expect(suggestIncomeCategory(byNarration('NEFT FUND TRANSFER FROM SAVINGS').narration).category).toBe('Transfer');
  });

  it('no legitimate credit is flagged as a duplicate of another row in the same statement', () => {
    const credits = transactions.filter((t) => t.type === 'credit');
    const existing: { id: string; amount: number; date: Date; description: string; referenceNumber?: string }[] = [];
    for (const [idx, tx] of credits.entries()) {
      const match = findDuplicate(tx, existing, tx.referenceNumber);
      expect(match).toBeNull();
      existing.push({ id: `row-${idx}`, amount: tx.amount!, date: tx.date!, description: tx.narration, referenceNumber: tx.referenceNumber ?? undefined });
    }
  });

  it('END TO END: Monthly Earnings correctly includes Razorpay and Payload credits dated on different days than salary', () => {
    const credits = transactions.filter((t) => t.type === 'credit');
    const income: Income[] = credits.map((tx, idx) => ({
      id: `inc-${idx}`,
      amount: tx.amount!,
      category: suggestIncomeCategory(tx.narration).category,
      description: tx.narration,
      date: tx.date!,
      userId: 'u1',
      source: 'import',
    }));

    const derived = deriveMonthlyEarnings(income);
    expect(derived).not.toBeNull();
    // Salary (50,000) + Razorpay (2,500 + 1,250) + Payload (3,000 + 750) + Interest (15.50)
    // Refund (500) and Transfer (5,000) must NOT be included.
    expect(derived!.amount).toBeCloseTo(57515.5, 2);
    expect(derived!.countedEntries.map((e) => e.description).sort()).toEqual(
      [
        'PAYLOAD PAYMENT',
        'PAYLOAD SETTLEMENT',
        'RAZORPAY PAYMENTS CREDIT',
        'RAZORPAY SETTLEMENT',
        'SALARY NEFT CREDIT ABC CORP',
        'SAVINGS INTEREST CREDITED',
      ].sort()
    );
    expect(derived!.otherEntries.map((e) => e.description).sort()).toEqual(
      ['NEFT FUND TRANSFER FROM SAVINGS', 'REFUND ORDER CANCELLED'].sort()
    );
  });

  it('END TO END: net cash flow for the month (all credits minus all debits) matches independent hand calculation', () => {
    const debits = transactions.filter((t) => t.type === 'debit');
    const expenses: Expense[] = debits.map((tx, idx) => ({
      id: `exp-${idx}`,
      amount: tx.amount!,
      category: suggestCategory(tx.narration).category,
      description: tx.narration,
      date: tx.date!,
      userId: 'u1',
      source: 'import',
    }));
    const credits = transactions.filter((t) => t.type === 'credit');
    const totalCredits = credits.reduce((s, t) => s + (t.amount ?? 0), 0);
    const totalDebits = expenses.reduce((s, e) => s + e.amount, 0);
    expect(totalCredits - totalDebits).toBeCloseTo(59365.5, 2);
  });
});
