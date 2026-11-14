import React, { Suspense, lazy, useCallback, useEffect, useState } from 'react';
import ExpenseForm from '../ExpenseForm/ExpenseForm';
import ExpenseList from '../ExpenseList/ExpenseList';
import CategoryPieChart from '../Charts/CategoryPieChart';
import EditExpenseModal from '../ExpenseList/EditExpenseModal';
import EditIncomeModal from '../ExpenseList/EditIncomeModal';
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
import { format } from 'date-fns';
import { theme as design, categoryColors } from '../../styles/theme';
import { useDashboardData } from '../../hooks/useDashboardData';
import { FINANCIAL_QUOTES, getDailyQuote } from '../../utils/quotes';
import {
  WalletIcon, TrendDownIcon, ExchangeIcon, LedgerIcon, ChartLineIcon, PieIcon,
  RupeeIcon, AlertIcon, CheckCircleIcon, CalendarIcon, CardChip, ContactlessMark,
  DeltaBadge, MoonIcon, SunIcon, UserIcon, UploadIcon, LogoutIcon, ClockIcon, DocumentIcon,
} from '../common/FinanceIcons';

// Lazy-loaded: pulls in xlsx/pdfjs/papaparse (~1MB), only fetched when the
// user actually opens the import flow instead of on every dashboard load.
const BankStatementImportPage = lazy(() => import('./BankStatementImportPageMobile'));

/**
 * Mobile layout: a sticky top bar with a hamburger that opens a left
 * slide-out menu, and one section of the desktop dashboard per page. Each
 * page reuses the same cards and data as DashboardWeb, laid out in a single
 * column, so the two views show the same things in the same style.
 *
 * The current page lives in the URL hash (#/transactions etc.), so the
 * phone's Back button and reloads behave like normal navigation.
 */
type Page =
  | 'overview' | 'add' | 'transactions' | 'analytics'
  | 'ledger' | 'earnings' | 'history' | 'import' | 'profile';

const PAGE_TITLES: Record<Page, string> = {
  overview: 'Overview',
  add: 'Add Transaction',
  transactions: 'Transactions',
  analytics: 'Expense Allocation',
  ledger: 'Monthly Ledger',
  earnings: 'Manage Earnings',
  history: 'Financial History',
  import: 'Import Statement',
  profile: 'My Profile',
};

const NAV: { section: string; items: { page: Page; label: string; icon: React.ReactNode }[] }[] = [
  {
    section: 'Dashboard',
    items: [
      { page: 'overview', label: 'Overview', icon: <WalletIcon size={18} /> },
      { page: 'add', label: 'Add Transaction', icon: <RupeeIcon size={18} /> },
      { page: 'transactions', label: 'Transactions', icon: <LedgerIcon size={18} /> },
      { page: 'analytics', label: 'Expense Allocation', icon: <PieIcon size={18} /> },
    ],
  },
  {
    section: 'Reports',
    items: [
      { page: 'ledger', label: 'Monthly Ledger', icon: <DocumentIcon size={18} /> },
      { page: 'earnings', label: 'Manage Earnings', icon: <ChartLineIcon size={18} /> },
      { page: 'history', label: 'Financial History', icon: <ClockIcon size={18} /> },
      { page: 'import', label: 'Import Statement', icon: <UploadIcon size={18} /> },
    ],
  },
  {
    section: 'Account',
    items: [{ page: 'profile', label: 'My Profile', icon: <UserIcon size={18} /> }],
  },
];

function pageFromHash(): Page {
  const key = window.location.hash.replace(/^#\/?/, '');
  return key in PAGE_TITLES ? (key as Page) : 'overview';
}

const MenuIcon: React.FC = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
    <path d="M4 7h16M4 12h16M4 17h16" />
  </svg>
);

const CloseIcon: React.FC = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
    <path d="M6 6l12 12M18 6L6 18" />
  </svg>
);

const sectionTitle: React.CSSProperties = {
  fontSize: '15px', fontWeight: 700, color: design.colors.textPrimary, margin: 0,
  display: 'flex', alignItems: 'center', gap: '8px',
};

const DashboardMobile: React.FC = () => {
  const {
    user, logout, theme, toggleTheme, loading, updateExpense,
    selectedYear, selectedMonth, currentYear, currentMonth,
    goToPreviousMonth, goToNextMonth, goToCurrentMonth, goToMonth,
    editingExpense, setEditingExpense, showEarningsModal, setShowEarningsModal,
    financeTotals, selectedMonthEarnings, expenses, monthExpenses, monthTotal, totalAllTime,
    monthCategoryAnalysis, allTimeCategoryAnalysis, monthNetCashFlow,
    dateRange, setDateRange, clearDateRange, historyExpenses, historyIncome, historyLabel,
    handleEdit, handleEditIncome, handleBulkCategory, editingIncome, setEditingIncome, updateIncome,
    handleAddExpense, handleAddIncome, handleDeleteExpense, handleDeleteIncome,
    topCategoryAmount, topCategoryName, hasDeficit, isFuture,
  } = useDashboardData();

  const [page, setPage] = useState<Page>(pageFromHash);
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeView, setActiveView] = useState<'total' | 'monthly'>('total');
  const [quote] = useState(() => getDailyQuote(FINANCIAL_QUOTES));

  useEffect(() => {
    const onHash = () => {
      setPage(pageFromHash());
      setMenuOpen(false);
      window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const navigate = useCallback((next: Page) => {
    setMenuOpen(false);
    if (next === pageFromHash()) return;
    window.location.hash = `/${next}`;
  }, []);

  const goHome = useCallback(() => navigate('overview'), [navigate]);

  // Close the menu on Escape and stop the page behind it scrolling.
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setMenuOpen(false);
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [menuOpen]);

  const monthName = format(new Date(selectedYear, selectedMonth), 'MMMM yyyy');
  const name = user?.email?.split('@')[0] || 'User';

  // Presentation-only, same as DashboardWeb: last ≤6 months for sparklines
  // and month-over-month badges.
  const summaries = financeTotals.monthlySummaries;
  const selIdx = summaries.findIndex(m => m.year === selectedYear && m.month === selectedMonth);
  const trendWindow = selIdx >= 0 ? summaries.slice(Math.max(0, selIdx - 5), selIdx + 1) : summaries.slice(-6);
  const prevSummary = selIdx > 0 ? summaries[selIdx - 1] : undefined;

  const monthBar = (
    <div className="glass-card" style={{ padding: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
      <button onClick={goToPreviousMonth} className="btn btn-ghost" aria-label="Previous month" style={{ padding: '8px 12px', fontSize: '12px', flexShrink: 0 }}>◀</button>
      <div style={{ flex: 1, minWidth: 0 }}>
        <MonthYearPicker
          year={selectedYear}
          month={selectedMonth}
          currentYear={currentYear}
          currentMonth={currentMonth}
          onSelect={goToMonth}
          trigger={
            <span style={{ fontSize: '14px', fontWeight: 700, color: design.colors.textPrimary, textAlign: 'center', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {monthName}
            </span>
          }
        />
      </div>
      <button onClick={goToNextMonth} className="btn btn-ghost" aria-label="Next month" style={{ padding: '8px 12px', fontSize: '12px', flexShrink: 0 }}>▶</button>
      <button onClick={goToCurrentMonth} className="btn btn-primary" style={{ padding: '8px 12px', fontSize: '12px', flexShrink: 0 }}>Today</button>
    </div>
  );

  const renderOverview = () => (
    <>
      <div style={{ padding: '2px 4px' }}>
        <p style={{ fontSize: '18px', fontWeight: 700, color: design.colors.textPrimary, margin: 0 }}>
          Welcome back, {name}
        </p>
        <p style={{ fontSize: '12px', fontStyle: 'italic', color: design.colors.textTertiary, margin: '4px 0 0 0' }}>
          “{quote.text}” — {quote.author}
        </p>
      </div>

      {monthBar}

      {selectedMonthEarnings.status === 'estimated' && !isFuture && (
        <Notice icon={<AlertIcon size={18} color="white" />} title={`Estimated earnings for ${monthName}`}>
          Based on your default salary. Tap “Edit” on Monthly Earnings to confirm the exact amount.
        </Notice>
      )}
      {isFuture && (
        <Notice icon={<CalendarIcon size={18} color="white" />} title="Future month — historical metrics not calculated">
          You can log expenses for {monthName}; totals update once the month begins.
        </Notice>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: '12px' }}>
        <StatCard
          accent
          icon={<WalletIcon size={17} />}
          label={
            <>
              Monthly Earnings
              {selectedMonthEarnings.status === 'estimated' && <span style={{ marginLeft: '6px', color: '#fde68a', display: 'inline-flex', alignItems: 'center', gap: '3px' }}><AlertIcon size={10} color="#fde68a" strokeWidth={2.5} /> EST</span>}
              {selectedMonthEarnings.status === 'missing' && <span style={{ marginLeft: '6px', color: 'rgba(255,255,255,0.65)' }}>(default)</span>}
            </>
          }
          value={`₹${selectedMonthEarnings.amount.toLocaleString('en-IN')}`}
          trend={trendWindow.map(m => m.earnings)}
          trendColor="rgba(255,255,255,0.9)"
          badge={prevSummary && <DeltaBadge current={selectedMonthEarnings.amount} previous={prevSummary.earnings} light />}
          hint={
            <button
              onClick={() => setShowEarningsModal(true)}
              style={{ fontSize: '12px', padding: '4px 12px', background: 'rgba(255,255,255,0.22)', border: 'none', borderRadius: '8px', color: 'white', fontWeight: 600, cursor: 'pointer' }}
            >
              ✎ Edit
            </button>
          }
        />
        <StatCard
          accent
          icon={<TrendDownIcon size={17} />}
          label="Monthly Spending"
          value={`₹${monthTotal.toLocaleString('en-IN')}`}
          trend={trendWindow.map(m => m.spent)}
          trendColor="rgba(255,255,255,0.9)"
          badge={prevSummary && <DeltaBadge current={monthTotal} previous={prevSummary.spent} goodWhenDown light />}
          hint={`${monthExpenses.length} transactions`}
        />
        <StatCard
          accent
          icon={<ExchangeIcon size={17} />}
          label="Monthly Net Cash Flow"
          value={`₹${monthNetCashFlow.toLocaleString('en-IN')}`}
          valueColor={monthNetCashFlow >= 0 ? 'white' : '#fecaca'}
          trend={trendWindow.map(m => m.monthBalance)}
          trendColor="rgba(255,255,255,0.9)"
          hint={monthNetCashFlow >= 0 ? 'All credits − Spending' : 'Overspent this month'}
        />
        <div className="glass-card" style={{
          padding: '16px 20px', minWidth: 0, overflow: 'hidden',
          background: design.colors.primaryGradient, border: 'none',
          display: 'flex', flexDirection: 'column', gap: '14px',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <CardChip width={30} />
            <ContactlessMark size={20} />
          </div>
          <div style={{ minWidth: 0 }}>
            <p style={{ fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,0.8)', textTransform: 'uppercase', letterSpacing: '0.1em', margin: 0 }}>
              Net Balance · Cumulative
            </p>
            <p style={{ fontSize: '22px', fontWeight: 700, color: 'white', margin: '6px 0 0 0', fontVariantNumeric: 'tabular-nums', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {isFuture ? '—' : `₹${financeTotals.cumulativeNetCashFlow.toLocaleString('en-IN')}`}
            </p>
            <p style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', color: 'rgba(255,255,255,0.75)', margin: '5px 0 0 0', fontWeight: 500, flexWrap: 'wrap' }}>
              {isFuture ? 'Not calculated for future' : 'Running balance since first expense'}
              {!isFuture && prevSummary && (
                <DeltaBadge current={financeTotals.cumulativeNetCashFlow} previous={prevSummary.runningBalance} light />
              )}
            </p>
          </div>
        </div>
      </div>

      {!isFuture && (
        <button
          type="button"
          className={`banner-alert ${hasDeficit ? 'banner-danger' : 'banner-success'}`}
          onClick={() => navigate('history')}
          style={{ width: '100%', padding: '14px', cursor: 'pointer', flexWrap: 'nowrap', textAlign: 'left', font: 'inherit', gap: '12px' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0, flex: 1 }}>
            <div style={{
              width: '36px', height: '36px', borderRadius: '11px', flexShrink: 0,
              background: hasDeficit ? design.colors.danger : design.colors.success,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {hasDeficit ? <AlertIcon size={18} color="white" /> : <CheckCircleIcon size={18} color="white" />}
            </div>
            <div style={{ minWidth: 0 }}>
              <p style={{ fontSize: '14px', fontWeight: 700, color: design.colors.textPrimary, margin: 0 }}>
                Cash-Flow Deficit ₹{financeTotals.cashFlowDeficit.toLocaleString('en-IN')}
              </p>
              <p style={{ fontSize: '12px', color: design.colors.textSecondary, margin: '2px 0 0 0' }}>
                {hasDeficit ? 'Cumulative spending above earnings.' : 'Cumulative spending is within earnings.'}
              </p>
            </div>
          </div>
          <span style={{ fontSize: '18px', color: design.colors.textSecondary, flexShrink: 0 }} aria-hidden="true">›</span>
        </button>
      )}

      <StatementUploadCard onOpen={() => navigate('import')} />
    </>
  );

  const renderAdd = () => (
    <>
      {monthBar}
      <div className="glass-card" style={{ padding: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px', flexWrap: 'wrap' }}>
          <h3 style={sectionTitle}><RupeeIcon size={15} color={design.colors.primary} /> Quick Transaction</h3>
          <span className="badge-pill">Instant Ledger Update</span>
        </div>
        <ExpenseForm onAddExpense={handleAddExpense} onAddIncome={handleAddIncome} />
      </div>
    </>
  );

  const renderTransactions = () => (
    <div className="glass-card" style={{ padding: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '6px', flexWrap: 'wrap', gap: '6px' }}>
        <h3 style={sectionTitle}><LedgerIcon size={15} color={design.colors.primary} /> Account Statement</h3>
        <span style={{ fontSize: '12px', color: design.colors.textSecondary, fontWeight: 500 }}>
          {historyExpenses.length + historyIncome.length} entries · {historyLabel}
        </span>
      </div>
      <div style={{ marginBottom: '12px', paddingBottom: '12px', borderBottom: `1px solid ${design.colors.primary}12` }}>
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
          onEditIncome={handleEditIncome}
          onBulkCategory={handleBulkCategory}
          onEdit={handleEdit}
          emptyStateLabel={dateRange ? 'No transactions in this date range' : `No transactions yet for ${monthName}`}
        />
      )}
    </div>
  );

  const renderAnalytics = () => (
    <>
      {activeView === 'monthly' && monthBar}
      <div className="glass-card" style={{ padding: '4px' }}>
        <div className="tab-container" style={{ width: '100%' }}>
          <button onClick={() => setActiveView('total')} className={`tab ${activeView === 'total' ? 'active' : ''}`} style={{ fontSize: '13px', padding: '9px' }}>Total Expenses</button>
          <button onClick={() => setActiveView('monthly')} className={`tab ${activeView === 'monthly' ? 'active' : ''}`} style={{ fontSize: '13px', padding: '9px' }}>Monthly Expenses</button>
        </div>
      </div>
      <div className="glass-card" style={{ padding: '16px', overflow: 'hidden' }}>
        <div style={{ textAlign: 'center', marginBottom: '4px' }}>
          <p style={{ fontSize: '11px', color: design.colors.textSecondary, margin: 0, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {activeView === 'total' ? 'All Time' : monthName}
          </p>
          <p style={{ fontSize: '22px', fontWeight: 700, color: design.colors.primary, margin: 0 }}>
            ₹{(activeView === 'total' ? totalAllTime : monthTotal).toLocaleString('en-IN')}
          </p>
        </div>
        <div style={{ height: '260px' }}>
          <CategoryPieChart data={activeView === 'total' ? allTimeCategoryAnalysis : monthCategoryAnalysis} height={260} legend={false} />
        </div>
        <CategoryLegend data={activeView === 'total' ? allTimeCategoryAnalysis : monthCategoryAnalysis} />
        {activeView === 'total' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '8px', marginTop: '16px', paddingTop: '16px', borderTop: `1px solid ${design.colors.primary}20` }}>
            <MiniStat label="Transactions" value={String(expenses.length)} />
            <MiniStat label="Top" value={topCategoryName} sub={`₹${topCategoryAmount.toLocaleString('en-IN')}`} />
            <MiniStat
              label="Monthly Avg"
              value={`₹${financeTotals.calendarMonthAverage.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`}
              sub={`over ${financeTotals.calendarMonthCount} months`}
            />
          </div>
        )}
      </div>
    </>
  );

  const renderHistory = () => (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '8px' }}>
        <MiniStat card label="Total Earned" value={`₹${financeTotals.totalEarnings.toLocaleString('en-IN')}`} />
        <MiniStat card label="Total Spent" value={`₹${financeTotals.totalSpent.toLocaleString('en-IN')}`} />
        <MiniStat
          card
          label={hasDeficit ? 'Deficit' : 'Net Positive'}
          value={`₹${(hasDeficit ? financeTotals.cashFlowDeficit : financeTotals.cumulativeNetCashFlow).toLocaleString('en-IN')}`}
          color={hasDeficit ? design.colors.danger : design.colors.success}
        />
      </div>
      <div className="glass-card" style={{ padding: '6px 14px' }}>
        {financeTotals.monthlySummaries.length === 0 && (
          <p style={{ fontSize: '13px', color: design.colors.textSecondary, textAlign: 'center', padding: '20px 0', margin: 0 }}>No history yet.</p>
        )}
        {[...financeTotals.monthlySummaries].reverse().map((s, i, arr) => {
          const isDeficit = s.debtAtEndOfMonth > 0;
          return (
            <div key={`${s.year}-${s.month}`} style={{
              display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', gap: '4px 12px', alignItems: 'center',
              padding: '12px 0', borderBottom: i < arr.length - 1 ? `1px solid ${design.colors.primary}12` : 'none',
            }}>
              <p style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: design.colors.textPrimary }}>
                {format(new Date(s.year, s.month), 'MMM yyyy')}
                {s.earningsStatus === 'estimated' && <span style={{ marginLeft: '6px', fontSize: '10px', color: design.colors.warning, fontWeight: 700 }}>EST</span>}
              </p>
              <p style={{ margin: 0, fontSize: '14px', fontWeight: 700, textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: isDeficit ? design.colors.danger : design.colors.success }}>
                {isDeficit ? `−₹${s.debtAtEndOfMonth.toLocaleString('en-IN')}` : `+₹${s.savingsAtEndOfMonth.toLocaleString('en-IN')}`}
              </p>
              <p style={{ margin: 0, fontSize: '12px', color: design.colors.textSecondary, fontVariantNumeric: 'tabular-nums' }}>
                Earned ₹{s.earnings.toLocaleString('en-IN')} · Spent ₹{s.spent.toLocaleString('en-IN')}
              </p>
              <p style={{ margin: 0, fontSize: '11px', color: design.colors.textTertiary, textAlign: 'right' }}>
                {isDeficit ? 'Deficit' : 'Savings'}
              </p>
            </div>
          );
        })}
      </div>
    </>
  );

  let body: React.ReactNode;
  // Full sub-pages carry their own layout and padding; dashboard sections
  // share the .m-content column.
  switch (page) {
    case 'ledger': body = <TransactionLedgerPage onBack={goHome} />; break;
    case 'earnings': body = <EarningsHistoryPage onBack={goHome} />; break;
    case 'profile': body = <ProfilePage onBack={goHome} />; break;
    case 'import':
      body = (
        <Suspense fallback={<div style={{ padding: '12px' }}><ListSkeleton rows={4} /></div>}>
          <BankStatementImportPage onBack={goHome} />
        </Suspense>
      );
      break;
    case 'add': body = <div className="m-content">{renderAdd()}</div>; break;
    case 'transactions': body = <div className="m-content">{renderTransactions()}</div>; break;
    case 'analytics': body = <div className="m-content">{renderAnalytics()}</div>; break;
    case 'history': body = <div className="m-content">{renderHistory()}</div>; break;
    default: body = <div className="m-content">{renderOverview()}</div>;
  }

  return (
    <div className="glass-page" style={{ padding: 0, minHeight: '100vh', overflowX: 'clip' }}>
      <header className="m-topbar">
        <button className="m-icon-btn" onClick={() => setMenuOpen(true)} aria-label="Open menu" aria-expanded={menuOpen} aria-controls="m-drawer">
          <MenuIcon />
        </button>
        <h1 className="m-topbar-title">{PAGE_TITLES[page]}</h1>
        <button className="m-icon-btn" onClick={toggleTheme} aria-label="Toggle theme">
          {theme === 'light' ? <MoonIcon size={18} color={design.colors.textPrimary} /> : <SunIcon size={18} color={design.colors.textPrimary} />}
        </button>
      </header>

      <main>{body}</main>

      <div className={`m-scrim ${menuOpen ? 'open' : ''}`} onClick={() => setMenuOpen(false)} aria-hidden="true" />
      <nav id="m-drawer" className={`m-drawer ${menuOpen ? 'open' : ''}`} aria-label="Main menu" aria-hidden={!menuOpen} inert={!menuOpen}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '16px 12px 12px 16px' }}>
          <div className="icon-box" style={{ width: '36px', height: '36px', flexShrink: 0 }}>
            <LogoMark size={20} color="white" />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: '17px', fontWeight: 800, margin: 0, color: design.colors.textPrimary, letterSpacing: '0.01em' }}>PRATIQ</p>
            <p style={{ fontSize: '11px', margin: 0, color: design.colors.textSecondary }}>Pro Expense Tracker</p>
          </div>
          <button className="m-icon-btn" onClick={() => setMenuOpen(false)} aria-label="Close menu">
            <CloseIcon />
          </button>
        </div>

        <button
          type="button"
          onClick={() => navigate('profile')}
          style={{
            display: 'flex', alignItems: 'center', gap: '10px', margin: '0 12px 4px', padding: '10px 12px',
            borderRadius: '12px', border: '1px solid var(--glass-border)', background: 'var(--glass-bg)',
            cursor: 'pointer', textAlign: 'left', font: 'inherit',
          }}
        >
          {user?.photoURL ? (
            <img src={user.photoURL} alt="" style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
          ) : (
            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: design.colors.primaryGradient, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <UserIcon size={16} color="white" />
            </div>
          )}
          <div style={{ minWidth: 0 }}>
            <p style={{ fontSize: '13px', fontWeight: 700, margin: 0, color: design.colors.textPrimary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</p>
            <p style={{ fontSize: '11px', margin: 0, color: design.colors.textSecondary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.email}</p>
          </div>
        </button>

        <div className="m-nav">
          {NAV.map(group => (
            <div key={group.section}>
              <p className="m-nav-section">{group.section}</p>
              {group.items.map(item => (
                <button
                  key={item.page}
                  type="button"
                  className={`m-nav-item ${page === item.page ? 'active' : ''}`}
                  aria-current={page === item.page ? 'page' : undefined}
                  onClick={() => navigate(item.page)}
                >
                  <span className="m-nav-icon">{item.icon}</span>
                  {item.label}
                </button>
              ))}
            </div>
          ))}
        </div>

        <div style={{ padding: '8px', borderTop: '1px solid var(--glass-border)' }}>
          <button type="button" className="m-nav-item" onClick={logout} style={{ color: design.colors.danger }}>
            <span className="m-nav-icon"><LogoutIcon size={18} /></span>
            Logout
          </button>
        </div>
      </nav>

      <EarningsModal isOpen={showEarningsModal} onClose={() => setShowEarningsModal(false)} year={selectedYear} month={selectedMonth} />
      <EditExpenseModal expense={editingExpense} isOpen={!!editingExpense} onClose={() => setEditingExpense(null)} onUpdate={updateExpense} />
      <EditIncomeModal income={editingIncome} onClose={() => setEditingIncome(null)} onUpdate={updateIncome} />
    </div>
  );
};

const Notice: React.FC<{ icon: React.ReactNode; title: string; children: React.ReactNode }> = ({ icon, title, children }) => (
  <div className="glass-card" style={{
    display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 14px',
    background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.12) 0%, rgba(251, 191, 36, 0.12) 100%)',
    border: `1px solid ${design.colors.warning}40`,
  }}>
    <div style={{ width: '36px', height: '36px', borderRadius: '11px', background: design.colors.warning, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      {icon}
    </div>
    <div style={{ minWidth: 0 }}>
      <p style={{ fontSize: '13px', fontWeight: 700, color: design.colors.textPrimary, margin: 0 }}>{title}</p>
      <p style={{ fontSize: '12px', color: design.colors.textSecondary, margin: '2px 0 0 0' }}>{children}</p>
    </div>
  </div>
);

const MiniStat: React.FC<{ label: string; value: string; sub?: string; color?: string; card?: boolean }> = ({ label, value, sub, color, card }) => (
  <div className={card ? 'glass-card' : undefined} style={{ textAlign: 'center', minWidth: 0, padding: card ? '12px 6px' : 0 }}>
    <p style={{ fontSize: '10px', color: design.colors.textSecondary, margin: 0, textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.05em' }}>{label}</p>
    <p style={{ fontSize: '14px', fontWeight: 700, color: color || design.colors.textPrimary, margin: '4px 0 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>{value}</p>
    {sub && <p style={{ fontSize: '10px', color: design.colors.textTertiary, margin: '2px 0 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sub}</p>}
  </div>
);

// See DashboardWeb's CategoryLegend for why this is capped.
const MAX_LEGEND_ENTRIES = 8;

/** 2-column dot legend matching CategoryPieChart's per-slice color assignment. */
const CategoryLegend: React.FC<{ data: { category: string; amount: number }[] }> = ({ data }) => {
  if (data.length === 0) return null;
  const visible = data.slice(0, MAX_LEGEND_ENTRIES);
  const hiddenCount = data.length - visible.length;
  return (
    <div style={{ marginTop: '8px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '6px 12px' }}>
        {visible.map((entry, index) => (
          <div key={entry.category} style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: categoryColors[index % categoryColors.length], flexShrink: 0 }} />
            <span style={{ fontSize: '12px', color: design.colors.textSecondary, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {entry.category}
            </span>
          </div>
        ))}
      </div>
      {hiddenCount > 0 && (
        <p style={{ fontSize: '11px', color: design.colors.textTertiary, margin: '6px 0 0 0' }}>
          +{hiddenCount} more {hiddenCount === 1 ? 'category' : 'categories'}
        </p>
      )}
    </div>
  );
};

export default DashboardMobile;
