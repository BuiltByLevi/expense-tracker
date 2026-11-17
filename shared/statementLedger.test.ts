import { describe, it, expect } from 'vitest';
import { buildStatement, summarizeStatement } from './statementLedger';
import type { NormalizedTransaction } from './statementParsers/types';

const tx = (type: 'debit' | 'credit' | null, amount: number, balance: number | null, day = 1): NormalizedTransaction => ({
  date: new Date(2026, 5, day), valueDate: null, narration: 'x', referenceNumber: null, type, amount, balance, parseIssue: null,
});

describe('buildStatement', () => {
  it('runs the balance from the opening balance, oldest first', () => {
    const s = buildStatement(
      [
        { id: 'c', date: new Date(2026, 5, 3), type: 'debit' as const, amount: 30 },
        { id: 'a', date: new Date(2026, 5, 1), type: 'debit' as const, amount: 70 },
        { id: 'b', date: new Date(2026, 5, 2), type: 'credit' as const, amount: 500 },
      ],
      1000
    );
    expect(s.rows.map((r) => [r.id, r.runningBalance])).toEqual([['a', 930], ['b', 1430], ['c', 1400]]);
    expect(s).toMatchObject({ openingBalance: 1000, totalCredit: 500, totalDebit: 100, closingBalance: 1400 });
  });

  it('keeps same-day entries in the order given and does not drift on paise', () => {
    const day = new Date(2026, 5, 1);
    const s = buildStatement(
      [
        { id: 1, date: day, type: 'debit' as const, amount: 0.1 },
        { id: 2, date: day, type: 'debit' as const, amount: 0.2 },
        { id: 3, date: day, type: 'credit' as const, amount: 0.3 },
      ],
      0
    );
    expect(s.rows.map((r) => r.id)).toEqual([1, 2, 3]);
    expect(s.rows.map((r) => r.runningBalance)).toEqual([-0.1, -0.3, 0]);
    expect(s.closingBalance).toBe(0);
  });

  it('an empty month closes at its opening balance', () => {
    expect(buildStatement([], 250.5)).toMatchObject({ closingBalance: 250.5, totalCredit: 0, totalDebit: 0, rows: [] });
  });
});

describe('summarizeStatement', () => {
  it('derives the opening balance and confirms opening + credits − debits = closing', () => {
    const s = summarizeStatement([tx('debit', 70, 34643.35), tx('credit', 151, 34794.35, 2), tx('debit', 30, 34764.35, 3)]);
    expect(s).toMatchObject({
      openingBalance: 34713.35, closingBalance: 34764.35, totalDebits: 100, totalCredits: 151,
      debitCount: 2, creditCount: 1, reconciled: true, difference: 0,
    });
  });

  it('reports how far off the statement is when a row was misread or dropped', () => {
    const s = summarizeStatement([tx('debit', 70, 930), tx('debit', 30, 850, 2)]);
    expect(s.reconciled).toBe(false);
    expect(s.difference).toBe(-50);
  });

  it('is not reconciled while any row is still unread', () => {
    const s = summarizeStatement([tx('debit', 70, 930), tx(null, 30, 900, 2)]);
    expect(s.unreadCount).toBe(1);
    expect(s.reconciled).toBe(false);
  });

  it('cannot check a statement that prints no balances', () => {
    const s = summarizeStatement([tx('debit', 70, null), tx('credit', 30, null, 2)]);
    expect(s).toMatchObject({ openingBalance: null, closingBalance: null, reconciled: null, totalDebits: 70, totalCredits: 30 });
  });
});
