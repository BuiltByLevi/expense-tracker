import React, { useState, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useExpenses } from '../../hooks/useExpenses';
import { useEarnings } from '../../context/EarningsContext';
import { useTheme } from '../../context/ThemeContext';
import ExpenseForm from '../ExpenseForm/ExpenseForm';
import ExpenseList from '../ExpenseList/ExpenseList';
import CategoryPieChart from '../Charts/CategoryPieChart';
import EditExpenseModal from '../ExpenseList/EditExpenseModal';
import EarningsModal from './EarningsModal';
import EarningsHistoryPage from './EarningsHistoryPage'; // <-- NEW
import type { Expense } from '../../types';
import { format, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { theme as design } from '../../styles/theme';
import { computeFinanceTotals } from '../../utils/finance';

type GraphType = 'total' | 'monthly';

const DashboardWeb: React.FC = () => {
  const { user, logout } = useAuth();
  const { earnings, getEarningsForMonth } = useEarnings();
  const { theme, toggleTheme } = useTheme();
  const { expenses, loading, addExpense, updateExpense, deleteExpense } = useExpenses();
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [showEarningsModal, setShowEarningsModal] = useState(false);
  const [showEarningsPage, setShowEarningsPage] = useState(false); // <-- NEW
  const [activeView, setActiveView] = useState<GraphType>('total');
  const [showDebtDetails, setShowDebtDetails] = useState(false);

  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();

  const financeTotals = useMemo(
    () =>
      computeFinanceTotals(
        expenses,
        earnings,
        getEarningsForMonth,
        selectedYear,
        selectedMonth
      ),
    [expenses, earnings, getEarningsForMonth, selectedYear, selectedMonth]
  );

  const selectedMonthEarnings = useMemo(() => {
    const record = getEarningsForMonth(selectedYear, selectedMonth);
    if (record) {
      return { amount: record.amount, status: record.status };
    }
    return { amount: earnings, status: 'missing' as const };
  }, [getEarningsForMonth, selectedYear, selectedMonth, earnings]);

  const getMonthExpenses = () => {
    const start = startOfMonth(new Date(selectedYear, selectedMonth));
    const end = endOfMonth(new Date(selectedYear, selectedMonth));
    return expenses.filter((expense) => {
      const expenseDate = new Date(expense.date);
      return isWithinInterval(expenseDate, { start, end });
    });
  };

  const monthExpenses = getMonthExpenses();
  const monthTotal = monthExpenses.reduce((sum, e) => sum + e.amount, 0);
  const totalAllTime = expenses.reduce((sum, e) => sum + e.amount, 0);

  const getMonthCategoryAnalysis = () => {
    const categoryMap = new Map<string, number>();
    let total = 0;
    monthExpenses.forEach((expense) => {
      categoryMap.set(expense.category, (categoryMap.get(expense.category) || 0) + expense.amount);
      total += expense.amount;
    });
    const analysis: { category: string; amount: number; percentage: number }[] = [];
    categoryMap.forEach((amount, category) => {
      analysis.push({ category, amount, percentage: total > 0 ? (amount / total) * 100 : 0 });
    });
    return analysis.sort((a, b) => b.amount - a.amount);
  };

  const getAllTimeCategoryAnalysis = () => {
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
  };

  const monthCategoryAnalysis = getMonthCategoryAnalysis();
  const allTimeCategoryAnalysis = getAllTimeCategoryAnalysis();

  const monthNetCashFlow = selectedMonthEarnings.amount - monthTotal;

  const goToPreviousMonth = () => {
    if (selectedMonth === 0) { setSelectedMonth(11); setSelectedYear(selectedYear - 1); }
    else { setSelectedMonth(selectedMonth - 1); }
  };

  const goToNextMonth = () => {
    if (selectedMonth === 11) { setSelectedMonth(0); setSelectedYear(selectedYear + 1); }
    else { setSelectedMonth(selectedMonth + 1); }
  };

  const goToCurrentMonth = () => {
    setSelectedMonth(currentMonth);
    setSelectedYear(currentYear);
  };

  const handleEdit = (expense: Expense) => setEditingExpense(expense);
  const handleAddExpense = async (expense: Omit<Expense, 'id' | 'userId'>) => await addExpense(expense);
  const handleDeleteExpense = async (id: string) => await deleteExpense(id);
  const monthName = format(new Date(selectedYear, selectedMonth), 'MMMM yyyy');

  const topCategory = allTimeCategoryAnalysis[0];
  const topCategoryAmount = topCategory?.amount || 0;
  const topCategoryName = topCategory?.category || 'N/A';

  const hasDeficit = financeTotals.cashFlowDeficit > 0;
  const isFuture = financeTotals.isSelectedMonthInFuture;

  // Conditional render for the new History Page
  if (showEarningsPage) {
    return <EarningsHistoryPage onBack={() => setShowEarningsPage(false)} />;
  }

  return (
    <div style={{ minHeight: '100vh', padding: '24px' }}>
      <div style={{ maxWidth: '1600px', margin: '0 auto' }}>

        {/* Header */}
        <div className="glass-card animate-in" style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 28px', marginBottom: '20px',
        }}>
          <div>
            <h1 className="text-gradient" style={{ fontSize: '24px', fontWeight: 700, margin: 0, letterSpacing: '-0.02em' }}>
              Expense Tracker
            </h1>
            <p style={{ fontSize: '13px', color: design.colors.textSecondary, margin: '4px 0 0 0' }}>
              Welcome back, {user?.email?.split('@')[0]}
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button onClick={() => setShowEarningsPage(true)} className="btn btn-ghost" style={{ padding: '10px 20px', fontSize: '13px' }}>
              Manage Earnings
            </button>
            <button className="theme-toggle" onClick={toggleTheme} title={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'} aria-label="Toggle theme">
              {theme === 'light' ? '🌙' : '☀️'}
            </button>
            <button onClick={logout} className="btn btn-ghost" style={{ padding: '10px 20px' }}>
              Logout
            </button>
          </div>
        </div>

        {/* Month Navigation */}
        <div className="glass-card animate-in animate-in-delay-1" style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', marginBottom: '20px', flexWrap: 'wrap', gap: '12px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button onClick={goToPreviousMonth} className="btn btn-ghost btn-icon">◀</button>
            <span style={{ fontSize: '16px', fontWeight: 700, color: design.colors.textPrimary, minWidth: '160px', textAlign: 'center' }}>
              {monthName}
            </span>
            <button onClick={goToNextMonth} className="btn btn-ghost btn-icon">▶</button>
            <button onClick={goToCurrentMonth} className="btn btn-primary" style={{ padding: '8px 16px', fontSize: '12px' }}>
              Today
            </button>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '12px', color: design.colors.textSecondary, fontWeight: 600 }}>Monthly Total:</span>
            <span style={{ fontSize: '20px', fontWeight: 700, color: design.colors.primary }}>₹{monthTotal.toLocaleString('en-IN')}</span>
            <button onClick={() => setShowEarningsModal(true)} className="btn btn-ghost" style={{ padding: '8px 14px', fontSize: '12px' }}>
              Edit Earnings
            </button>
          </div>
        </div>

        {/* Estimated Earnings Banner */}
        {selectedMonthEarnings.status === 'estimated' && !isFuture && (
          <div className="glass-card animate-in" style={{
            display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 24px', marginBottom: '20px',
            background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.1) 0%, rgba(251, 191, 36, 0.1) 100%)',
            border: `1px solid ${design.colors.warning}30`,
          }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: design.colors.warning, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', color: 'white', flexShrink: 0 }}>
              ⚠️
            </div>
            <div>
              <p style={{ fontSize: '14px', fontWeight: 700, color: design.colors.textPrimary, margin: 0 }}>
                Estimated Earnings for {monthName}
              </p>
              <p style={{ fontSize: '12px', color: design.colors.textSecondary, margin: '2px 0 0 0' }}>
                This month's earnings are estimated based on your default salary. Click "Edit Earnings" to confirm the exact amount for this month.
              </p>
            </div>
          </div>
        )}

        {/* Future Month Warning */}
        {isFuture && (
          <div className="glass-card animate-in" style={{
            display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 24px', marginBottom: '20px',
            background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.1) 0%, rgba(251, 191, 36, 0.1) 100%)',
            border: `1px solid ${design.colors.warning}30`,
          }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: design.colors.warning, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', color: 'white', flexShrink: 0 }}>
              🔮
            </div>
            <div>
              <p style={{ fontSize: '14px', fontWeight: 700, color: design.colors.textPrimary, margin: 0 }}>
                Future month — historical metrics not calculated
              </p>
              <p style={{ fontSize: '12px', color: design.colors.textSecondary, margin: '2px 0 0 0' }}>
                You can log expenses for {monthName}, but cumulative totals will update after the month begins.
              </p>
            </div>
          </div>
        )}

        {/* 5 KPI Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gap: '16px', marginBottom: '20px' }}>
          <div className="glass-card animate-in animate-in-delay-1" style={{ padding: '20px' }}>
            <p className="kpi-label">
              Monthly Earnings
              {selectedMonthEarnings.status === 'estimated' && <span style={{ marginLeft: '6px', fontSize: '9px', color: design.colors.warning }}>⚠ EST</span>}
              {selectedMonthEarnings.status === 'missing' && <span style={{ marginLeft: '6px', fontSize: '9px', color: design.colors.textTertiary }}>(default)</span>}
            </p>
            <h2 className="kpi-value" style={{ fontSize: '22px' }}>₹{selectedMonthEarnings.amount.toLocaleString('en-IN')}</h2>
          </div>

          <div className="glass-card animate-in animate-in-delay-1" style={{ padding: '20px' }}>
            <p className="kpi-label">Monthly Spending</p>
            <h2 className="kpi-value" style={{ fontSize: '22px' }}>₹{monthTotal.toLocaleString('en-IN')}</h2>
            <p style={{ fontSize: '11px', color: design.colors.textSecondary, margin: '8px 0 0 0', fontWeight: 500 }}>{monthExpenses.length} transactions</p>
          </div>

          <div className="glass-card animate-in animate-in-delay-2" style={{ padding: '20px' }}>
            <p className="kpi-label">Monthly Net Cash Flow</p>
            <h2 className="kpi-value" style={{ fontSize: '22px', color: monthNetCashFlow >= 0 ? design.colors.success : design.colors.danger }}>
              ₹{monthNetCashFlow.toLocaleString('en-IN')}
            </h2>
            <p style={{ fontSize: '11px', color: design.colors.textSecondary, margin: '8px 0 0 0', fontWeight: 500 }}>
              {monthNetCashFlow >= 0 ? 'Earnings − Spending' : 'Overspent this month'}
            </p>
          </div>

          <div className="glass-card animate-in animate-in-delay-2" style={{ padding: '20px' }}>
            <p className="kpi-label">Cumulative Net Cash Flow</p>
            {isFuture ? (
              <>
                <h2 className="kpi-value" style={{ fontSize: '22px', color: design.colors.textTertiary }}>—</h2>
                <p style={{ fontSize: '11px', color: design.colors.textSecondary, margin: '8px 0 0 0', fontWeight: 500 }}>Not calculated for future</p>
              </>
            ) : (
              <>
                <h2 className="kpi-value" style={{ fontSize: '22px', color: financeTotals.cumulativeNetCashFlow > 0 ? design.colors.success : design.colors.textSecondary }}>
                  ₹{financeTotals.cumulativeNetCashFlow.toLocaleString('en-IN')}
                </h2>
                <p style={{ fontSize: '11px', color: design.colors.textSecondary, margin: '8px 0 0 0', fontWeight: 500 }}>Running balance since first expense</p>
              </>
            )}
          </div>

          <div className="glass-card animate-in animate-in-delay-3" onClick={() => !isFuture && setShowDebtDetails(true)} style={{ padding: '20px', cursor: isFuture ? 'default' : 'pointer', background: isFuture ? 'rgba(255,255,255,0.5)' : hasDeficit ? 'linear-gradient(135deg, #ef4444 0%, #f97316 100%)' : design.colors.primaryGradient, border: 'none', opacity: isFuture ? 0.6 : 1 }}>
            <p className="kpi-label" style={{ color: isFuture ? design.colors.textSecondary : 'rgba(255,255,255,0.85)' }}>
              {isFuture ? '🔮 Cash-Flow Deficit' : hasDeficit ? '⚠ Cash-Flow Deficit' : '✓ Cash-Flow Deficit'}
            </p>
            {isFuture ? (
              <>
                <h2 className="kpi-value" style={{ fontSize: '22px', color: design.colors.textTertiary }}>—</h2>
                <p style={{ fontSize: '11px', color: design.colors.textSecondary, margin: '8px 0 0 0', fontWeight: 500 }}>Not calculated for future</p>
              </>
            ) : (
              <>
                <h2 className="kpi-value" style={{ fontSize: '22px', color: 'white' }}>₹{financeTotals.cashFlowDeficit.toLocaleString('en-IN')}</h2>
                <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.85)', margin: '8px 0 0 0', fontWeight: 500 }}>{hasDeficit ? 'Spending exceeded earnings' : 'No deficit — positive cash flow'}</p>
              </>
            )}
          </div>
        </div>

        {/* Deficit Alert */}
        {hasDeficit && !isFuture && (
          <div className="glass-card animate-in" style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', marginBottom: '20px',
            background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(249, 115, 22, 0.1) 100%)',
            border: `1px solid ${design.colors.danger}30`,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: design.colors.danger, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', color: 'white' }}>
                ⚠
              </div>
              <div>
                <p style={{ fontSize: '14px', fontWeight: 700, color: design.colors.textPrimary, margin: 0 }}>
                  Cash-flow deficit: ₹{financeTotals.cashFlowDeficit.toLocaleString('en-IN')}
                </p>
                <p style={{ fontSize: '12px', color: design.colors.textSecondary, margin: '2px 0 0 0' }}>
                  This is cumulative spending above earnings — not tracked actual debt.
                </p>
              </div>
            </div>
            <button onClick={() => setShowDebtDetails(true)} className="btn btn-ghost" style={{ padding: '8px 16px', fontSize: '12px', flexShrink: 0 }}>
              View Breakdown
            </button>
          </div>
        )}

        {/* Financial History Modal */}
        {showDebtDetails && (
          <div className="modal-overlay" onClick={() => setShowDebtDetails(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '700px', maxHeight: '80vh', overflowY: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                <div>
                  <h2 style={{ fontSize: '20px', fontWeight: 700, color: design.colors.textPrimary, marginBottom: '6px' }}>Financial History</h2>
                  <p style={{ fontSize: '13px', color: design.colors.textSecondary, margin: 0 }}>Month-by-month cash flow (per-month earnings)</p>
                </div>
                <button onClick={() => setShowDebtDetails(false)} style={{ background: 'rgba(0,0,0,0.05)', border: 'none', width: '32px', height: '32px', borderRadius: '50%', cursor: 'pointer', fontSize: '18px', color: design.colors.textSecondary }}>×</button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '20px', padding: '16px', background: 'rgba(99, 102, 241, 0.05)', borderRadius: '12px' }}>
                <div style={{ textAlign: 'center' }}>
                  <p style={{ fontSize: '10px', color: design.colors.textSecondary, margin: 0, textTransform: 'uppercase', fontWeight: 600 }}>Total Earned</p>
                  <p style={{ fontSize: '16px', fontWeight: 700, color: design.colors.textPrimary, margin: '4px 0 0 0' }}>₹{financeTotals.totalEarnings.toLocaleString('en-IN')}</p>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <p style={{ fontSize: '10px', color: design.colors.textSecondary, margin: 0, textTransform: 'uppercase', fontWeight: 600 }}>Total Spent</p>
                  <p style={{ fontSize: '16px', fontWeight: 700, color: design.colors.textPrimary, margin: '4px 0 0 0' }}>₹{financeTotals.totalSpent.toLocaleString('en-IN')}</p>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <p style={{ fontSize: '10px', color: design.colors.textSecondary, margin: 0, textTransform: 'uppercase', fontWeight: 600 }}>{hasDeficit ? 'Deficit' : 'Net Positive'}</p>
                  <p style={{ fontSize: '16px', fontWeight: 700, color: hasDeficit ? design.colors.danger : design.colors.success, margin: '4px 0 0 0' }}>
                    ₹{hasDeficit ? financeTotals.cashFlowDeficit.toLocaleString('en-IN') : financeTotals.cumulativeNetCashFlow.toLocaleString('en-IN')}
                  </p>
                </div>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ borderBottom: `2px solid ${design.colors.primary}30` }}>
                      <th style={{ padding: '10px 8px', textAlign: 'left', color: design.colors.textSecondary, fontSize: '11px', textTransform: 'uppercase', fontWeight: 600 }}>Month</th>
                      <th style={{ padding: '10px 8px', textAlign: 'right', color: design.colors.textSecondary, fontSize: '11px', textTransform: 'uppercase', fontWeight: 600 }}>Earned</th>
                      <th style={{ padding: '10px 8px', textAlign: 'right', color: design.colors.textSecondary, fontSize: '11px', textTransform: 'uppercase', fontWeight: 600 }}>Spent</th>
                      <th style={{ padding: '10px 8px', textAlign: 'right', color: design.colors.textSecondary, fontSize: '11px', textTransform: 'uppercase', fontWeight: 600 }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {financeTotals.monthlySummaries.map((summary) => {
                      const isDeficit = summary.debtAtEndOfMonth > 0;
                      return (
                        <tr key={`${summary.year}-${summary.month}`} style={{ borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                          <td style={{ padding: '10px 8px', fontWeight: 600, color: design.colors.textPrimary }}>
                            {format(new Date(summary.year, summary.month), 'MMM yyyy')}
                            {summary.earningsStatus === 'estimated' && <span style={{ marginLeft: '6px', fontSize: '9px', color: design.colors.warning }}>EST</span>}
                            {summary.earningsStatus === 'missing' && <span style={{ marginLeft: '6px', fontSize: '9px', color: design.colors.textTertiary }}>(default)</span>}
                          </td>
                          <td style={{ padding: '10px 8px', textAlign: 'right', color: design.colors.textPrimary }}>₹{summary.earnings.toLocaleString('en-IN')}</td>
                          <td style={{ padding: '10px 8px', textAlign: 'right', color: design.colors.textPrimary }}>₹{summary.spent.toLocaleString('en-IN')}</td>
                          <td style={{ padding: '10px 8px', textAlign: 'right', fontWeight: 700 }}>
                            {isDeficit ? <span style={{ color: design.colors.danger }}>-₹{summary.debtAtEndOfMonth.toLocaleString('en-IN')}</span> : <span style={{ color: design.colors.success }}>+₹{summary.savingsAtEndOfMonth.toLocaleString('en-IN')}</span>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Main Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div className="glass-card animate-in animate-in-delay-2" style={{ padding: '24px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: design.colors.textPrimary, margin: '0 0 20px 0' }}>Quick Transaction</h3>
              <ExpenseForm onAddExpense={handleAddExpense} />
            </div>
            <div className="glass-card animate-in animate-in-delay-3" style={{ padding: '24px', maxHeight: '500px', overflowY: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 700, color: design.colors.textPrimary, margin: 0 }}>Transaction History</h3>
                <span style={{ fontSize: '12px', color: design.colors.textSecondary, fontWeight: 500 }}>{monthExpenses.length} items</span>
              </div>
              {loading ? <div style={{ textAlign: 'center', padding: '40px', color: design.colors.textSecondary }}>Loading...</div> : <ExpenseList expenses={monthExpenses} onDelete={handleDeleteExpense} onEdit={handleEdit} />}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div className="glass-card animate-in animate-in-delay-2" style={{ padding: '6px' }}>
              <div className="tab-container">
                <button onClick={() => setActiveView('total')} className={`tab ${activeView === 'total' ? 'active' : ''}`}>Total Expenses</button>
                <button onClick={() => setActiveView('monthly')} className={`tab ${activeView === 'monthly' ? 'active' : ''}`}>Monthly Expenses</button>
              </div>
            </div>
            <div className="glass-card animate-in animate-in-delay-3" style={{ padding: '24px', height: '500px', display: 'flex', flexDirection: 'column' }}>
              {activeView === 'total' ? (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <h3 style={{ fontSize: '16px', fontWeight: 700, color: design.colors.textPrimary, margin: 0 }}>Total Expenses</h3>
                    <div style={{ textAlign: 'right' }}>
                      <p style={{ fontSize: '11px', color: design.colors.textSecondary, margin: 0, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>All Time</p>
                      <p style={{ fontSize: '18px', fontWeight: 700, color: design.colors.primary, margin: 0 }}>₹{totalAllTime.toLocaleString('en-IN')}</p>
                    </div>
                  </div>
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 0 }}>
                    <CategoryPieChart data={allTimeCategoryAnalysis} height={260} />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginTop: '16px', paddingTop: '16px', borderTop: `1px solid ${design.colors.primary}20` }}>
                    <div style={{ textAlign: 'center' }}>
                      <p style={{ fontSize: '10px', color: design.colors.textSecondary, margin: 0, textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.05em' }}>Transactions</p>
                      <p style={{ fontSize: '18px', fontWeight: 700, color: design.colors.textPrimary, margin: '4px 0 0 0' }}>{expenses.length}</p>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <p style={{ fontSize: '10px', color: design.colors.textSecondary, margin: 0, textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.05em' }}>Top</p>
                      <p style={{ fontSize: '14px', fontWeight: 700, color: design.colors.textPrimary, margin: '4px 0 0 0' }}>{topCategoryName}</p>
                      <p style={{ fontSize: '11px', color: design.colors.primary, margin: 0, fontWeight: 600 }}>₹{topCategoryAmount.toLocaleString('en-IN')}</p>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <p style={{ fontSize: '10px', color: design.colors.textSecondary, margin: 0, textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.05em' }}>Monthly Avg</p>
                      <p style={{ fontSize: '18px', fontWeight: 700, color: design.colors.textPrimary, margin: '4px 0 0 0' }}>₹{financeTotals.calendarMonthAverage.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
                      <p style={{ fontSize: '10px', color: design.colors.textTertiary, margin: '2px 0 0 0' }}>over {financeTotals.calendarMonthCount} months</p>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <h3 style={{ fontSize: '16px', fontWeight: 700, color: design.colors.textPrimary, margin: 0 }}>{monthName}</h3>
                    <p style={{ fontSize: '18px', fontWeight: 700, color: design.colors.primary, margin: 0 }}>₹{monthTotal.toLocaleString('en-IN')}</p>
                  </div>
                  <div style={{ flex: 1, minHeight: 0 }}>
                    <CategoryPieChart data={monthCategoryAnalysis} height={380} />
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <EarningsModal isOpen={showEarningsModal} onClose={() => setShowEarningsModal(false)} year={selectedYear} month={selectedMonth} />
      <EditExpenseModal expense={editingExpense} isOpen={!!editingExpense} onClose={() => setEditingExpense(null)} onUpdate={updateExpense} />
    </div>
  );
};

export default DashboardWeb;