import { useCallback, useMemo, useState } from 'react';
import { startOfMonth, endOfMonth, isWithinInterval, format } from 'date-fns';
import { useAuth } from '../context/AuthContext';
import { useEarnings } from '../context/EarningsContext';
import { useTheme } from '../context/ThemeContext';
import { useExpenses } from '../context/ExpensesContext';
import { useIncome } from '../context/IncomeContext';
import type { Expense, MonthlyEarnings } from '../types';
import { computeFinanceTotals } from '../utils/finance';
import { deriveMonthlyEarnings } from '../utils/earningsDerivation';
import { makeCashFlowLookup } from '../utils/cashFlowLookup';
import { filterByDateRange, type DateRange } from '../utils/dateRangePresets';

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
 * Owns all Dashboard business logic (month navigation, financial totals, category
 * analysis, sub-page/modal toggles) so DashboardWeb and DashboardMobile share one
 * source of truth and only differ in layout.
 */
export function useDashboardData() {
  const { user, logout } = useAuth();
  const { earnings, getEarningsForMonth } = useEarnings();
  const { theme, toggleTheme } = useTheme();
  const { expenses, loading: expensesLoading, addExpense, updateExpense, deleteExpense } = useExpenses();
  const { income, loading: incomeLoading, addIncome, getIncomeForMonth, deleteIncome: handleDeleteIncome } = useIncome();
  const loading = expensesLoading || incomeLoading;

  // "Monthly Earnings" for any month with an imported statement is the sum
  // of every eligible credit that month — salary, interest, Razorpay/Payload
  // settlements, or any other genuine income — regardless of which day it
  // landed on (see deriveMonthlyEarnings). Months with no itemized income
  // fall back to the manually-set/estimated single number. This is a LABEL
  // ONLY — "what did I earn this month" — and deliberately excludes
  // refunds/transfers. It must NOT be used for cash-flow arithmetic (see
  // getMonthlyCashFlowCredits below):
  // a refund or transfer-in is still real money that landed in the account,
  // just not "earnings", and omitting it from cash-flow math would make the
  // Dashboard's balance disagree with the Transaction Ledger's balance for
  // the exact same month by the refund/transfer amount.
  const getEffectiveEarningsRecord = useCallback(
    (year: number, month: number): MonthlyEarnings | null => {
      const { entries } = getIncomeForMonth(year, month);
      const derived = deriveMonthlyEarnings(entries);
      if (derived) {
        return { year, month, amount: derived.amount, status: 'confirmed', source: 'import', updatedAt: derived.lastDate.toISOString() };
      }
      return getEarningsForMonth(year, month);
    },
    [getIncomeForMonth, getEarningsForMonth]
  );

  // Cash-flow basis — EVERY credit this month (salary, interest, refunds,
  // transfers-in alike), matching exactly what the Transaction Ledger page
  // totals for the same month. Feeds Monthly/Cumulative Net Cash Flow and
  // the Cash-Flow Deficit so they can never silently drop real money that a
  // refund or transfer-in actually added to the account. Shared with the
  // Profile page via makeCashFlowLookup so both screens always agree.
  const getMonthlyCashFlowCredits = useMemo(
    () => makeCashFlowLookup(getIncomeForMonth, getEarningsForMonth),
    [getIncomeForMonth, getEarningsForMonth]
  );

  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [showEarningsModal, setShowEarningsModal] = useState(false);
  const [showEarningsPage, setShowEarningsPage] = useState(false);
  const [showLedgerPage, setShowLedgerPage] = useState(false);
  const [showProfilePage, setShowProfilePage] = useState(false);
  const [showImportPage, setShowImportPage] = useState(false);
  const [showDebtDetails, setShowDebtDetails] = useState(false);
  // Independent of selectedYear/selectedMonth on purpose — a banking-style
  // date-range filter for the Transaction History list only. Applying it
  // never touches the month-based KPI cards (Monthly Earnings/Spending/Net
  // Cash Flow/Cumulative), which stay driven solely by selectedYear/Month.
  const [dateRange, setDateRangeState] = useState<DateRange | null>(null);

  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();

  const financeTotals = useMemo(
    () => computeFinanceTotals(expenses, earnings, getMonthlyCashFlowCredits, selectedYear, selectedMonth),
    [expenses, earnings, getMonthlyCashFlowCredits, selectedYear, selectedMonth]
  );

  const selectedMonthEarnings = useMemo(() => {
    const record = getEffectiveEarningsRecord(selectedYear, selectedMonth);
    if (record) {
      return { amount: record.amount, status: record.status };
    }
    return { amount: earnings, status: 'missing' as const };
  }, [getEffectiveEarningsRecord, selectedYear, selectedMonth, earnings]);

  const monthExpenses = useMemo(() => {
    const start = startOfMonth(new Date(selectedYear, selectedMonth));
    const end = endOfMonth(new Date(selectedYear, selectedMonth));
    return expenses.filter((expense) => isWithinInterval(new Date(expense.date), { start, end }));
  }, [expenses, selectedYear, selectedMonth]);

  const monthTotal = useMemo(
    () => monthExpenses.reduce((sum, e) => sum + e.amount, 0),
    [monthExpenses]
  );
  const totalAllTime = useMemo(
    () => expenses.reduce((sum, e) => sum + e.amount, 0),
    [expenses]
  );

  const monthCategoryAnalysis = useMemo(() => analyzeCategories(monthExpenses), [monthExpenses]);
  const allTimeCategoryAnalysis = useMemo(() => analyzeCategories(expenses), [expenses]);

  // Itemized credits for the selected month — shown merged into the main
  // transaction list (ExpenseList) so imported income isn't invisible there.
  const monthIncome = useMemo(
    () => getIncomeForMonth(selectedYear, selectedMonth).entries,
    [getIncomeForMonth, selectedYear, selectedMonth]
  );

  // Net cash flow must reflect every real credit (salary, interest, refunds,
  // transfers-in), not just the subset that counts as "Monthly Earnings" —
  // see getMonthlyCashFlowCredits above.
  const monthCashFlowCredits = useMemo(() => {
    const record = getMonthlyCashFlowCredits(selectedYear, selectedMonth);
    return record ? record.amount : earnings;
  }, [getMonthlyCashFlowCredits, selectedYear, selectedMonth, earnings]);

  const monthNetCashFlow = monthCashFlowCredits - monthTotal;

  // Transaction History's source: the active date range when one is set,
  // otherwise the selected month (unchanged default behavior). Filters the
  // full expenses/income arrays directly rather than monthExpenses/
  // monthIncome so a range can span across month boundaries.
  const historyExpenses = useMemo(() => {
    if (!dateRange) return monthExpenses;
    return filterByDateRange(expenses, dateRange);
  }, [dateRange, monthExpenses, expenses]);

  const historyIncome = useMemo(() => {
    if (!dateRange) return monthIncome;
    return filterByDateRange(income, dateRange);
  }, [dateRange, monthIncome, income]);

  const historyLabel = dateRange
    ? `${format(dateRange.start, 'dd MMM yyyy')} – ${format(dateRange.end, 'dd MMM yyyy')}`
    : format(new Date(selectedYear, selectedMonth), 'MMMM yyyy');

  const setDateRange = (range: DateRange) => setDateRangeState(range);
  const clearDateRange = () => setDateRangeState(null);

  const goToPreviousMonth = () => {
    if (selectedMonth === 0) {
      setSelectedMonth(11);
      setSelectedYear(selectedYear - 1);
    } else {
      setSelectedMonth(selectedMonth - 1);
    }
  };

  const goToNextMonth = () => {
    if (selectedMonth === 11) {
      setSelectedMonth(0);
      setSelectedYear(selectedYear + 1);
    } else {
      setSelectedMonth(selectedMonth + 1);
    }
  };

  const goToMonth = (year: number, month: number) => {
    setSelectedYear(year);
    setSelectedMonth(month);
  };

  const goToCurrentMonth = () => {
    setSelectedMonth(currentMonth);
    setSelectedYear(currentYear);
  };

  const handleEdit = (expense: Expense) => setEditingExpense(expense);
  const handleAddExpense = async (expense: Parameters<typeof addExpense>[0]) => await addExpense(expense);
  const handleAddIncome = async (entry: Parameters<typeof addIncome>[0]) => await addIncome(entry);
  const handleDeleteExpense = async (id: string) => await deleteExpense(id);

  const topCategory = allTimeCategoryAnalysis[0];
  const topCategoryAmount = topCategory?.amount || 0;
  const topCategoryName = topCategory?.category || 'N/A';

  const hasDeficit = financeTotals.cashFlowDeficit > 0;
  const isFuture = financeTotals.isSelectedMonthInFuture;

  return {
    user,
    logout,
    theme,
    toggleTheme,
    loading,
    updateExpense,

    selectedYear,
    selectedMonth,
    currentYear,
    currentMonth,
    goToPreviousMonth,
    goToNextMonth,
    goToCurrentMonth,
    goToMonth,

    editingExpense,
    setEditingExpense,
    showEarningsModal,
    setShowEarningsModal,
    showEarningsPage,
    setShowEarningsPage,
    showLedgerPage,
    setShowLedgerPage,
    showProfilePage,
    setShowProfilePage,
    showImportPage,
    setShowImportPage,
    showDebtDetails,
    setShowDebtDetails,

    financeTotals,
    selectedMonthEarnings,
    expenses,
    monthExpenses,
    monthIncome,
    monthTotal,
    totalAllTime,
    monthCategoryAnalysis,
    allTimeCategoryAnalysis,
    monthNetCashFlow,

    dateRange,
    setDateRange,
    clearDateRange,
    historyExpenses,
    historyIncome,
    historyLabel,

    handleEdit,
    handleAddExpense,
    handleAddIncome,
    handleDeleteExpense,
    handleDeleteIncome,

    topCategoryAmount,
    topCategoryName,
    hasDeficit,
    isFuture,
  };
}

export type DashboardData = ReturnType<typeof useDashboardData>;
