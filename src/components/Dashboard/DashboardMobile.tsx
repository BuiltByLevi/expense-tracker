import React, { Suspense, lazy, useState } from 'react';
import ExpenseForm from '../ExpenseForm/ExpenseForm';
import ExpenseList from '../ExpenseList/ExpenseList';
import CategoryPieChart from '../Charts/CategoryPieChart';
import EditExpenseModal from '../ExpenseList/EditExpenseModal';
import EarningsModal from './EarningsModal';
import EarningsHistoryPage from './EarningsHistoryPageMobile';
import TransactionLedgerPage from './TransactionLedgerPageMobile';
import ProfilePage from './ProfilePageMobile';
import StatCard from './StatCard';
import StatementUploadCard from './StatementUploadCard';
import MonthYearPicker from '../common/MonthYearPicker';
import DateRangeFilter from './DateRangeFilter';
import LogoMark from '../common/LogoMark';
import ListSkeleton from '../common/ListSkeleton';

// Lazy-loaded: pulls in xlsx/pdfjs/papaparse (~1MB), only fetched when the
// user actually opens the import flow instead of on every dashboard load.
const BankStatementImportPage = lazy(() => import('./BankStatementImportPageMobile'));
import { format } from 'date-fns';
import { theme as design, categoryColors } from '../../styles/theme';
import { useDashboardData } from '../../hooks/useDashboardData';

type GraphType = 'total' | 'monthly';

const DashboardMobile: React.FC = () => {
  const {
    user, logout, theme, toggleTheme, loading, updateExpense,
    selectedYear, selectedMonth, currentYear, currentMonth,
    goToPreviousMonth, goToNextMonth, goToCurrentMonth, goToMonth,
    editingExpense, setEditingExpense, showEarningsModal, setShowEarningsModal,
    showEarningsPage, setShowEarningsPage, showLedgerPage, setShowLedgerPage,
    showProfilePage, setShowProfilePage, showImportPage, setShowImportPage,
    showDebtDetails, setShowDebtDetails,
    financeTotals, selectedMonthEarnings, totalAllTime, expenses, monthTotal,
    monthCategoryAnalysis, allTimeCategoryAnalysis, monthNetCashFlow,
    dateRange, setDateRange, clearDateRange, historyExpenses, historyIncome, historyLabel,
    handleEdit, handleAddExpense, handleAddIncome, handleDeleteExpense, handleDeleteIncome,
    topCategoryAmount, topCategoryName, hasDeficit, isFuture,
  } = useDashboardData();

  const [activeTab, setActiveTab] = useState<'expenses' | 'stats'>('expenses');
  const [activeGraph, setActiveGraph] = useState<GraphType>('total');

  const monthName = format(new Date(selectedYear, selectedMonth), 'MMM yyyy');

  if (showLedgerPage) return <TransactionLedgerPage onBack={() => setShowLedgerPage(false)} />;
  if (showEarningsPage) return <EarningsHistoryPage onBack={() => setShowEarningsPage(false)} />;
  if (showProfilePage) return <ProfilePage onBack={() => setShowProfilePage(false)} />;
  if (showImportPage) {
    return (
      <Suspense fallback={<div style={{ minHeight: '100vh' }} />}>
        <BankStatementImportPage onBack={() => setShowImportPage(false)} />
      </Suspense>
    );
  }

  return (
    <div className="glass-page" style={{ padding: '10px' }}>
      <div style={{ minHeight: '100vh', overflowX: 'hidden', width: '100%', boxSizing: 'border-box' }}>

        <div className="glass-card animate-in" style={{ padding: '14px', marginBottom: '10px', width: '100%', boxSizing: 'border-box' }}>
          <div style={{ textAlign: 'center', marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              <div className="icon-box" style={{ width: '22px', height: '22px' }}>
                <LogoMark size={13} color="white" />
              </div>
              <h1 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: design.colors.textPrimary, letterSpacing: '0.01em' }}>PRATIQ</h1>
              <span className="badge-pill" style={{ fontSize: '9px', padding: '2px 8px' }}>Pro Expense Tracker</span>
            </div>
            <p style={{ fontSize: '11px', color: design.colors.textSecondary, margin: '2px 0 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              Welcome back, {user?.email?.split('@')[0]}
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr 1fr 1fr 1fr', gap: '4px' }}>
            <button className="theme-toggle" onClick={toggleTheme} style={{ width: '34px', height: '34px', fontSize: '14px', flexShrink: 0, padding: 0 }} aria-label="Toggle theme">
              {theme === 'light' ? '🌙' : '☀️'}
            </button>
            <button onClick={() => setShowEarningsPage(true)} className="btn btn-ghost" style={{ padding: '6px 2px', fontSize: '11px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              Earnings
            </button>
            <button onClick={() => setShowLedgerPage(true)} className="btn btn-ghost" style={{ padding: '6px 2px', fontSize: '11px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              Statement
            </button>
            <button
              onClick={() => setShowProfilePage(true)}
              className="btn btn-ghost"
              aria-label="Profile"
              style={{ padding: '4px 2px', fontSize: '11px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
            >
              {user?.photoURL ? (
                <img
                  src={user.photoURL}
                  alt=""
                  style={{ width: '16px', height: '16px', borderRadius: '50%', objectFit: 'cover' }}
                />
              ) : (
                <span aria-hidden="true">👤</span>
              )}
              Profile
            </button>
            <button onClick={logout} className="btn btn-ghost" style={{ padding: '6px 2px', fontSize: '11px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              Logout
            </button>
          </div>
        </div>

        <div style={{ marginBottom: '10px' }}>
          <StatementUploadCard onOpen={() => setShowImportPage(true)} />
        </div>

        {selectedMonthEarnings.status === 'estimated' && !isFuture && (
          <div className="glass-card animate-in" style={{ padding: '10px 12px', marginBottom: '10px', background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.15) 0%, rgba(251, 191, 36, 0.15) 100%)', border: `1px solid ${design.colors.warning}40`, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '16px', flexShrink: 0 }}>⚠️</span>
            <div style={{ minWidth: 0 }}>
              <p style={{ fontSize: '11px', fontWeight: 700, color: design.colors.textPrimary, margin: 0 }}>Estimated earnings for {monthName}</p>
              <p style={{ fontSize: '10px', color: design.colors.textSecondary, margin: '1px 0 0 0' }}>Tap "Edit" to confirm the exact amount.</p>
            </div>
          </div>
        )}

        {isFuture && (
          <div className="glass-card animate-in" style={{ padding: '10px 12px', marginBottom: '10px', background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.15) 0%, rgba(251, 191, 36, 0.15) 100%)', border: `1px solid ${design.colors.warning}40`, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '16px', flexShrink: 0 }}>🔮</span>
            <div style={{ minWidth: 0 }}>
              <p style={{ fontSize: '11px', fontWeight: 700, color: design.colors.textPrimary, margin: 0 }}>Future month — historical metrics not calculated</p>
            </div>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '8px', marginBottom: '10px', width: '100%' }}>
          <StatCard
            compact
            icon="💰"
            label={<>Earnings {selectedMonthEarnings.status === 'estimated' && <span style={{ color: design.colors.warning }}>⚠</span>}</>}
            value={`₹${selectedMonthEarnings.amount.toLocaleString('en-IN')}`}
            hint={
              <button onClick={() => setShowEarningsModal(true)} style={{ fontSize: '11px', padding: '2px 8px', background: design.colors.primaryLight, border: 'none', borderRadius: '8px', color: design.colors.primaryDark, fontWeight: 600, cursor: 'pointer' }}>
                Edit
              </button>
            }
          />
          <StatCard compact icon="📉" label="Spending" value={`₹${monthTotal.toLocaleString('en-IN')}`} />
          <StatCard
            compact
            icon="🔄"
            label="Net Flow"
            value={`₹${monthNetCashFlow.toLocaleString('en-IN')}`}
            valueColor={monthNetCashFlow >= 0 ? design.colors.success : design.colors.danger}
          />
        </div>

        <div style={{ marginBottom: '10px' }}>
          <StatCard
            compact
            icon="📊"
            label="Cumulative Net Cash Flow"
            value={isFuture ? '—' : `₹${financeTotals.cumulativeNetCashFlow.toLocaleString('en-IN')}`}
            valueColor={isFuture ? design.colors.textTertiary : financeTotals.cumulativeNetCashFlow > 0 ? design.colors.success : design.colors.textSecondary}
          />
        </div>

        {!isFuture && (
          <div
            className={`banner-alert animate-in ${hasDeficit ? 'banner-danger' : 'banner-success'}`}
            onClick={() => setShowDebtDetails(true)}
            style={{ padding: '12px', marginBottom: '10px', cursor: 'pointer', flexWrap: 'nowrap' }}
          >
            <div style={{ minWidth: 0, flex: 1 }}>
              <p style={{ fontSize: '10px', color: design.colors.textSecondary, margin: 0, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {hasDeficit ? '⚠ Cash-Flow Deficit' : '✓ Cash-Flow Deficit'}
              </p>
              <p style={{ fontSize: '16px', fontWeight: 700, color: design.colors.textPrimary, margin: '2px 0 0 0' }}>₹{financeTotals.cashFlowDeficit.toLocaleString('en-IN')}</p>
            </div>
            <span style={{ fontSize: '11px', color: design.colors.textSecondary, fontWeight: 600, flexShrink: 0 }}>View →</span>
          </div>
        )}

        <div className="glass-card" style={{ padding: '4px', marginBottom: '10px' }}>
          <div className="tab-container" style={{ width: '100%' }}>
            <button onClick={() => setActiveTab('expenses')} className={`tab ${activeTab === 'expenses' ? 'active' : ''}`} style={{ fontSize: '13px', padding: '9px' }}>Expenses</button>
            <button onClick={() => setActiveTab('stats')} className={`tab ${activeTab === 'stats' ? 'active' : ''}`} style={{ fontSize: '13px', padding: '9px' }}>Stats</button>
          </div>
        </div>

        {activeTab === 'expenses' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div className="glass-card" style={{ padding: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', flexWrap: 'wrap' }}>
                <h3 style={{ fontSize: '13px', fontWeight: 700, color: design.colors.textPrimary, margin: 0 }}>Quick Transaction</h3>
                <span className="badge-pill" style={{ fontSize: '9px', padding: '2px 8px' }}>Instant Ledger Update</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px', marginBottom: '14px', paddingBottom: '12px', borderBottom: `1px solid ${design.colors.primary}12` }}>
                <button onClick={goToPreviousMonth} className="btn btn-ghost" aria-label="Previous month" style={{ padding: '6px 10px', fontSize: '12px', flexShrink: 0 }}>◀</button>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <MonthYearPicker
                    year={selectedYear}
                    month={selectedMonth}
                    currentYear={currentYear}
                    currentMonth={currentMonth}
                    onSelect={goToMonth}
                    trigger={
                      <span style={{ fontSize: '13px', fontWeight: 700, color: design.colors.textPrimary, textAlign: 'center', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{monthName}</span>
                    }
                  />
                </div>
                <button onClick={goToNextMonth} className="btn btn-ghost" aria-label="Next month" style={{ padding: '6px 10px', fontSize: '12px', flexShrink: 0 }}>▶</button>
                <button onClick={goToCurrentMonth} className="btn btn-primary" style={{ padding: '6px 10px', fontSize: '11px', flexShrink: 0 }}>Today</button>
              </div>
              <ExpenseForm onAddExpense={handleAddExpense} onAddIncome={handleAddIncome} />
            </div>
            <div className="glass-card" style={{ padding: '14px', maxHeight: '600px', overflowY: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '4px', flexWrap: 'wrap', gap: '6px' }}>
                <h3 style={{ fontSize: '13px', fontWeight: 700, color: design.colors.textPrimary, margin: 0 }}>📒 Transaction History</h3>
                <span style={{ fontSize: '11px', color: design.colors.textSecondary, fontWeight: 500 }}>
                  {historyExpenses.length + historyIncome.length} items · {historyLabel}
                </span>
              </div>
              <div style={{ marginBottom: '12px', paddingBottom: '12px', borderBottom: `1px solid ${design.colors.primary}12` }}>
                <DateRangeFilter value={dateRange} onApply={setDateRange} onClear={clearDateRange} />
              </div>
              {loading ? (
                <ListSkeleton rows={4} />
              ) : (
                <ExpenseList
                  expenses={historyExpenses}
                  income={historyIncome}
                  onDelete={handleDeleteExpense}
                  onDeleteIncome={handleDeleteIncome}
                  onEdit={handleEdit}
                  emptyStateLabel={dateRange ? 'No transactions in this date range' : `No transactions yet for ${monthName}`}
                />
              )}
            </div>
          </div>
        )}

        {activeTab === 'stats' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div className="glass-card" style={{ padding: '4px' }}>
              <div className="tab-container" style={{ width: '100%' }}>
                <button onClick={() => setActiveGraph('total')} className={`tab ${activeGraph === 'total' ? 'active' : ''}`} style={{ fontSize: '13px', padding: '9px' }}>Total</button>
                <button onClick={() => setActiveGraph('monthly')} className={`tab ${activeGraph === 'monthly' ? 'active' : ''}`} style={{ fontSize: '13px', padding: '9px' }}>Monthly</button>
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
                    <CategoryPieChart data={allTimeCategoryAnalysis} height={240} legend={false} />
                  </div>
                  <CategoryLegend data={allTimeCategoryAnalysis} />
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '8px', marginTop: '12px', paddingTop: '12px', borderTop: `1px solid ${design.colors.primary}20` }}>
                    <div style={{ textAlign: 'center', padding: '8px', background: 'rgba(255,255,255,0.5)', borderRadius: '10px' }}>
                      <p style={{ fontSize: '9px', color: design.colors.textSecondary, margin: 0, fontWeight: 600, textTransform: 'uppercase' }}>Txns</p>
                      <p style={{ fontSize: '12px', fontWeight: 700, color: design.colors.textPrimary, margin: '2px 0' }}>{expenses.length}</p>
                    </div>
                    <div style={{ textAlign: 'center', padding: '8px', background: 'rgba(255,255,255,0.5)', borderRadius: '10px' }}>
                      <p style={{ fontSize: '9px', color: design.colors.textSecondary, margin: 0, fontWeight: 600, textTransform: 'uppercase' }}>Top</p>
                      <p style={{ fontSize: '12px', fontWeight: 700, color: design.colors.textPrimary, margin: '2px 0' }}>{topCategoryName}</p>
                      <p style={{ fontSize: '11px', color: design.colors.primary, margin: 0, fontWeight: 600 }}>₹{topCategoryAmount.toLocaleString('en-IN')}</p>
                    </div>
                    <div style={{ textAlign: 'center', padding: '8px', background: 'rgba(255,255,255,0.5)', borderRadius: '10px' }}>
                      <p style={{ fontSize: '9px', color: design.colors.textSecondary, margin: 0, fontWeight: 600, textTransform: 'uppercase' }}>Avg</p>
                      <p style={{ fontSize: '12px', fontWeight: 700, color: design.colors.textPrimary, margin: '2px 0' }}>₹{financeTotals.calendarMonthAverage.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
                      <p style={{ fontSize: '9px', color: design.colors.textTertiary, margin: 0 }}>{financeTotals.calendarMonthCount} mo</p>
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
                    <CategoryPieChart data={monthCategoryAnalysis} height={240} legend={false} />
                  </div>
                  <CategoryLegend data={monthCategoryAnalysis} />
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
                <button onClick={() => setShowDebtDetails(false)} aria-label="Close" style={{ background: 'rgba(0,0,0,0.05)', border: 'none', width: '28px', height: '28px', borderRadius: '50%', cursor: 'pointer', fontSize: '16px' }}>×</button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', marginBottom: '16px' }}>
                <div style={{ textAlign: 'center', padding: '10px', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '10px' }}>
                  <p style={{ fontSize: '10px', color: design.colors.textSecondary, margin: 0, fontWeight: 600, textTransform: 'uppercase' }}>Net Positive</p>
                  <p style={{ fontSize: '14px', fontWeight: 700, color: design.colors.success, margin: '4px 0 0 0' }}>₹{financeTotals.cumulativeNetCashFlow.toLocaleString('en-IN')}</p>
                </div>
                <div style={{ textAlign: 'center', padding: '10px', background: hasDeficit ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)', borderRadius: '10px' }}>
                  <p style={{ fontSize: '10px', color: design.colors.textSecondary, margin: 0, fontWeight: 600, textTransform: 'uppercase' }}>Deficit</p>
                  <p style={{ fontSize: '14px', fontWeight: 700, color: hasDeficit ? design.colors.danger : design.colors.success, margin: '4px 0 0 0' }}>₹{financeTotals.cashFlowDeficit.toLocaleString('en-IN')}</p>
                </div>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', minWidth: '400px', borderCollapse: 'collapse', fontSize: '11px' }}>
                  <thead>
                    <tr style={{ borderBottom: `2px solid ${design.colors.primary}30` }}>
                      <th style={{ padding: '8px 4px', textAlign: 'left', fontSize: '10px', textTransform: 'uppercase', color: design.colors.textSecondary }}>Month</th>
                      <th style={{ padding: '8px 4px', textAlign: 'right', fontSize: '10px', textTransform: 'uppercase', color: design.colors.textSecondary }}>Earned</th>
                      <th style={{ padding: '8px 4px', textAlign: 'right', fontSize: '10px', textTransform: 'uppercase', color: design.colors.textSecondary }}>Spent</th>
                      <th style={{ padding: '8px 4px', textAlign: 'right', fontSize: '10px', textTransform: 'uppercase', color: design.colors.textSecondary }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {financeTotals.monthlySummaries.map((summary) => {
                      const isDeficit = summary.debtAtEndOfMonth > 0;
                      return (
                        <tr key={`${summary.year}-${summary.month}`} style={{ borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                          <td style={{ padding: '8px 4px', fontWeight: 600 }}>
                            {format(new Date(summary.year, summary.month), 'MMM yy')}
                            {summary.earningsStatus === 'estimated' && <span style={{ marginLeft: '4px', fontSize: '9px', color: design.colors.warning }}>EST</span>}
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

/** 2-column dot legend matching CategoryPieChart's per-slice color assignment. */
const CategoryLegend: React.FC<{ data: { category: string; amount: number }[] }> = ({ data }) => {
  if (data.length === 0) return null;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px 12px', marginTop: '8px' }}>
      {data.map((entry, index) => (
        <div key={entry.category} style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
          <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: categoryColors[index % categoryColors.length], flexShrink: 0 }} />
          <span style={{ fontSize: '11px', color: design.colors.textSecondary, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {entry.category}
          </span>
        </div>
      ))}
    </div>
  );
};

export default DashboardMobile;
