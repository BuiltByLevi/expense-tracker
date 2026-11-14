import { useCallback, useMemo, useState } from 'react';
import { endOfMonth, isWithinInterval, startOfMonth } from 'date-fns';
import { useEarnings } from '@/context/EarningsContext';
import { useExpenses } from '@/context/ExpensesContext';
import { useIncome } from '@/context/IncomeContext';
import { computeFinanceTotals } from '@shared/finance';
import { resolveMonthlyEarnings } from '@shared/earningsResolution';
import { makeCashFlowLookup } from '@shared/cashFlowLookup';
import type { Expense, MonthlyEarnings } from '@shared/types';

function analyzeCategories(expenses: Expense[]) {
  const categoryMap = new Map<string, number>();
  let total = 0;
  expenses.forEach((expense) => {
    categoryMap.set(expense.category, (categoryMap.get(expense.category) || 0) + expense.amount);
    total += expense.amount;
  });
  const analysis: { category: string; amount: number; percentage: number }[] = [];
  categoryMap.forEach((amount, category) => {
    analysis.push({ category, amount, percentage: total > 0 ? (amount / total) * 100 : 0 });
  });
  return analysis.sort((a, b) => b.amount - a.amount);
}

/**
 * Mobile counterpart of the web app's useDashboardData.
 *
 * The financial RULES are not reimplemented here — computeFinanceTotals,
 * resolveMonthlyEarnings and makeCashFlowLookup are imported from shared/ and
 * are the same tested modules the web app runs. This hook only wires them to
 * React Native state.
 *
 * The two-lookup split below is the part most easily broken in a migration,
 * so it is spelled out:
 *   - getEffectiveEarningsRecord -> the "Monthly Earnings" LABEL. Excludes
 *     refunds and transfers (they are real money but not earned income).
 *   - getMonthlyCashFlowCredits  -> the cash-flow BASIS. Includes every
 *     credit, so Net Cash Flow always agrees with the transaction ledger for
 *     the same month.
 * Collapsing these into one lookup is the bug class this split exists to
 * prevent.
 */
export function useDashboardData() {
  const { earnings, getEarningsForMonth } = useEarnings();
  const {
    expenses,
    loading: expensesLoading,
    error: expensesError,
    refresh: refreshExpenses,
  } = useExpenses();
  const {
    income,
    loading: incomeLoading,
    error: incomeError,
    refresh: refreshIncome,
    getIncomeForMonth,
  } = useIncome();

  const loading = expensesLoading || incomeLoading;
  const error = expensesError ?? incomeError;

  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());

  const getEffectiveEarningsRecord = useCallback(
    (year: number, month: number): MonthlyEarnings | null => {
      // Override > imported sum > stored record — the same rule the web app
      // uses (shared/earningsResolution.ts), so both show the same figure.
      const { entries } = getIncomeForMonth(year, month);
      return resolveMonthlyEarnings(year, month, entries, getEarningsForMonth(year, month));
    },
    [getIncomeForMonth, getEarningsForMonth]
  );

  const getMonthlyCashFlowCredits = useMemo(
    () => makeCashFlowLookup(getIncomeForMonth, getEarningsForMonth),
    [getIncomeForMonth, getEarningsForMonth]
  );

  const financeTotals = useMemo(
    () =>
      computeFinanceTotals(
        expenses,
        earnings,
        getMonthlyCashFlowCredits,
        selectedYear,
        selectedMonth
      ),
    [expenses, earnings, getMonthlyCashFlowCredits, selectedYear, selectedMonth]
  );

  const selectedMonthEarnings = useMemo(() => {
    const record = getEffectiveEarningsRecord(selectedYear, selectedMonth);
    if (record) return { amount: record.amount, status: record.status };
    return { amount: earnings, status: 'missing' as const };
  }, [getEffectiveEarningsRecord, selectedYear, selectedMonth, earnings]);

  const monthExpenses = useMemo(() => {
    const start = startOfMonth(new Date(selectedYear, selectedMonth));
    const end = endOfMonth(new Date(selectedYear, selectedMonth));
    return expenses.filter((e) => isWithinInterval(e.date, { start, end }));
  }, [expenses, selectedYear, selectedMonth]);

  const monthIncome = useMemo(
    () => getIncomeForMonth(selectedYear, selectedMonth).entries,
    [getIncomeForMonth, selectedYear, selectedMonth]
  );

  const monthTotal = useMemo(
    () => monthExpenses.reduce((s, e) => s + e.amount, 0),
    [monthExpenses]
  );

  const monthCashFlowCredits = useMemo(() => {
    const record = getMonthlyCashFlowCredits(selectedYear, selectedMonth);
    return record ? record.amount : earnings;
  }, [getMonthlyCashFlowCredits, selectedYear, selectedMonth, earnings]);

  const monthNetCashFlow = monthCashFlowCredits - monthTotal;

  // Presentation-only: the last <=6 months of existing summary data feeds the
  // KPI sparklines and month-over-month badges, exactly as DashboardWeb does.
  // No new financial derivation happens here.
  const { trendWindow, prevSummary } = useMemo(() => {
    const summaries = financeTotals.monthlySummaries;
    const selIdx = summaries.findIndex(
      (m) => m.year === selectedYear && m.month === selectedMonth
    );
    return {
      trendWindow:
        selIdx >= 0 ? summaries.slice(Math.max(0, selIdx - 5), selIdx + 1) : summaries.slice(-6),
      prevSummary: selIdx > 0 ? summaries[selIdx - 1] : undefined,
    };
  }, [financeTotals.monthlySummaries, selectedYear, selectedMonth]);

  const monthCategoryAnalysis = useMemo(() => analyzeCategories(monthExpenses), [monthExpenses]);
  const allTimeCategoryAnalysis = useMemo(() => analyzeCategories(expenses), [expenses]);
  const totalAllTime = useMemo(() => expenses.reduce((s, e) => s + e.amount, 0), [expenses]);

  const goToPreviousMonth = () => {
    if (selectedMonth === 0) {
      setSelectedMonth(11);
      setSelectedYear((y) => y - 1);
    } else {
      setSelectedMonth((m) => m - 1);
    }
  };

  const goToNextMonth = () => {
    if (selectedMonth === 11) {
      setSelectedMonth(0);
      setSelectedYear((y) => y + 1);
    } else {
      setSelectedMonth((m) => m + 1);
    }
  };

  const goToCurrentMonth = () => {
    const now = new Date();
    setSelectedYear(now.getFullYear());
    setSelectedMonth(now.getMonth());
  };

  const refresh = useCallback(async () => {
    await Promise.all([refreshExpenses(), refreshIncome()]);
  }, [refreshExpenses, refreshIncome]);

  return {
    loading,
    error,
    refresh,
    expenses,
    income,
    selectedYear,
    selectedMonth,
    goToPreviousMonth,
    goToNextMonth,
    goToCurrentMonth,
    financeTotals,
    selectedMonthEarnings,
    monthExpenses,
    monthIncome,
    monthTotal,
    monthNetCashFlow,
    totalAllTime,
    monthCategoryAnalysis,
    allTimeCategoryAnalysis,
    trendWindow,
    prevSummary,
    hasDeficit: financeTotals.cashFlowDeficit > 0,
    isFuture: financeTotals.isSelectedMonthInFuture,
  };
}
