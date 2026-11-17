import { describe, it, expect } from 'vitest';
import { buildReviewTransactions, statementOrderedDate } from './statementReview';
import { extractReferenceNumber } from './statementParsers/referenceNumber';
import type { NormalizedTransaction } from './statementParsers/types';

const tx = (day: number, amount: number, narration: string): NormalizedTransaction => ({
  date: new Date(2026, 5, day), valueDate: null, narration, referenceNumber: extractReferenceNumber(narration),
  type: 'debit', amount, balance: null, parseIssue: null,
});

describe('buildReviewTransactions ordering', () => {
  it('numbers same-day rows in statement order and stores them in that order', () => {
    const rows = buildReviewTransactions([tx(1, 10, 'A'), tx(1, 20, 'B'), tx(2, 30, 'C'), tx(1, 40, 'D')], [], []);
    expect(rows.map((r) => r.sequence)).toEqual([0, 1, 0, 2]);
    const stored = rows.map((r) => statementOrderedDate({ date: r.date as Date, sequence: r.sequence }));
    expect(stored[1].getTime() - stored[0].getTime()).toBe(1000);
    expect(stored.every((d, i) => d.getDate() === (rows[i].date as Date).getDate())).toBe(true);
  });

  it('flips a newest-first statement to oldest-first', () => {
    const rows = buildReviewTransactions([tx(3, 30, 'C'), tx(2, 20, 'B'), tx(1, 10, 'A')], [], []);
    expect(rows.map((r) => r.narration)).toEqual(['A', 'B', 'C']);
  });

  it('re-importing a row already stored with a time offset and reference is an exact duplicate', () => {
    const narration = 'UPI/Shop/shop@upi/Paid/YES BANK/651827240101/YCD391';
    const existing = [{ id: 'e1', amount: 70, date: new Date(2026, 5, 1, 0, 0, 7), description: narration, referenceNumber: '651827240101' }];
    const [row] = buildReviewTransactions([tx(1, 70, narration)], existing, []);
    expect(row.duplicateConfidence).toBe('exact');
    expect(row.included).toBe(false);
  });

  it('two same-day payments to the same shop with different references are both kept', () => {
    const existing = [{ id: 'e1', amount: 70, date: new Date(2026, 5, 1), description: 'UPI/Shop/shop@upi/651827240101/X', referenceNumber: '651827240101' }];
    const [row] = buildReviewTransactions([tx(1, 70, 'UPI/Shop/shop@upi/651827249999/Y')], existing, []);
    expect(row.duplicateOf).toBeNull();
    expect(row.included).toBe(true);
  });
});
