import { describe, it, expect } from 'vitest';
import { isOverriddenImport, resolveMonthlyEarnings } from './earningsResolution';
import { makeCashFlowLookup } from './cashFlowLookup';
import type { Income, MonthlyEarnings } from './types';

function inc(id: string, amount: number, category: Income['category'], date: Date): Income {
  return { id, amount, category, description: id, date, userId: 'u1' };
}

function rec(amount: number, extra: Partial<MonthlyEarnings> = {}): MonthlyEarnings {
  return { year: 2026, month: 9, amount, status: 'confirmed', source: 'manual', updatedAt: '2026-10-01T00:00:00.000Z', ...extra };
}

const imported = [
  inc('salary', 50000, 'Salary', new Date(2026, 9, 31)),
  inc('refund', 1500, 'Refund', new Date(2026, 9, 12)),
];

describe('resolveMonthlyEarnings', () => {
  it('imported income wins over an ordinary stored record', () => {
    const r = resolveMonthlyEarnings(2026, 9, imported, rec(40000));
    expect(r?.amount).toBe(50000);
    expect(r?.source).toBe('import');
  });

  it('an override wins over imported income', () => {
    const r = resolveMonthlyEarnings(2026, 9, imported, rec(65000, { override: true }));
    expect(r?.amount).toBe(65000);
    expect(r?.override).toBe(true);
  });

  it('without imports the stored record is used, override flag or not', () => {
    expect(resolveMonthlyEarnings(2026, 9, [], rec(40000))?.amount).toBe(40000);
    expect(resolveMonthlyEarnings(2026, 9, [], rec(40000, { override: true }))?.amount).toBe(40000);
  });

  it('returns null with neither imports nor a record', () => {
    expect(resolveMonthlyEarnings(2026, 9, [], null)).toBeNull();
  });

  it('a month of only refunds/transfers falls back to the record', () => {
    const onlyRefund = [inc('refund', 900, 'Refund', new Date(2026, 9, 3))];
    expect(resolveMonthlyEarnings(2026, 9, onlyRefund, rec(30000))?.amount).toBe(30000);
  });
});

describe('isOverriddenImport', () => {
  it('is true only for an override on a month with imported earnings', () => {
    expect(isOverriddenImport(imported, rec(1, { override: true }))).toBe(true);
    expect(isOverriddenImport(imported, rec(1))).toBe(false);
    expect(isOverriddenImport([], rec(1, { override: true }))).toBe(false);
  });
});

describe('makeCashFlowLookup with overrides', () => {
  const incomeFor = (entries: Income[]) => () => ({ entries, total: entries.reduce((s, e) => s + e.amount, 0) });

  it('uses every itemized credit (refunds included) when not overridden', () => {
    const lookup = makeCashFlowLookup(incomeFor(imported), () => rec(40000));
    expect(lookup(2026, 9)?.amount).toBe(51500);
  });

  it('uses the override amount instead of the itemized total', () => {
    const lookup = makeCashFlowLookup(incomeFor(imported), () => rec(65000, { override: true }));
    expect(lookup(2026, 9)?.amount).toBe(65000);
  });

  it('falls back to the record when there is no itemized income', () => {
    const lookup = makeCashFlowLookup(incomeFor([]), () => rec(40000));
    expect(lookup(2026, 9)?.amount).toBe(40000);
  });
});
