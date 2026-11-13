import { describe, it, expect } from 'vitest';
import { buildReviewTransactions, type ExistingRecord } from './statementReview';
import type { NormalizedTransaction } from './statementParsers/types';

function tx(overrides: Partial<NormalizedTransaction> = {}): NormalizedTransaction {
  return {
    date: new Date(2026, 10, 12),
    valueDate: null,
    narration: 'UPI/BIGBASKET/GROCERY',
    referenceNumber: null,
    type: 'debit',
    amount: 450,
    balance: null,
    parseIssue: null,
    ...overrides,
  };
}

/**
 * buildReviewTransactions is shared by the web app and the Expo app, so a
 * regression here silently changes what BOTH import. These lock the review
 * rules that decide what gets written to a user's ledger.
 */
describe('buildReviewTransactions — shared web/mobile review rules', () => {
  it('classifies debits with expense categories and credits with income categories', () => {
    const rows = buildReviewTransactions(
      [
        tx({ narration: 'UPI/BIGBASKET/GROCERY', type: 'debit' }),
        tx({ narration: 'NEFT SALARY ACME CORP', type: 'credit', amount: 50000 }),
      ],
      [],
      []
    );

    expect(rows[0].category).toBe('Groceries');
    expect(rows[1].category).toBe('Salary');
    expect(rows[1].isSalaryCandidate).toBe(true);
  });

  it('never treats a debit as income even when the narration looks like salary', () => {
    // A salary-keyword narration on the debit side must stay an expense —
    // direction comes from the statement column, never from the text.
    const [row] = buildReviewTransactions([tx({ narration: 'SALARY ADVANCE RECOVERY', type: 'debit' })], [], []);
    expect(row.isSalaryCandidate).toBe(false);
    expect(row.type).toBe('debit');
  });

  it('flags a duplicate against existing records and does NOT pre-select it', () => {
    const existing: ExistingRecord[] = [
      {
        id: 'exp-1',
        amount: 450,
        date: new Date(2026, 10, 12),
        description: 'UPI/BIGBASKET/GROCERY',
      },
    ];

    const [row] = buildReviewTransactions([tx()], existing, []);

    expect(row.duplicateOf).toBe('exp-1');
    expect(row.duplicateConfidence).not.toBeNull();
    expect(row.included).toBe(false);
  });

  it('checks credits against income records, not expense records', () => {
    const credit = tx({ type: 'credit', narration: 'INTEREST CREDIT', amount: 15.5 });
    const asIncome: ExistingRecord[] = [
      { id: 'inc-1', amount: 15.5, date: new Date(2026, 10, 12), description: 'INTEREST CREDIT' },
    ];

    // Same record sitting in the EXPENSE list must not match a credit row.
    const [notMatched] = buildReviewTransactions([credit], asIncome, []);
    expect(notMatched.duplicateOf).toBeNull();
    expect(notMatched.included).toBe(true);

    const [matched] = buildReviewTransactions([credit], [], asIncome);
    expect(matched.duplicateOf).toBe('inc-1');
    expect(matched.included).toBe(false);
  });

  it('does not pre-select rows missing a type or a date', () => {
    const rows = buildReviewTransactions(
      [tx({ type: null }), tx({ date: null }), tx()],
      [],
      []
    );

    expect(rows[0].included).toBe(false);
    expect(rows[1].included).toBe(false);
    expect(rows[2].included).toBe(true);
  });

  it('marks a row uncertain when the parser reported an issue', () => {
    const [row] = buildReviewTransactions(
      [tx({ parseIssue: 'Debit/credit direction inferred from balance change — please verify' })],
      [],
      []
    );
    expect(row.uncertain).toBe(true);
  });

  it('gives every row a distinct rowId, including same-amount same-day rows', () => {
    const rows = buildReviewTransactions([tx(), tx(), tx()], [], []);
    expect(new Set(rows.map((r) => r.rowId)).size).toBe(3);
  });

  it('keeps the original narration as the default description', () => {
    const [row] = buildReviewTransactions([tx({ narration: 'ELECTRICITY BILL PAYMENT' })], [], []);
    expect(row.description).toBe('ELECTRICITY BILL PAYMENT');
    expect(row.category).toBe('Bills & Utilities');
  });
});
