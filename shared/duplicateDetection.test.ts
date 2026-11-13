import { describe, it, expect } from 'vitest';
import { findDuplicate } from './duplicateDetection';
import type { NormalizedTransaction } from './statementParsers/types';

function tx(partial: Partial<NormalizedTransaction>): NormalizedTransaction {
  return {
    date: null, valueDate: null, narration: '', referenceNumber: null,
    type: 'debit', amount: null, balance: null, parseIssue: null,
    ...partial,
  };
}
function rec(id: string, amount: number, date: Date, description: string, referenceNumber?: string) {
  return { id, amount, date, description, referenceNumber };
}

describe('findDuplicate', () => {
  it('re-importing the same transaction with a matching reference number is an exact duplicate', () => {
    const existing = [rec('r1', 450, new Date(2026, 10, 7), 'UPI/SWIGGY/ORDER998877', 'UTR123456')];
    const reImport = tx({ date: new Date(2026, 10, 7), narration: 'UPI-SWIGGY-998877-PAID', amount: 450, referenceNumber: 'UTR123456' });
    const m = findDuplicate(reImport, existing, 'UTR123456');
    expect(m).toEqual({ duplicateOf: 'r1', confidence: 'exact' });
  });

  it('re-importing the same transaction with no reference numbers on either side matches via description, hedged as "likely" (no reference number to confirm it with certainty)', () => {
    const existing = [rec('r2', 450, new Date(2026, 10, 7), 'UPI SWIGGY ORDER998877')];
    const reImport = tx({ date: new Date(2026, 10, 7), narration: 'UPI SWIGGY ORDER998877', amount: 450 });
    const m = findDuplicate(reImport, existing, null);
    expect(m).toEqual({ duplicateOf: 'r2', confidence: 'likely' });
  });

  it('two legitimate distinct transactions, same amount/date, clearly different narrations -> hedged "likely", never discarded', () => {
    const existing = [rec('atm1', 500, new Date(2026, 10, 3), 'ATM CASH WITHDRAWAL')];
    const second = tx({ date: new Date(2026, 10, 3), narration: 'UPI PAYMENT TO RAVI KUMAR', amount: 500 });
    const m = findDuplicate(second, existing, null);
    expect(m?.confidence).toBe('likely');
  });

  it('same description/amount but weeks apart (recurring charge) is NOT a duplicate', () => {
    const existing = [rec('sub1', 999, new Date(2026, 9, 1), 'NETFLIX SUBSCRIPTION')];
    const nextMonth = tx({ date: new Date(2026, 9, 29), narration: 'NETFLIX SUBSCRIPTION', amount: 999 });
    expect(findDuplicate(nextMonth, existing, null)).toBeNull();
  });

  it('different explicit reference numbers prove distinctness, even with identical amount/date/description', () => {
    const existing = [rec('r3', 200, new Date(2026, 10, 5), 'UPI TRANSFER TO FRIEND', 'UTR-AAA')];
    const differentRef = tx({ date: new Date(2026, 10, 5), narration: 'UPI TRANSFER TO FRIEND', amount: 200, referenceNumber: 'UTR-BBB' });
    expect(findDuplicate(differentRef, existing, 'UTR-BBB')).toBeNull();
  });

  it('near-identical descriptions differing by one token (e.g. a branch code), no reference numbers present -> flagged, but only ever "likely", never falsely "exact"', () => {
    const existing = [rec('atm2', 500, new Date(2026, 10, 3), 'ATM CASH WDL BRANCH A')];
    const second = tx({ date: new Date(2026, 10, 3), narration: 'ATM CASH WDL BRANCH B', amount: 500 });
    const m = findDuplicate(second, existing, null);
    // Word overlap (4/5 = 0.8) is high, but with no reference number to
    // corroborate it, text similarity alone is capped at "likely" — these
    // could be two genuinely distinct transactions (different branches).
    expect(m).toEqual({ duplicateOf: 'atm2', confidence: 'likely' });
  });

  it('overlapping statement re-upload: genuinely overlapping transactions are flagged, new ones are not', () => {
    const alreadyImported = [
      rec('feb1', 1200, new Date(2026, 1, 10), 'ELECTRICITY BILL'),
      rec('mar1', 3000, new Date(2026, 2, 20), 'RENT PAYMENT'),
      rec('mar2', 450, new Date(2026, 2, 28), 'GROCERY STORE'),
    ];
    const secondImportRows = [
      tx({ date: new Date(2026, 2, 20), narration: 'RENT PAYMENT', amount: 3000 }),
      tx({ date: new Date(2026, 2, 28), narration: 'GROCERY STORE', amount: 450 }),
      tx({ date: new Date(2026, 3, 5), narration: 'NEW EXPENSE APRIL', amount: 780 }),
    ];
    const results = secondImportRows.map((r) => findDuplicate(r, alreadyImported, null));
    // No reference numbers in this (CSV-style) statement, so even a clean
    // description match is hedged as "likely" rather than "exact" — see the
    // policy above. Still correctly identifies which records are duplicates.
    expect(results[0]).toEqual({ duplicateOf: 'mar1', confidence: 'likely' });
    expect(results[1]).toEqual({ duplicateOf: 'mar2', confidence: 'likely' });
    expect(results[2]).toBeNull();
  });

  it('never mutates the existing-records array', () => {
    const existing = [rec('keep-me', 100, new Date(2026, 10, 1), 'TEST')];
    const snapshot = JSON.stringify(existing);
    findDuplicate(tx({ date: new Date(2026, 10, 1), narration: 'TEST', amount: 100 }), existing, null);
    expect(JSON.stringify(existing)).toBe(snapshot);
  });

  it('scans all records for a stronger match instead of returning the first weak coincidence', () => {
    const existing = [
      { id: 'unrelated', amount: 450, date: new Date(2026, 10, 7), description: 'ATM CASH WITHDRAWAL', referenceNumber: undefined },
      { id: 'true-dup', amount: 450, date: new Date(2026, 10, 7), description: 'UPI SWIGGY ORDER 12345', referenceNumber: undefined },
    ];
    const incoming = tx({ date: new Date(2026, 10, 7), narration: 'UPI SWIGGY ORDER 12345', amount: 450 });
    const m = findDuplicate(incoming, existing, null);
    // No reference numbers here either, so the ceiling is "likely" — the
    // important assertion is that it picks 'true-dup', not 'unrelated'.
    expect(m).toEqual({ duplicateOf: 'true-dup', confidence: 'likely' });
  });

  it('two genuinely distinct Razorpay settlements, same day and amount, with different reference numbers are NEVER flagged as duplicates', () => {
    const existing = [rec('rzp1', 1250, new Date(2026, 10, 8), 'RAZORPAY SETTLEMENT', 'RZPY0001')];
    const second = tx({ date: new Date(2026, 10, 8), narration: 'RAZORPAY SETTLEMENT', amount: 1250, referenceNumber: 'RZPY0002' });
    // Reference numbers present and different -> certainly not the same transaction,
    // even though amount/date/description all coincide.
    expect(findDuplicate(second, existing, 'RZPY0002')).toBeNull();
  });

  it('multiple Payload credits, same day, different amounts, no reference numbers -> each judged independently, not duplicates of each other', () => {
    const existing = [rec('pl1', 3000, new Date(2026, 10, 10), 'PAYLOAD PAYMENT')];
    const second = tx({ date: new Date(2026, 10, 10), narration: 'PAYLOAD SETTLEMENT', amount: 750 });
    expect(findDuplicate(second, existing, null)).toBeNull();
  });

  it('re-importing the exact same Razorpay row (matching reference number) is correctly flagged exact, so it is not double-counted', () => {
    const existing = [rec('rzp2', 2500, new Date(2026, 10, 5), 'RAZORPAY PAYMENTS CREDIT', 'RZPY-AAA')];
    const reImport = tx({ date: new Date(2026, 10, 5), narration: 'RAZORPAY PAYMENTS CREDIT', amount: 2500, referenceNumber: 'RZPY-AAA' });
    expect(findDuplicate(reImport, existing, 'RZPY-AAA')).toEqual({ duplicateOf: 'rzp2', confidence: 'exact' });
  });
});
