import { outflowKind } from './accounting';

/** Monthly spending limit per expense category, e.g. { 'Food & Dining': 8000 }. */
export type CategoryBudgets = Record<string, number>;

export type BudgetLevel = 'ok' | 'warning' | 'over';

export interface BudgetStatus {
  category: string;
  limit: number;
  spent: number;
  /** spent / limit × 100, unrounded (can exceed 100). */
  percent: number;
  /** limit − spent; negative once over. */
  remaining: number;
  level: BudgetLevel;
}

/** At or above this share of the limit a budget shows as a warning. */
export const BUDGET_WARNING_PERCENT = 80;

export function budgetLevel(percent: number): BudgetLevel {
  if (percent >= 100) return 'over';
  if (percent >= BUDGET_WARNING_PERCENT) return 'warning';
  return 'ok';
}

/** Keeps only positive, finite limits; anything else means "no budget". */
export function cleanBudgets(raw: unknown): CategoryBudgets {
  if (!raw || typeof raw !== 'object') return {};
  const out: CategoryBudgets = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof v === 'number' && Number.isFinite(v) && v > 0) out[k] = v;
  }
  return out;
}

/**
 * A category a budget can be set on. ATM cash withdrawals, transfers out and
 * investments are not spending (see shared/accounting.ts), so a budget on
 * them would never mean what it says and is not offered or counted.
 */
export function isBudgetableCategory(category: string): boolean {
  return outflowKind(category) === 'spending';
}

/**
 * Status of every budgeted category for one month's expenses, most-used
 * first (over budget at the top). Categories without a budget are ignored,
 * and so are budgets on categories that are not spending (see isBudgetableCategory).
 */
export function computeBudgetStatuses(
  budgets: CategoryBudgets,
  monthExpenses: { category: string; amount: number }[],
): BudgetStatus[] {
  const spentBy = new Map<string, number>();
  for (const e of monthExpenses) {
    if (!isBudgetableCategory(e.category)) continue;
    spentBy.set(e.category, (spentBy.get(e.category) ?? 0) + e.amount);
  }
  return Object.entries(cleanBudgets(budgets))
    .filter(([category]) => isBudgetableCategory(category))
    .map(([category, limit]) => {
      const spent = spentBy.get(category) ?? 0;
      const percent = (spent / limit) * 100;
      return { category, limit, spent, percent, remaining: limit - spent, level: budgetLevel(percent) };
    })
    .sort((a, b) => b.percent - a.percent || a.category.localeCompare(b.category));
}

/**
 * The alert to show after an expense is added, if it pushed its category
 * across the warning or over-budget line. Null when nothing changed level.
 */
export function budgetCrossing(
  before: BudgetStatus | undefined,
  after: BudgetStatus | undefined,
): BudgetLevel | null {
  if (!after || after.level === 'ok') return null;
  if (before && before.level === after.level) return null;
  return after.level;
}
