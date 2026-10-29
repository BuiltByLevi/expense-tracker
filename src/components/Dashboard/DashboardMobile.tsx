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
import EarningsHistoryPage from './EarningsHistoryPageMobile';
import TransactionLedgerPage from './TransactionLedgerPageMobile';
import ProfilePage from './ProfilePageMobile';
import type { Expense } from '../../types';
import { format, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { theme as design } from '../../styles/theme';
import { computeFinanceTotals } from '../../utils/finance';

type GraphType = 'total' | 'monthly';

const DashboardMobile: React.FC = () => {
  const { user, logout } = useAuth();
  const { earnings, getEarningsForMonth } = useEarnings();
  const { theme, toggleTheme } = useTheme();
  const { expenses, loading, addExpense, updateExpense, deleteExpense } = useExpenses();
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [showEarningsModal, setShowEarningsModal] = useState(false);
  const [showLedgerPage, setShowLedgerPage] = useState(false);
  const [showEarningsPage, setShowEarningsPage] = useState(false);
  const [showProfilePage, setShowProfilePage] = useState(false);
  const [activeTab, setActiveTab] = useState<'expenses' | 'stats'>('expenses');
  const [activeGraph, setActiveGraph] = useState<GraphType>('total');
  const [showDebtDetails, setShowDebtDetails] = useState(false);

  const financeTotals = useMemo(
    () => computeFinanceTotals(expenses, earnings, getEarningsForMonth, selectedYear, selectedMonth),
    [expenses, earnings, getEarningsForMonth, selectedYear, selectedMonth]
  );

  const selectedMonthEarnings = useMemo(() => {
    const record = getEarningsForMonth(selectedYear, selectedMonth);
    return record ? { amount: record.amount, status: record.status } : { amount: earnings, status: 'missing' as const };
  }, [getEarningsForMonth, selectedYear, selectedMonth, earnings]);

  const getMonthExpenses = () => {
    const start = startOfMonth(new Date(selectedYear, selectedMonth));
    const end = endOfMonth(new Date(selectedYear, selectedMonth));
    return expenses.filter((expense) => isWithinInterval(new Date(expense.date), { start, end }));
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

  const handleEdit = (expense: Expense) => setEditingExpense(expense);
  const handleAddExpense = async (expense: Parameters<typeof addExpense>[0]) => await addExpense(expense);
  const handleDeleteExpense = async (id: string) => await deleteExpense(id);
  const monthName = format(new Date(selectedYear, selectedMonth), 'MMM yyyy');

  const topCategory = allTimeCategoryAnalysis[0];
  const topCategoryAmount = topCategory?.amount || 0;
  const topCategoryName = topCategory?.category || 'N/A';

  const hasDeficit = financeTotals.cashFlowDeficit > 0;
  const isFuture = financeTotals.isSelectedMonthInFuture;

  if (showLedgerPage) return <TransactionLedgerPage onBack={() => setShowLedgerPage(false)} />;
  if (showEarningsPage) return <EarningsHistoryPage onBack={() => setShowEarningsPage(false)} />;
  if (showProfilePage) return <ProfilePage onBack={() => setShowProfilePage(false)} />;

  return (
    <div className="glass-page" style={{ padding: '10px' }}>
      <div style={{ minHeight: '100vh', overflowX: 'hidden', width: '100%', boxSizing: 'border-box' }}>

        <div className="glass-card animate-in" style={{ padding: '14px', marginBottom: '10px', width: '100%', boxSizing: 'border-box' }}>
          <div style={{ textAlign: 'center', marginBottom: '12px' }}>
            <h1 className="text-gradient" style={{ fontSize: '18px', fontWeight: 700, margin: 0 }}>Expense Tracker</h1>
            <p style={{ fontSize: '10px', color: design.colors.textSecondary, margin: '2px 0 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user?.email?.split('@')[0]}
            </p>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr 1fr 1fr 1fr', gap: '4px' }}>
            <button className="theme-toggle" onClick={toggleTheme} style={{ width: '34px', height: '34px', fontSize: '14px', flexShrink: 0, padding: 0 }} aria-label="Toggle theme">
              {theme === 'light' ? '🌙' : '☀️'}
            </button>
            <button onClick={() => setShowEarningsPage(true)} className="btn btn-ghost" style={{ padding: '6px 2px', fontSize: '9px', whiteSpace: 'nowrap' }}>
              Earnings
            </button>
            <button onClick={() => setShowLedgerPage(true)} className="btn btn-ghost" style={{ padding: '6px 2px', fontSize: '9px', whiteSpace: 'nowrap' }}>
              Statement
            </button>
            <button 
              onClick={() => setShowProfilePage(true)} 
              className="btn btn-ghost" 
              style={{ padding: '4px 2px', fontSize: '9px', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
            >
              {user?.photoURL ? (
                <img 
                  src={user.photoURL} 
                  alt="Profile" 
                  style={{ width: '16px', height: '16px', borderRadius: '50%', objectFit: 'cover' }} 
                />
              ) : (
                <span>👤</span>
              )}
              Profile
            </button>
            <button onClick={logout} className="btn btn-ghost" style={{ padding: '6px 2px', fontSize: '9px', whiteSpace: 'nowrap' }}>
              Logout
            </button>
          </div>
        </div>

        <div className="glass-card animate-in animate-in-delay-1" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', marginBottom: '10px', gap: '8px' }}>
          <button onClick={goToPreviousMonth} className="btn btn-ghost" style={{ padding: '8px 12px', fontSize: '14px', flexShrink: 0 }}>◀</button>
          <span style={{ fontSize: '14px', fontWeight: 700, color: design.colors.textPrimary, textAlign: 'center', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{monthName}</span>
          <button onClick={goToNextMonth} className="btn btn-ghost" style={{ padding: '8px 12px', fontSize: '14px', flexShrink: 0 }}>▶</button>
        </div>

        {selectedMonthEarnings.status === 'estimated' && !isFuture && (
          <div className="glass-card animate-in" style={{ padding: '10px 12px', marginBottom: '10px', background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.15) 0%, rgba(251, 191, 36, 0.15) 100%)', border: `1px solid ${design.colors.warning}40`, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '16px', flexShrink: 0 }}>⚠️</span>
            <div style={{ minWidth: 0 }}>
              <p style={{ fontSize: '10px', fontWeight: 700, color: design.colors.textPrimary, margin: 0 }}>Estimated earnings for {monthName}</p>
              <p style={{ fontSize: '9px', color: design.colors.textSecondary, margin: '1px 0 0 0' }}>Tap "Edit" to confirm the exact amount.</p>
            </div>
          </div>
        )}

        {isFuture && (
          <div className="glass-card animate-in" style={{ padding: '10px 12px', marginBottom: '10px', background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.15) 0%, rgba(251, 191, 36, 0.15) 100%)', border: `1px solid ${design.colors.warning}40`, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '16px', flexShrink: 0 }}>🔮</span>
            <div style={{ minWidth: 0 }}>
              <p style={{ fontSize: '10px', fontWeight: 700, color: design.colors.textPrimary, margin: 0 }}>Future month — historical metrics not calculated</p>
            </div>
          </div>
        )}

        {hasDeficit && !isFuture && (
          <div className="glass-card animate-in" onClick={() => setShowDebtDetails(true)} style={{ padding: '12px', marginBottom: '10px', background: 'linear-gradient(135deg, #ef4444 0%, #f97316 100%)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
            <div style={{ minWidth: 0, flex: 1 }}>
              <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.9)', margin: 0, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>⚠ Cash-Flow Deficit</p>
              <p style={{ fontSize: '16px', fontWeight: 700, color: 'white', margin: '2px 0 0 0' }}>₹{financeTotals.cashFlowDeficit.toLocaleString('en-IN')}</p>
            </div>
            <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.9)', fontWeight: 600, flexShrink: 0 }}>View →</span>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '8px', marginBottom: '10px', width: '100%' }}>
          <div className="glass-card" style={{ padding: '10px 6px', textAlign: 'center', minWidth: 0, overflow: 'hidden' }}>
            <p style={{ fontSize: '8px', color: design.colors.textSecondary, margin: 0, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.03em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              Earnings {selectedMonthEarnings.status === 'estimated' && <span style={{ color: design.colors.warning }}>⚠</span>}
            </p>
            <p style={{ fontSize: '12px', fontWeight: 700, color: design.colors.textPrimary, margin: '4px 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>₹{selectedMonthEarnings.amount.toLocaleString('en-IN')}</p>
            <button onClick={() => setShowEarningsModal(true)} style={{ fontSize: '8px', padding: '2px 6px', background: design.colors.primaryLight, border: 'none', borderRadius: '8px', color: design.colors.primaryDark, fontWeight: 600, cursor: 'pointer' }}>Edit</button>
          </div>
          <div className="glass-card" style={{ padding: '10px 6px', textAlign: 'center', minWidth: 0, overflow: 'hidden' }}>
            <p style={{ fontSize: '8px', color: design.colors.textSecondary, margin: 0, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.03em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Spending</p>
            <p style={{ fontSize: '12px', fontWeight: 700, color: design.colors.textPrimary, margin: '4px 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>₹{monthTotal.toLocaleString('en-IN')}</p>
          </div>
          <div className="glass-card" style={{ padding: '10px 6px', textAlign: 'center', minWidth: 0, overflow: 'hidden' }}>
            <p style={{ fontSize: '8px', color: design.colors.textSecondary, margin: 0, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.03em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Net Flow</p>
            <p style={{ fontSize: '12px', fontWeight: 700, margin: '4px 0', color: monthNetCashFlow >= 0 ? design.colors.success : design.colors.danger, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>₹{monthNetCashFlow.toLocaleString('en-IN')}</p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '8px', marginBottom: '10px' }}>
          <div className="glass-card" style={{ padding: '10px', textAlign: 'center', minWidth: 0, overflow: 'hidden' }}>
            <p style={{ fontSize: '8px', color: design.colors.textSecondary, margin: 0, fontWeight: 600, textTransform: 'uppercase' }}>Cumulative Net Flow</p>
            <p style={{ fontSize: '13px', fontWeight: 700, margin: '3px 0 0 0', color: isFuture ? design.colors.textTertiary : financeTotals.cumulativeNetCashFlow > 0 ? design.colors.success : design.colors.textSecondary }}>
              {isFuture ? '—' : `₹${financeTotals.cumulativeNetCashFlow.toLocaleString('en-IN')}`}
            </p>
          </div>
          <div className="glass-card" style={{ padding: '10px', textAlign: 'center', minWidth: 0, overflow: 'hidden' }}>
            <p style={{ fontSize: '8px', color: design.colors.textSecondary, margin: 0, fontWeight: 600, textTransform: 'uppercase' }}>Cash-Flow Deficit</p>
            <p style={{ fontSize: '13px', fontWeight: 700, margin: '3px 0 0 0', color: isFuture ? design.colors.textTertiary : hasDeficit ? design.colors.danger : design.colors.success }}>
              {isFuture ? '—' : `₹${financeTotals.cashFlowDeficit.toLocaleString('en-IN')}`}
            </p>
          </div>
        </div>

        <div className="glass-card" style={{ padding: '4px', marginBottom: '10px' }}>
          <div className="tab-container" style={{ width: '100%' }}>
            <button onClick={() => setActiveTab('expenses')} className={`tab ${activeTab === 'expenses' ? 'active' : ''}`} style={{ fontSize: '12px', padding: '8px' }}>Expenses</button>
            <button onClick={() => setActiveTab('stats')} className={`tab ${activeTab === 'stats' ? 'active' : ''}`} style={{ fontSize: '12px', padding: '8px' }}>Stats</button>
          </div>
        </div>

        {activeTab === 'expenses' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div className="glass-card" style={{ padding: '14px' }}>
              <h3 style={{ fontSize: '13px', fontWeight: 700, color: design.colors.textPrimary, margin: '0 0 12px 0' }}>Quick Transaction</h3>
              <ExpenseForm onAddExpense={handleAddExpense} />
            </div>
            <div className="glass-card" style={{ padding: '14px', maxHeight: '500px', overflowY: 'auto' }}>
              <h3 style={{ fontSize: '13px', fontWeight: 700, color: design.colors.textPrimary, margin: '0 0 12px 0' }}>Transaction History</h3>
              {loading ? <div style={{ textAlign: 'center', padding: '20px', color: design.colors.textSecondary, fontSize: '12px' }}>Loading...</div> : <ExpenseList expenses={monthExpenses} onDelete={handleDeleteExpense} onEdit={handleEdit} />}
            </div>
          </div>
        )}

        {activeTab === 'stats' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div className="glass-card" style={{ padding: '4px' }}>
              <div className="tab-container" style={{ width: '100%' }}>
                <button onClick={() => setActiveGraph('total')} className={`tab ${activeGraph === 'total' ? 'active' : ''}`} style={{ fontSize: '12px', padding: '8px' }}>Total</button>
                <button onClick={() => setActiveGraph('monthly')} className={`tab ${activeGraph === 'monthly' ? 'active' : ''}`} style={{ fontSize: '12px', padding: '8px' }}>Monthly</button>
              </div>
            </div>
            <div className="glass-card" style={{ padding: '14px', overflow: 'hidden' }}>
              {activeGraph === 'total' ? (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <h3 style={{ fontSize: '13px', fontWeight: 700, color: design.colors.textPrimary, margin: 0 }}>Total Expenses</h3>
                    <p style={{ fontSize: '14px', fontWeight: 700, color: design.colors.primary, margin: 0 }}>₹{totalAllTime.toLocaleString('en-IN')}</p>
                  </div>
                  <div style={{ width: '100%', height: '240px', display: 'flex', flexDirection: 'column' }}>
                    <CategoryPieChart data={allTimeCategoryAnalysis} height={240} />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '8px', marginTop: '12px', paddingTop: '12px', borderTop: `1px solid ${design.colors.primary}20` }}>
                    <div style={{ textAlign: 'center', padding: '8px', background: 'rgba(255,255,255,0.5)', borderRadius: '10px' }}>
                      <p style={{ fontSize: '8px', color: design.colors.textSecondary, margin: 0, fontWeight: 600, textTransform: 'uppercase' }}>Top</p>
                      <p style={{ fontSize: '11px', fontWeight: 700, color: design.colors.textPrimary, margin: '2px 0' }}>{topCategoryName}</p>
                      <p style={{ fontSize: '10px', color: design.colors.primary, margin: 0, fontWeight: 600 }}>₹{topCategoryAmount.toLocaleString('en-IN')}</p>
                    </div>
                    <div style={{ textAlign: 'center', padding: '8px', background: 'rgba(255,255,255,0.5)', borderRadius: '10px' }}>
                      <p style={{ fontSize: '8px', color: design.colors.textSecondary, margin: 0, fontWeight: 600, textTransform: 'uppercase' }}>Monthly Avg</p>
                      <p style={{ fontSize: '11px', fontWeight: 700, color: design.colors.textPrimary, margin: '2px 0' }}>₹{financeTotals.calendarMonthAverage.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
                      <p style={{ fontSize: '8px', color: design.colors.textTertiary, margin: 0 }}>{financeTotals.calendarMonthCount} months</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <h3 style={{ fontSize: '13px', fontWeight: 700, color: design.colors.textPrimary, margin: 0 }}>{monthName}</h3>
                    <p style={{ fontSize: '14px', fontWeight: 700, color: design.colors.primary, margin: 0 }}>₹{monthTotal.toLocaleString('en-IN')}</p>
                  </div>
                  <div style={{ width: '100%', height: '240px', display: 'flex', flexDirection: 'column' }}>
                    <CategoryPieChart data={monthCategoryAnalysis} height={240} />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {showDebtDetails && (
          <div className="modal-overlay" onClick={() => setShowDebtDetails(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ width: '95vw', maxWidth: '500px', maxHeight: '85vh', overflowY: 'auto', padding: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h2 style={{ fontSize: '18px', fontWeight: 700, color: design.colors.textPrimary, margin: 0 }}>Financial History</h2>
                <button onClick={() => setShowDebtDetails(false)} style={{ background: 'rgba(0,0,0,0.05)', border: 'none', width: '28px', height: '28px', borderRadius: '50%', cursor: 'pointer', fontSize: '16px' }}>×</button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', marginBottom: '16px' }}>
                <div style={{ textAlign: 'center', padding: '10px', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '10px' }}>
                  <p style={{ fontSize: '9px', color: design.colors.textSecondary, margin: 0, fontWeight: 600, textTransform: 'uppercase' }}>Net Positive</p>
                  <p style={{ fontSize: '14px', fontWeight: 700, color: design.colors.success, margin: '4px 0 0 0' }}>₹{financeTotals.cumulativeNetCashFlow.toLocaleString('en-IN')}</p>
                </div>
                <div style={{ textAlign: 'center', padding: '10px', background: hasDeficit ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)', borderRadius: '10px' }}>
                  <p style={{ fontSize: '9px', color: design.colors.textSecondary, margin: 0, fontWeight: 600, textTransform: 'uppercase' }}>Deficit</p>
                  <p style={{ fontSize: '14px', fontWeight: 700, color: hasDeficit ? design.colors.danger : design.colors.success, margin: '4px 0 0 0' }}>₹{financeTotals.cashFlowDeficit.toLocaleString('en-IN')}</p>
                </div>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', minWidth: '400px', borderCollapse: 'collapse', fontSize: '11px' }}>
                  <thead>
                    <tr style={{ borderBottom: `2px solid ${design.colors.primary}30` }}>
                      <th style={{ padding: '8px 4px', textAlign: 'left', fontSize: '9px', textTransform: 'uppercase', color: design.colors.textSecondary }}>Month</th>
                      <th style={{ padding: '8px 4px', textAlign: 'right', fontSize: '9px', textTransform: 'uppercase', color: design.colors.textSecondary }}>Earned</th>
                      <th style={{ padding: '8px 4px', textAlign: 'right', fontSize: '9px', textTransform: 'uppercase', color: design.colors.textSecondary }}>Spent</th>
                      <th style={{ padding: '8px 4px', textAlign: 'right', fontSize: '9px', textTransform: 'uppercase', color: design.colors.textSecondary }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {financeTotals.monthlySummaries.map((summary) => {
                      const isDeficit = summary.debtAtEndOfMonth > 0;
                      return (
                        <tr key={`${summary.year}-${summary.month}`} style={{ borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                          <td style={{ padding: '8px 4px', fontWeight: 600 }}>
                            {format(new Date(summary.year, summary.month), 'MMM yy')}
                            {summary.earningsStatus === 'estimated' && <span style={{ marginLeft: '4px', fontSize: '8px', color: design.colors.warning }}>EST</span>}
                          </td>
                          <td style={{ padding: '8px 4px', textAlign: 'right' }}>₹{summary.earnings.toLocaleString('en-IN')}</td>
                          <td style={{ padding: '8px 4px', textAlign: 'right' }}>₹{summary.spent.toLocaleString('en-IN')}</td>
                          <td style={{ padding: '8px 4px', textAlign: 'right', fontWeight: 700, color: isDeficit ? design.colors.danger : design.colors.success }}>
                            {isDeficit ? `-₹${summary.debtAtEndOfMonth.toLocaleString('en-IN')}` : `+₹${summary.savingsAtEndOfMonth.toLocaleString('en-IN')}`}
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

        <EarningsModal isOpen={showEarningsModal} onClose={() => setShowEarningsModal(false)} year={selectedYear} month={selectedMonth} />
        <EditExpenseModal expense={editingExpense} isOpen={!!editingExpense} onClose={() => setEditingExpense(null)} onUpdate={updateExpense} />
      </div>
    </div>
  );
};

export default DashboardMobile;