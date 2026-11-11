import React, { Suspense, lazy, useState } from 'react';
import ExpenseForm from '../ExpenseForm/ExpenseForm';
import ExpenseList from '../ExpenseList/ExpenseList';
import CategoryPieChart from '../Charts/CategoryPieChart';
import EditExpenseModal from '../ExpenseList/EditExpenseModal';
import EarningsModal from './EarningsModal';
import EarningsHistoryPage from './EarningsHistoryPageWeb';
import TransactionLedgerPage from './TransactionLedgerPageWeb';
import ProfilePage from './ProfilePageWeb';
import StatCard from './StatCard';
import StatementUploadCard from './StatementUploadCard';
import MonthYearPicker from '../common/MonthYearPicker';
import DateRangeFilter from './DateRangeFilter';
import ProfileMenu from './ProfileMenu';
import LogoMark from '../common/LogoMark';
import ListSkeleton from '../common/ListSkeleton';

// Lazy-loaded: pulls in xlsx/pdfjs/papaparse (~1MB), only fetched when the
// user actually opens the import flow instead of on every dashboard load.
const BankStatementImportPage = lazy(() => import('./BankStatementImportPageWeb'));
import { format } from 'date-fns';
import { theme as design, categoryColors } from '../../styles/theme';
import { useDashboardData } from '../../hooks/useDashboardData';

type GraphType = 'total' | 'monthly';

const DashboardWeb: React.FC = () => {
  const {
    user, logout, theme, toggleTheme, loading, updateExpense,
    selectedYear, selectedMonth, currentYear, currentMonth,
    goToPreviousMonth, goToNextMonth, goToCurrentMonth, goToMonth,
    editingExpense, setEditingExpense, showEarningsModal, setShowEarningsModal,
    showEarningsPage, setShowEarningsPage, showLedgerPage, setShowLedgerPage,
    showProfilePage, setShowProfilePage, showImportPage, setShowImportPage,
    showDebtDetails, setShowDebtDetails,
    financeTotals, selectedMonthEarnings, expenses, monthExpenses, monthTotal, totalAllTime,
    monthCategoryAnalysis, allTimeCategoryAnalysis, monthNetCashFlow,
    dateRange, setDateRange, clearDateRange, historyExpenses, historyIncome, historyLabel,
    handleEdit, handleAddExpense, handleAddIncome, handleDeleteExpense, handleDeleteIncome,
    topCategoryAmount, topCategoryName, hasDeficit, isFuture,
  } = useDashboardData();

  const [activeView, setActiveView] = useState<GraphType>('total');

  const monthName = format(new Date(selectedYear, selectedMonth), 'MMMM yyyy');

  if (showEarningsPage) {
    return <EarningsHistoryPage onBack={() => setShowEarningsPage(false)} />;
  }
  if (showLedgerPage) {
    return <TransactionLedgerPage onBack={() => setShowLedgerPage(false)} />;
  }
  if (showProfilePage) {
    return <ProfilePage onBack={() => setShowProfilePage(false)} />;
  }
  if (showImportPage) {
    return (
      <Suspense fallback={<div style={{ minHeight: '100vh' }} />}>
        <BankStatementImportPage onBack={() => setShowImportPage(false)} />
      </Suspense>
    );
  }

  return (
    <div className="glass-page">
      <div style={{ maxWidth: '1600px', margin: '0 auto' }}>

        {/* Header */}
        <div className="glass-card animate-in" style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 28px', marginBottom: '20px', flexWrap: 'wrap', gap: '12px',
          overflow: 'visible', position: 'relative', zIndex: 20,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div className="icon-box" style={{ width: '46px', height: '46px' }}>
              <LogoMark size={26} color="white" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <h1 style={{ fontSize: '20px', fontWeight: 800, margin: 0, letterSpacing: '0.01em', color: design.colors.textPrimary }}>
                  PRATIQ
                </h1>
                <span className="badge-pill">Pro Expense Tracker</span>
              </div>
              <p style={{ fontSize: '13px', color: design.colors.textSecondary, margin: '4px 0 0 0' }}>
                Welcome back, {user?.email?.split('@')[0]}
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button onClick={() => setShowLedgerPage(true)} className="btn btn-ghost" style={{ padding: '10px 18px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              📄 Statement
            </button>
            <button onClick={() => setShowEarningsPage(true)} className="btn btn-ghost" style={{ padding: '10px 18px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px', color: design.colors.success }}>
              💹 Manage Earnings
            </button>
            <ProfileMenu
              name={user?.email?.split('@')[0] || 'User'}
              email={user?.email}
              photoURL={user?.photoURL}
              theme={theme}
              onToggleTheme={toggleTheme}
              onViewProfile={() => setShowProfilePage(true)}
              onLogout={logout}
            />
          </div>
        </div>

        {/* Bank Statement Import */}
        <div style={{ marginBottom: '20px' }}>
          <StatementUploadCard onOpen={() => setShowImportPage(true)} />
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
                This month's earnings are estimated based on your default salary. Click "Edit Earnings" to confirm the exact amount.
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

        {/* 4 KPI Cards */}
        <div className="kpi-grid" style={{ marginBottom: '20px' }}>
          <div className="animate-in animate-in-delay-1">
            <StatCard
              icon="💰"
              label={
                <>
                  Monthly Earnings
                  {selectedMonthEarnings.status === 'estimated' && <span style={{ marginLeft: '6px', color: design.colors.warning }}>⚠ EST</span>}
                  {selectedMonthEarnings.status === 'missing' && <span style={{ marginLeft: '6px', color: design.colors.textTertiary }}>(default)</span>}
                </>
              }
              value={`₹${selectedMonthEarnings.amount.toLocaleString('en-IN')}`}
              hint={
                <button
                  onClick={() => setShowEarningsModal(true)}
                  style={{ fontSize: '11px', padding: '3px 10px', background: `${design.colors.primary}15`, border: 'none', borderRadius: '8px', color: design.colors.primaryDark, fontWeight: 600, cursor: 'pointer' }}
                >
                  ✎ Edit
                </button>
              }
            />
          </div>

          <div className="animate-in animate-in-delay-1">
            <StatCard
              icon="📉"
              label="Monthly Spending"
              value={`₹${monthTotal.toLocaleString('en-IN')}`}
              hint={`${monthExpenses.length} transactions`}
            />
          </div>

          <div className="animate-in animate-in-delay-2">
            <StatCard
              icon="🔄"
              label="Monthly Net Cash Flow"
              value={`₹${monthNetCashFlow.toLocaleString('en-IN')}`}
              valueColor={monthNetCashFlow >= 0 ? design.colors.success : design.colors.danger}
              hint={monthNetCashFlow >= 0 ? 'All credits − Spending' : 'Overspent this month'}
            />
          </div>

          <div className="animate-in animate-in-delay-2">
            <StatCard
              icon="📊"
              label="Cumulative Net Cash Flow"
              value={isFuture ? '—' : `₹${financeTotals.cumulativeNetCashFlow.toLocaleString('en-IN')}`}
              valueColor={isFuture ? design.colors.textTertiary : financeTotals.cumulativeNetCashFlow > 0 ? design.colors.success : design.colors.textSecondary}
              hint={isFuture ? 'Not calculated for future' : 'Running balance since first expense'}
            />
          </div>
        </div>

        {/* Cash-Flow Deficit Banner */}
        {!isFuture && (
          <div className={`banner-alert animate-in ${hasDeficit ? 'banner-danger' : 'banner-success'}`} style={{ marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '40px', height: '40px', borderRadius: '12px',
                background: hasDeficit ? design.colors.danger : design.colors.success,
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', color: 'white', flexShrink: 0,
              }}>
                {hasDeficit ? '⚠' : '✓'}
              </div>
              <div>
                <p style={{ fontSize: '14px', fontWeight: 700, color: design.colors.textPrimary, margin: 0 }}>
                  Cash-Flow Deficit ₹{financeTotals.cashFlowDeficit.toLocaleString('en-IN')}
                </p>
                <p style={{ fontSize: '12px', color: design.colors.textSecondary, margin: '2px 0 0 0' }}>
                  {hasDeficit
                    ? 'This cumulative spending above earnings — not tracked actual debt.'
                    : 'No deficit — cumulative spending is within earnings.'}
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
                <button onClick={() => setShowDebtDetails(false)} aria-label="Close" style={{ background: 'rgba(0,0,0,0.05)', border: 'none', width: '32px', height: '32px', borderRadius: '50%', cursor: 'pointer', fontSize: '18px', color: design.colors.textSecondary }}>×</button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '20px', padding: '16px', background: 'rgba(99, 102, 241, 0.05)', borderRadius: '12px' }}>
                <div style={{ textAlign: 'center' }}>
                  <p style={{ fontSize: '11px', color: design.colors.textSecondary, margin: 0, textTransform: 'uppercase', fontWeight: 600 }}>Total Earned</p>
                  <p style={{ fontSize: '16px', fontWeight: 700, color: design.colors.textPrimary, margin: '4px 0 0 0' }}>₹{financeTotals.totalEarnings.toLocaleString('en-IN')}</p>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <p style={{ fontSize: '11px', color: design.colors.textSecondary, margin: 0, textTransform: 'uppercase', fontWeight: 600 }}>Total Spent</p>
                  <p style={{ fontSize: '16px', fontWeight: 700, color: design.colors.textPrimary, margin: '4px 0 0 0' }}>₹{financeTotals.totalSpent.toLocaleString('en-IN')}</p>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <p style={{ fontSize: '11px', color: design.colors.textSecondary, margin: 0, textTransform: 'uppercase', fontWeight: 600 }}>{hasDeficit ? 'Deficit' : 'Net Positive'}</p>
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
                            {summary.earningsStatus === 'estimated' && <span style={{ marginLeft: '6px', fontSize: '10px', color: design.colors.warning }}>EST</span>}
                            {summary.earningsStatus === 'missing' && <span style={{ marginLeft: '6px', fontSize: '10px', color: design.colors.textTertiary }}>(default)</span>}
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
        <div className="main-grid" style={{ marginBottom: '20px' }}>
          <div className="glass-card main-grid-card animate-in animate-in-delay-2" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 700, color: design.colors.textPrimary, margin: 0 }}>Quick Transaction</h3>
                <span className="badge-pill">Instant Ledger Update</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <button onClick={goToPreviousMonth} className="btn btn-ghost btn-icon" aria-label="Previous month" style={{ padding: '6px 10px', fontSize: '12px' }}>◀</button>
                <MonthYearPicker
                  year={selectedYear}
                  month={selectedMonth}
                  currentYear={currentYear}
                  currentMonth={currentMonth}
                  onSelect={goToMonth}
                  trigger={
                    <span style={{ fontSize: '13px', fontWeight: 700, color: design.colors.textPrimary, minWidth: '96px', textAlign: 'center', display: 'inline-block' }}>
                      {monthName}
                    </span>
                  }
                />
                <button onClick={goToNextMonth} className="btn btn-ghost btn-icon" aria-label="Next month" style={{ padding: '6px 10px', fontSize: '12px' }}>▶</button>
                <button onClick={goToCurrentMonth} className="btn btn-primary" style={{ padding: '6px 12px', fontSize: '11px' }}>
                  Today
                </button>
              </div>
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <ExpenseForm onAddExpense={handleAddExpense} onAddIncome={handleAddIncome} />
            </div>
          </div>

          <div className="glass-card main-grid-card animate-in animate-in-delay-3" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: design.colors.textPrimary, margin: 0 }}>Expense Allocation</h3>
              <div className="tab-container" style={{ padding: '3px' }}>
                <button onClick={() => setActiveView('total')} className={`tab ${activeView === 'total' ? 'active' : ''}`} style={{ padding: '6px 12px', fontSize: '12px' }}>Total Expenses</button>
                <button onClick={() => setActiveView('monthly')} className={`tab ${activeView === 'monthly' ? 'active' : ''}`} style={{ padding: '6px 12px', fontSize: '12px' }}>Monthly Expenses</button>
              </div>
            </div>

            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              {activeView === 'total' ? (
                <>
                  <div style={{ textAlign: 'center', marginBottom: '4px' }}>
                    <p style={{ fontSize: '11px', color: design.colors.textSecondary, margin: 0, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>All Time</p>
                    <p style={{ fontSize: '22px', fontWeight: 700, color: design.colors.primary, margin: 0 }}>₹{totalAllTime.toLocaleString('en-IN')}</p>
                  </div>
                  <div style={{ height: '260px' }}>
                    <CategoryPieChart data={allTimeCategoryAnalysis} height={260} legend={false} />
                  </div>
                  <CategoryLegend data={allTimeCategoryAnalysis} />
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
                  <div style={{ textAlign: 'center', marginBottom: '4px' }}>
                    <p style={{ fontSize: '11px', color: design.colors.textSecondary, margin: 0, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{monthName}</p>
                    <p style={{ fontSize: '22px', fontWeight: 700, color: design.colors.primary, margin: 0 }}>₹{monthTotal.toLocaleString('en-IN')}</p>
                  </div>
                  <div style={{ height: '300px' }}>
                    <CategoryPieChart data={monthCategoryAnalysis} height={300} legend={false} />
                  </div>
                  <CategoryLegend data={monthCategoryAnalysis} />
                </>
              )}
            </div>
          </div>
        </div>

        {/* Transaction History */}
        <div className="glass-card animate-in animate-in-delay-3" style={{ padding: '20px 24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '4px', flexWrap: 'wrap', gap: '8px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: design.colors.textPrimary, margin: 0 }}>📒 Transaction History</h3>
            <span style={{ fontSize: '12px', color: design.colors.textSecondary, fontWeight: 500 }}>
              {historyExpenses.length + historyIncome.length} items · {historyLabel}
            </span>
          </div>
          <div style={{ marginBottom: '14px', paddingBottom: '14px', borderBottom: `1px solid ${design.colors.primary}12` }}>
            <DateRangeFilter value={dateRange} onApply={setDateRange} onClear={clearDateRange} />
          </div>
          {loading ? (
            <ListSkeleton rows={6} />
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

      <EarningsModal isOpen={showEarningsModal} onClose={() => setShowEarningsModal(false)} year={selectedYear} month={selectedMonth} />
      <EditExpenseModal expense={editingExpense} isOpen={!!editingExpense} onClose={() => setEditingExpense(null)} onUpdate={updateExpense} />
    </div>
  );
};

/** 2-column dot legend matching CategoryPieChart's per-slice color assignment. */
const CategoryLegend: React.FC<{ data: { category: string; amount: number }[] }> = ({ data }) => {
  if (data.length === 0) return null;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px 16px', marginTop: '12px' }}>
      {data.map((entry, index) => (
        <div key={entry.category} style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: categoryColors[index % categoryColors.length], flexShrink: 0 }} />
          <span style={{ fontSize: '12px', color: design.colors.textSecondary, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {entry.category}
          </span>
        </div>
      ))}
    </div>
  );
};

export default DashboardWeb;
