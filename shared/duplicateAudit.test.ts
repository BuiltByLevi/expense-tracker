import { describe, expect, it } from 'vitest';
import { buildReviewTransactions } from './statementReview';
import { findDuplicate } from './duplicateDetection';
import { referenceKey } from './statementParsers/referenceNumber';
import type { NormalizedTransaction } from './statementParsers/types';

type Stored = { id: string; amount: number; date: Date; description: string; referenceNumber?: string; originalNarration?: string };

const nov = (d: number) => new Date(2026, 10, d);
const debit = (narration: string, amount: number, day = 10, referenceNumber: string | null = null): NormalizedTransaction => ({
  date: nov(day), valueDate: null, narration, referenceNumber, type: 'debit', amount, balance: null, parseIssue: null,
});
const stored = (id: string, narration: string, amount: number, day = 10, referenceNumber?: string): Stored => ({
  id, amount, date: nov(day), description: narration, referenceNumber, originalNarration: narration,
});
const dupOf = (rows: ReturnType<typeof buildReviewTransactions>) => rows.map((r) => r.duplicateOf);

describe('same date and amount, different transactions', () => {
  it('two different payments of the same amount on the same day are not flagged against an unrelated record', () => {
    const rows = buildReviewTransactions(
      [debit('UPI/SWIGGY ORDER 4411', 250), debit('UPI/ZOMATO DELIVERY 9988', 250)],
      [stored('e1', 'UPI/BOOKMYSHOW TICKETS', 250)],
      []
    );
    expect(dupOf(rows)).toEqual([null, null]);
    expect(rows.every((r) => r.included)).toBe(true);
  });

  it('a genuine same-day same-amount pair in the statement itself is never flagged against each other', () => {
    const rows = buildReviewTransactions([debit('UPI/CHAI POINT', 20), debit('UPI/CHAI POINT', 20)], [], []);
    expect(dupOf(rows)).toEqual([null, null]);
    expect(rows.every((r) => r.included)).toBe(true);
  });
});

describe('bank references', () => {
  it('different references on both sides are never a duplicate, even with the same amount, day and narration', () => {
    const match = findDuplicate(debit('UPI PAYMENT TO SHOP', 500, 10, '600000000001') as NormalizedTransaction, [stored('e1', 'UPI PAYMENT TO SHOP', 500, 10, '600000000002')], '600000000001');
    expect(match).toBeNull();
  });

  it('the same reference, amount and day is an exact duplicate', () => {
    const rows = buildReviewTransactions(
      [debit('UPI/SHOP/600000000001', 500, 10, '600000000001')],
      [stored('e1', 'UPI SHOP', 500, 10, '600000000001')],
      []
    );
    expect(rows[0].duplicateConfidence).toBe('exact');
    expect(rows[0].included).toBe(false);
  });

  it('a missing reference on one side falls back to the text check, which needs a corroborating narration', () => {
    const withText = buildReviewTransactions([debit('UPI/SHOP NAME/PAID', 500, 10)], [stored('e1', 'UPI/SHOP NAME/PAID', 500, 10, '600000000001')], []);
    expect(withText[0].duplicateConfidence).toBe('likely');
    const unrelated = buildReviewTransactions([debit('UPI/OTHER PERSON', 500, 10)], [stored('e1', 'UPI/SHOP NAME/PAID', 500, 10, '600000000001')], []);
    expect(unrelated[0].duplicateOf).toBeNull();
  });

  it('identical narrations with no references are "likely" only, and never auto-excluded as exact', () => {
    const rows = buildReviewTransactions([debit('ATM WDL PUNE', 2000)], [stored('e1', 'ATM WDL PUNE', 2000)], []);
    expect(rows[0].duplicateConfidence).toBe('likely');
    expect(rows[0].included).toBe(false);
  });

  it('different narrations with the same transaction ID but different amounts are not duplicates', () => {
    const match = findDuplicate(debit('NEFT-AAA600000000009-ACME', 100, 10, '600000000009') as NormalizedTransaction, [stored('e1', 'NEFT-AAA600000000009-ACME', 900, 10, '600000000009')], '600000000009');
    expect(match).toBeNull();
  });

  it('cross-format: a CSV reference column matches the same reference printed in a PDF narration', () => {
    expect(referenceKey('0000412345678901')).toBe(referenceKey('412345678901'));
    const rows = buildReviewTransactions(
      [debit('UPI/412345678901/CAFE', 180, 12, '412345678901')],
      [stored('e1', 'CAFE', 180, 12, '0000412345678901')],
      []
    );
    expect(rows[0].duplicateConfidence).toBe('exact');
  });

  it('placeholder references ("0000", "NA") are treated as missing, not as a shared reference', () => {
    expect(referenceKey('0000000000')).toBeNull();
    expect(referenceKey('NA')).toBeNull();
    const rows = buildReviewTransactions([debit('UPI/RAMESH KUMAR', 75, 10, '0000000000')], [stored('e1', 'UPI/SURESH PATIL', 75, 10, 'NA')], []);
    expect(rows[0].duplicateOf).toBeNull();
  });
});

describe('overlapping statements', () => {
  it('re-importing the same rows flags each once, and a new row alongside them stays selected', () => {
    const first = [debit('UPI/A SHOP', 100, 3), debit('UPI/B SHOP', 200, 4)];
    const existing = [stored('e1', 'UPI/A SHOP', 100, 3), stored('e2', 'UPI/B SHOP', 200, 4)];
    const rows = buildReviewTransactions([...first, debit('UPI/C SHOP', 300, 5)], existing, []);
    expect(dupOf(rows)).toEqual(['e1', 'e2', null]);
    expect(rows.map((r) => r.included)).toEqual([false, false, true]);
  });
});

describe('every stored record matches at most one incoming row', () => {
  // Deterministic pseudo-random scenarios, so a failure is reproducible.
  let seed = 20261117;
  const rand = (n: number) => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed % n;
  };
  const NARRATIONS = ['UPI/SWIGGY', 'UPI/ZOMATO', 'ATM WDL PUNE', 'NEFT-X1-VENDOR', 'POS CAFE', 'UPI/CHAI'];

  it.each(Array.from({ length: 200 }, (_, i) => i))('scenario %i', (scenario) => {
    void scenario;
    const existing: Stored[] = Array.from({ length: 1 + rand(6) }, (_, i) => {
      const ref = rand(3) === 0 ? undefined : String(600000000000 + rand(4));
      return stored(`e${i}`, NARRATIONS[rand(NARRATIONS.length)], [20, 100, 250][rand(3)], 10 + rand(2), ref);
    });
    const incoming: NormalizedTransaction[] = Array.from({ length: 1 + rand(8) }, () => {
      const ref = rand(3) === 0 ? null : String(600000000000 + rand(4));
      return debit(NARRATIONS[rand(NARRATIONS.length)], [20, 100, 250][rand(3)], 10 + rand(2), ref);
    });

    const rows = buildReviewTransactions(incoming, existing, []);
    const claimed = rows.map((r) => r.duplicateOf).filter((id): id is string => id !== null);
    expect(new Set(claimed).size).toBe(claimed.length);
    // Nothing is dropped: every row is still present, and unflagged rows stay selectable.
    expect(rows).toHaveLength(incoming.length);
    for (const row of rows) {
      if (!row.duplicateOf) expect(row.included).toBe(true);
    }
  });

  it('with no existing records, no statement row is flagged, however similar', () => {
    const rows = buildReviewTransactions([debit('UPI/X', 10), debit('UPI/X', 10), debit('UPI/X', 10)], [], []);
    expect(rows.every((r) => r.duplicateOf === null && r.included)).toBe(true);
  });
});
