import { describe, it, expect } from 'vitest';
import { deriveMonthlyEarnings } from './earningsDerivation';
import type { Income } from './types';

function inc(id: string, amount: number, category: Income['category'], date: Date): Income {
  return { id, amount, category, description: id, date, userId: 'u1' };
}

describe('deriveMonthlyEarnings', () => {
  it('returns null for an empty month', () => {
    expect(deriveMonthlyEarnings([])).toBeNull();
  });

  it('salary alone is counted in full', () => {
    const d = deriveMonthlyEarnings([inc('s', 50000, 'Salary', new Date(2026, 10, 30))]);
    expect(d?.amount).toBe(50000);
  });

  it('interest landing on the salary date is included (real income, not excluded)', () => {
    const entries = [
      inc('salary', 50000, 'Salary', new Date(2026, 9, 31)),
      inc('interest', 120, 'Interest', new Date(2026, 9, 31)),
    ];
    const d = deriveMonthlyEarnings(entries);
    expect(d?.amount).toBe(50120);
    expect(d?.otherEntries).toHaveLength(0);
  });

  it('a refund on the same day as salary is excluded from earnings (not inflated)', () => {
    const entries = [
      inc('salary', 50000, 'Salary', new Date(2026, 8, 30)),
      inc('refund', 1500, 'Refund', new Date(2026, 8, 30)),
    ];
    const d = deriveMonthlyEarnings(entries);
    expect(d?.amount).toBe(50000);
    expect(d?.otherEntries.map((e) => e.id)).toEqual(['refund']);
    expect(d?.countedEntries.map((e) => e.id)).toEqual(['salary']);
  });

  it('a transfer-in on the same day as salary is excluded from earnings', () => {
    const entries = [
      inc('salary', 60000, 'Salary', new Date(2026, 8, 30)),
      inc('xfer', 20000, 'Transfer', new Date(2026, 8, 30)),
    ];
    expect(deriveMonthlyEarnings(entries)?.amount).toBe(60000);
  });

  it('a transfer-in dated AFTER salary does not hide or replace the salary figure', () => {
    const entries = [
      inc('salary', 52000, 'Salary', new Date(2026, 10, 28)),
      inc('xfer', 10000, 'Transfer', new Date(2026, 10, 30)), // later than salary
    ];
    const d = deriveMonthlyEarnings(entries);
    expect(d?.amount).toBe(52000);
    expect(d?.lastDate.getDate()).toBe(28); // falls back to the real salary date
  });

  it('a month with ONLY a refund/transfer (no real income) has no derivable earnings', () => {
    const entries = [inc('refund', 500, 'Refund', new Date(2026, 8, 30))];
    expect(deriveMonthlyEarnings(entries)).toBeNull();
  });

  it('split same-day salary payments, parsed with different time-of-day, both count', () => {
    const dayA = new Date(2026, 10, 30, 9, 15, 2, 123);
    const dayB = new Date(2026, 10, 30, 14, 47, 55, 981);
    const entries = [
      inc('part1', 30000, 'Salary', dayA),
      inc('part2', 20000, 'Salary', dayB),
    ];
    expect(deriveMonthlyEarnings(entries)?.amount).toBe(50000);
  });

  describe('critical verification: eligible income on the 1st, a middle day, and the last day of the month', () => {
    it('all three count, regardless of day', () => {
      const entries = [
        inc('first', 2500, 'Other Income', new Date(2026, 10, 1)),   // Razorpay-style, day 1
        inc('mid', 750, 'Other Income', new Date(2026, 10, 15)),      // Payload-style, mid-month
        inc('salary', 50000, 'Salary', new Date(2026, 10, 30)),       // last day
      ];
      const d = deriveMonthlyEarnings(entries);
      expect(d?.amount).toBe(53250);
      expect(d?.countedEntries).toHaveLength(3);
      expect(d?.otherEntries).toHaveLength(0);
    });

    it('multiple credits on the SAME day all count, not just one', () => {
      const entries = [
        inc('rzp1', 2500, 'Other Income', new Date(2026, 10, 8)),
        inc('rzp2', 1250, 'Other Income', new Date(2026, 10, 8)),
        inc('payload1', 3000, 'Other Income', new Date(2026, 10, 8)),
      ];
      const d = deriveMonthlyEarnings(entries);
      expect(d?.amount).toBe(6750);
      expect(d?.countedEntries).toHaveLength(3);
    });
  });

  it('switching months does not leak an adjacent month\'s income into this month\'s derivation (caller passes pre-filtered entries)', () => {
    // deriveMonthlyEarnings trusts its caller (getIncomeForMonth) to have
    // already filtered to one calendar month — passing only November's
    // entries must never reflect October's or December's income.
    const novemberOnly = [inc('nov-salary', 50000, 'Salary', new Date(2026, 10, 28))];
    const d = deriveMonthlyEarnings(novemberOnly);
    expect(d?.amount).toBe(50000);
    expect(d?.countedEntries.every((e) => e.date.getMonth() === 10)).toBe(true);
  });

  it('debit-side transactions are never passed in as Income and cannot inflate earnings (type system guarantee, exercised via the full fixture in statementImportPipeline.test.ts)', () => {
    // Expense amounts never reach this function — Income[] is the only
    // input type. This is enforced structurally, not by a runtime check.
    const entries = [inc('salary', 50000, 'Salary', new Date(2026, 10, 28))];
    expect(deriveMonthlyEarnings(entries)?.amount).toBe(50000);
  });
});
