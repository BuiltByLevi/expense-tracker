import { describe, it, expect } from 'vitest';
import { budgetCrossing, budgetLevel, cleanBudgets, computeBudgetStatuses } from './budgets';

const e = (category: string, amount: number) => ({ category, amount });

describe('budgetLevel', () => {
  it('is ok below 80%, warning from 80%, over from 100%', () => {
    expect(budgetLevel(79.9)).toBe('ok');
    expect(budgetLevel(80)).toBe('warning');
    expect(budgetLevel(99.9)).toBe('warning');
    expect(budgetLevel(100)).toBe('over');
  });
});

describe('cleanBudgets', () => {
  it('drops zero, negative, non-numeric and missing values', () => {
    expect(cleanBudgets({ Food: 8000, Rent: 0, Fuel: -5, Bills: '100', X: NaN })).toEqual({ Food: 8000 });
    expect(cleanBudgets(undefined)).toEqual({});
  });
});

describe('computeBudgetStatuses', () => {
  it('sums spending per budgeted category and sorts most-used first', () => {
    const s = computeBudgetStatuses(
      { Food: 1000, Rent: 20000, Fuel: 2000 },
      [e('Food', 600), e('Food', 500), e('Rent', 18000), e('Shopping', 999)],
    );
    expect(s.map((x) => x.category)).toEqual(['Food', 'Rent', 'Fuel']);
    expect(s[0]).toMatchObject({ spent: 1100, remaining: -100, level: 'over' });
    expect(s[1]).toMatchObject({ spent: 18000, percent: 90, level: 'warning' });
    expect(s[2]).toMatchObject({ spent: 0, percent: 0, level: 'ok' });
  });
});

describe('budgetCrossing', () => {
  const st = (level: 'ok' | 'warning' | 'over') => ({ category: 'Food', limit: 1, spent: 0, percent: 0, remaining: 0, level });
  it('reports only a change into warning or over', () => {
    expect(budgetCrossing(st('ok'), st('warning'))).toBe('warning');
    expect(budgetCrossing(st('warning'), st('over'))).toBe('over');
    expect(budgetCrossing(st('ok'), st('over'))).toBe('over');
    expect(budgetCrossing(st('warning'), st('warning'))).toBeNull();
    expect(budgetCrossing(st('ok'), st('ok'))).toBeNull();
    expect(budgetCrossing(undefined, undefined)).toBeNull();
  });
});
