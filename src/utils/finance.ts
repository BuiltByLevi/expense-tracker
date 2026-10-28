import type { Expense, MonthlyEarnings } from '../types';

export interface MonthlySummary {
  year: number;
  month: number;                    // 0-indexed
  earnings: number;                 // per-month earnings for THIS month
  earningsStatus: 'confirmed' | 'estimated' | 'missing';
  spent: number;
  monthBalance: number;             // monthly net cash flow
  runningBalance: number;           // cumulative net cash flow
  debtAtEndOfMonth: number;         // max(0, -runningBalance) — CASH-FLOW DEFICIT
  savingsAtEndOfMonth: number;      // max(0, runningBalance)
  isFuture: boolean;
  hasExpenses: boolean;
}

export interface FinanceTotals {
  totalEarnings: number;
  totalSpent: number;
  cumulativeNetCashFlow: number;    // renamed from totalSavings
  cashFlowDeficit: number;          // renamed from outstandingDebt
  monthlySummaries: MonthlySummary[];
  earliestMonth: { year: number; month: number } | null;
  lastCalculatedMonth: { year: number; month: number } | null;
  isSelectedMonthInFuture: boolean;
  // Average across calendar months in window (fixes monthsWithData bug)
  calendarMonthAverage: number;
  calendarMonthCount: number;
}

export type EarningsLookup = (
  year: number,
  month: number
) => MonthlyEarnings | null;

/**
 * Compute cumulative financial summary using per-month earnings.
 * 
 * - Each month's earnings come from the lookup function
 * - If a month has no record, falls back to `defaultEarnings` (marked 'missing')
 * - Calculation only runs up to the current real month (no future predictions)
 * - Average divides by ALL calendar months in window (not just those with expenses)
 */
export const computeFinanceTotals = (
  expenses: Expense[],
  defaultEarnings: number,
  earningsLookup: EarningsLookup,
  upToYear: number,
  upToMonth: number
): FinanceTotals => {
  const today = new Date();
  const todayYear = today.getFullYear();
  const todayMonth = today.getMonth();

  const isSelectedMonthInFuture =
    upToYear > todayYear || (upToYear === todayYear && upToMonth > todayMonth);

  const capYear = isSelectedMonthInFuture ? todayYear : upToYear;
  const capMonth = isSelectedMonthInFuture ? todayMonth : upToMonth;

  // Find earliest expense month
  let earliest: { year: number; month: number } | null = null;
  for (const exp of expenses) {
    const d = new Date(exp.date);
    const y = d.getFullYear();
    const m = d.getMonth();
    if (!earliest || y < earliest.year || (y === earliest.year && m < earliest.month)) {
      earliest = { year: y, month: m };
    }
  }

  if (!earliest) {
    return {
      totalEarnings: 0,
      totalSpent: 0,
      cumulativeNetCashFlow: 0,
      cashFlowDeficit: 0,
      monthlySummaries: [],
      earliestMonth: null,
      lastCalculatedMonth: null,
      isSelectedMonthInFuture,
      calendarMonthAverage: 0,
      calendarMonthCount: 0,
    };
  }

  if (earliest.year > capYear || (earliest.year === capYear && earliest.month > capMonth)) {
    return {
      totalEarnings: 0,
      totalSpent: 0,
      cumulativeNetCashFlow: 0,
      cashFlowDeficit: 0,
      monthlySummaries: [],
      earliestMonth: earliest,
      lastCalculatedMonth: null,
      isSelectedMonthInFuture,
      calendarMonthAverage: 0,
      calendarMonthCount: 0,
    };
  }

  const summaries: MonthlySummary[] = [];
  let runningBalance = 0;
  let cursor = { year: earliest.year, month: earliest.month };
  let totalEarningsSum = 0;
  let safety = 0;

  while (
    safety < 500 &&
    (cursor.year < capYear || (cursor.year === capYear && cursor.month <= capMonth))
  ) {
    safety++;

    const expensesThisMonth = expenses.filter((e) => {
      const d = new Date(e.date);
      return d.getFullYear() === cursor.year && d.getMonth() === cursor.month;
    });
    const spentThisMonth = expensesThisMonth.reduce((s, e) => s + e.amount, 0);
    const hasExpenses = expensesThisMonth.length > 0;

    // Per-month earnings lookup
    const record = earningsLookup(cursor.year, cursor.month);
    let earningsThisMonth: number;
    let earningsStatus: 'confirmed' | 'estimated' | 'missing';
    if (record) {
      earningsThisMonth = record.amount;
      earningsStatus = record.status;
    } else {
      earningsThisMonth = defaultEarnings;
      earningsStatus = 'missing';
    }
    totalEarningsSum += earningsThisMonth;

    const monthBalance = earningsThisMonth - spentThisMonth;
    runningBalance += monthBalance;

    summaries.push({
      year: cursor.year,
      month: cursor.month,
      earnings: earningsThisMonth,
      earningsStatus,
      spent: spentThisMonth,
      monthBalance,
      runningBalance,
      debtAtEndOfMonth: runningBalance < 0 ? Math.abs(runningBalance) : 0,
      savingsAtEndOfMonth: runningBalance > 0 ? runningBalance : 0,
      isFuture: false,
      hasExpenses,
    });

    if (cursor.month === 11) {
      cursor = { year: cursor.year + 1, month: 0 };
    } else {
      cursor = { year: cursor.year, month: cursor.month + 1 };
    }
  }

  const totalSpent = summaries.reduce((s, m) => s + m.spent, 0);
  const calendarMonthCount = summaries.length;
  const calendarMonthAverage =
    calendarMonthCount > 0 ? totalSpent / calendarMonthCount : 0;

  return {
    totalEarnings: totalEarningsSum,
    totalSpent,
    cumulativeNetCashFlow: runningBalance > 0 ? runningBalance : 0,
    cashFlowDeficit: runningBalance < 0 ? Math.abs(runningBalance) : 0,
    monthlySummaries: summaries,
    earliestMonth: earliest,
    lastCalculatedMonth:
      summaries.length > 0
        ? { year: summaries[summaries.length - 1].year, month: summaries[summaries.length - 1].month }
        : null,
    isSelectedMonthInFuture,
    calendarMonthAverage,
    calendarMonthCount,
  };
};