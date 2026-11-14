import React, { Suspense, lazy, useCallback, useEffect, useState } from 'react';
import ExpenseForm from '../ExpenseForm/ExpenseForm';
import ExpenseList from '../ExpenseList/ExpenseList';
import CategoryPieChart from '../Charts/CategoryPieChart';
import TrendCharts from '../Charts/TrendCharts';
import EditExpenseModal from '../ExpenseList/EditExpenseModal';
import EditIncomeModal from '../ExpenseList/EditIncomeModal';
import EarningsModal from './EarningsModal';
import EarningsHistoryPage from './EarningsHistoryPageMobile';
import TransactionLedgerPage from './TransactionLedgerPageMobile';
import ProfilePage from './ProfilePageMobile';
import MonthYearPicker from '../common/MonthYearPicker';
import DateRangeFilter from './DateRangeFilter';
import LogoMark from '../common/LogoMark';
import ListSkeleton from '../common/ListSkeleton';
import { format } from 'date-fns';
import { theme as design, categoryColors } from '../../styles/theme';
import { useDashboardData } from '../../hooks/useDashboardData';
import {
  WalletIcon, TrendDownIcon, ExchangeIcon, LedgerIcon, ChartLineIcon, PieIcon,
  RupeeIcon, AlertIcon, CheckCircleIcon, CalendarIcon, CardChip, ContactlessMark,
  DeltaBadge, MoonIcon, SunIcon, UserIcon, UploadIcon, LogoutIcon, ClockIcon, DocumentIcon,
} from '../common/FinanceIcons';

// Lazy-loaded: pulls in xlsx/pdfjs/papaparse (~1MB), only fetched when the
// user actually opens the import flow instead of on every dashboard load.
const BankStatementImportPage = lazy(() => import('./BankStatementImportPageMobile'));

/**
 * Mobile layout, styled like a banking app: a sticky top bar, a bottom tab
 * bar with a raised "add" button, and a left slide-out menu holding every
 * page. Home leads with a balance card, quick actions, this month's figures,
 * top spending and recent transactions. All numbers come from the same
 * useDashboardData hook as DashboardWeb, so the two views always agree.
 *
 * The current page lives in the URL hash (#/transactions etc.), so the
 * phone's Back button and reloads behave like normal navigation.
 */
type Page =
  | 'overview' | 'add' | 'transactions' | 'analytics'
  | 'ledger' | 'earnings' | 'history' | 'import' | 'profile';

const PAGE_TITLES: Record<Page, string> = {
  overview: 'Home',
  add: 'Add Transaction',
  transactions: 'Transactions',
  analytics: 'Analytics',
  ledger: 'Monthly Ledger',
  earnings: 'Manage Earnings',
  history: 'Financial History',
  import: 'Import Statement',
  profile: 'My Profile',
};

const Svg: React.FC<{ size?: number; children: React.ReactNode }> = ({ size = 22, children }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {children}
  </svg>
);
const MenuIcon: React.FC<{ size?: number }> = ({ size }) => <Svg size={size}><path d="M4 7h16M4 12h10M4 17h16" /></Svg>;
const CloseIcon: React.FC<{ size?: number }> = ({ size = 20 }) => <Svg size={size}><path d="M6 6l12 12M18 6L6 18" /></Svg>;
const HomeIcon: React.FC<{ size?: number }> = ({ size }) => <Svg size={size}><path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" /></Svg>;
const PlusIcon: React.FC<{ size?: number }> = ({ size }) => <Svg size={size}><path d="M12 5v14M5 12h14" /></Svg>;
const ArrowIcon: React.FC<{ up?: boolean }> = ({ up }) => (
  <Svg size={16}>{up ? <path d="M12 19V5M6 11l6-6 6 6" /> : <path d="M12 5v14M6 13l6 6 6-6" />}</Svg>
);

const NAV: { section: string; items: { page: Page; label: string; icon: React.ReactNode }[] }[] = [
  {
    section: 'Account',
    items: [{ page: 'profile', label: 'My Profile', icon: <UserIcon size={18} /> }],
  },
  {
    section: 'Dashboard',
    items: [
      { page: 'overview', label: 'Home', icon: <HomeIcon size={18} /> },
      { page: 'add', label: 'Add Transaction', icon: <RupeeIcon size={18} /> },
      { page: 'transactions', label: 'Transactions', icon: <LedgerIcon size={18} /> },
      { page: 'analytics', label: 'Analytics & Trends', icon: <ChartLineIcon size={18} /> },
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
];

function pageFromHash(): Page {
  const key = window.location.hash.replace(/^#\/?/, '');
  return key in PAGE_TITLES ? (key as Page) : 'overview';
}

const inr = (n: number, opts?: Intl.NumberFormatOptions) => `₹${n.toLocaleString('en-IN', opts)}`;

function greeting(): string {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}

/** Dark-tinted version of the brand gradient, so it follows the color theme. */
const HERO_BG = `linear-gradient(135deg, rgba(4, 10, 30, 0.55) 0%, rgba(4, 10, 30, 0.12) 100%), ${design.colors.primaryGradient}`;

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
    financeTotals, selectedMonthEarnings, expenses, monthExpenses, monthIncome, monthTotal, totalAllTime,
    monthCategoryAnalysis, allTimeCategoryAnalysis, monthNetCashFlow,
    dateRange, setDateRange, clearDateRange, historyExpenses, historyIncome, historyLabel,
    handleEdit, handleEditIncome, handleBulkCategory, editingIncome, setEditingIncome, updateIncome,
    handleAddExpense, handleAddIncome, handleDeleteExpense, handleDeleteIncome,
    topCategoryAmount, topCategoryName, hasDeficit, isFuture,
  } = useDashboardData();

  const [page, setPage] = useState<Page>(pageFromHash);
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeView, setActiveView] = useState<'total' | 'monthly'>('total');

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

  // Presentation-only: previous month, for the balance card's change badge.
  const summaries = financeTotals.monthlySummaries;
  const selIdx = summaries.findIndex(m => m.year === selectedYear && m.month === selectedMonth);
  const prevSummary = selIdx > 0 ? summaries[selIdx - 1] : undefined;

  const isCurrentMonth = selectedYear === currentYear && selectedMonth === currentMonth;

  const monthBar = (
    <div className="m-month">
      <button onClick={goToPreviousMonth} className="step" aria-label="Previous month">◀</button>
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
      <button onClick={goToNextMonth} className="step" aria-label="Next month">▶</button>
      {!isCurrentMonth && <button onClick={goToCurrentMonth} className="today">Today</button>}
    </div>
  );

  // Presentation-only: this month's debits and credits merged, newest first.
  const recent = [
    ...monthExpenses.map(e => ({ id: e.id, title: e.description || e.category, category: e.category, date: e.date, amount: e.amount, credit: false })),
    ...monthIncome.map(i => ({ id: i.id, title: i.description || i.category, category: i.category as string, date: i.date, amount: i.amount, credit: true })),
  ].sort((x, y) => new Date(y.date).getTime() - new Date(x.date).getTime()).slice(0, 5);

  const earned = selectedMonthEarnings.amount;
  const spentPct = earned > 0 ? Math.round((monthTotal / earned) * 100) : monthTotal > 0 ? 100 : 0;
  const meterColor = spentPct > 100 ? design.colors.danger : spentPct > 80 ? design.colors.warning : design.colors.success;
  const topCats = monthCategoryAnalysis.slice(0, 4);
  const topCatMax = topCats[0]?.amount || 1;

  const renderOverview = () => (
    <>
      <div className="m-hero" style={{ background: HERO_BG }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <p className="m-hero-label">Net Balance · Cumulative</p>
          <ContactlessMark size={20} />
        </div>
        <p className="m-hero-amount">{isFuture ? '—' : inr(financeTotals.cumulativeNetCashFlow)}</p>
        <p style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', margin: '8px 0 0', fontSize: '12px', color: 'rgba(255,255,255,0.75)', fontWeight: 500 }}>
          {isFuture ? 'Not calculated for a future month' : 'Running balance since first expense'}
          {!isFuture && prevSummary && (
            <DeltaBadge current={financeTotals.cumulativeNetCashFlow} previous={prevSummary.runningBalance} light />
          )}
        </p>
        <div className="m-hero-split">
          <div>
            <span className="ico"><ArrowIcon /></span>
            <span style={{ minWidth: 0 }}>
              <small>Earnings</small>
              <strong>{inr(earned)}</strong>
            </span>
          </div>
          <div>
            <span className="ico"><ArrowIcon up /></span>
            <span style={{ minWidth: 0 }}>
              <small>Spending</small>
              <strong>{inr(monthTotal)}</strong>
            </span>
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px' }}>
          <CardChip width={30} />
          <span style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '0.18em', color: 'rgba(255,255,255,0.8)' }}>PRATIQ</span>
        </div>
      </div>

      {monthBar}

      <div className="m-actions">
        <button type="button" className="m-action" onClick={() => navigate('add')}>
          <span className="ico"><PlusIcon /></span><span>Add</span>
        </button>
        <button type="button" className="m-action" onClick={() => navigate('import')}>
          <span className="ico"><UploadIcon size={22} /></span><span>Import</span>
        </button>
        <button type="button" className="m-action" onClick={() => navigate('earnings')}>
          <span className="ico"><ChartLineIcon size={22} /></span><span>Earnings</span>
        </button>
        <button type="button" className="m-action" onClick={() => navigate('ledger')}>
          <span className="ico"><DocumentIcon size={22} /></span><span>Ledger</span>
        </button>
      </div>

      {selectedMonthEarnings.status === 'estimated' && !isFuture && (
        <Notice icon={<AlertIcon size={18} color="white" />} title={`Estimated earnings for ${monthName}`}>
          Based on your default salary. Tap “Edit” on Earnings to confirm the exact amount.
        </Notice>
      )}
      {isFuture && (
        <Notice icon={<CalendarIcon size={18} color="white" />} title="Future month — historical metrics not calculated">
          You can log expenses for {monthName}; totals update once the month begins.
        </Notice>
      )}

      <div className="m-section-head"><h2>{monthName}</h2></div>
      <div className="m-tiles">
        <div className="m-card">
          <p className="m-tile-label">
            <span className="dot" style={{ background: `rgba(${design.colors.successRgb}, 0.14)`, color: design.colors.success }}><WalletIcon size={15} /></span>
            Earnings
          </p>
          <p className="m-tile-value">{inr(earned)}</p>
          <div className="m-tile-foot">
            <button type="button" className="m-chip-btn" onClick={() => setShowEarningsModal(true)}>✎ Edit</button>
            {selectedMonthEarnings.status === 'estimated' && <span style={{ color: design.colors.warning, fontWeight: 700 }}>EST</span>}
            {selectedMonthEarnings.status === 'missing' && <span>default</span>}
          </div>
        </div>
        <div className="m-card">
          <p className="m-tile-label">
            <span className="dot" style={{ background: 'rgba(239, 68, 68, 0.12)', color: design.colors.danger }}><TrendDownIcon size={15} /></span>
            Spending
          </p>
          <p className="m-tile-value">{inr(monthTotal)}</p>
          <div className="m-tile-foot">
            <span>{monthExpenses.length} transactions</span>
          </div>
        </div>
      </div>

      <div className="m-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
          <div style={{ minWidth: 0 }}>
            <p className="m-tile-label">
              <span className="dot" style={{ background: `rgba(${design.colors.primaryRgb}, 0.12)`, color: design.colors.primary }}><ExchangeIcon size={15} /></span>
              Net Cash Flow
            </p>
            <p className="m-tile-value" style={{ color: monthNetCashFlow >= 0 ? design.colors.success : design.colors.danger }}>
              {monthNetCashFlow < 0 ? '−' : ''}{inr(Math.abs(monthNetCashFlow))}
            </p>
          </div>
          <span style={{ fontSize: '12px', fontWeight: 700, color: meterColor, flexShrink: 0, paddingTop: '6px' }}>{spentPct}% spent</span>
        </div>
        <div className="m-meter" style={{ marginTop: '12px' }} role="img" aria-label={`${spentPct}% of earnings spent`}>
          <i style={{ width: `${Math.min(100, spentPct)}%`, background: meterColor }} />
        </div>
        <p style={{ margin: '8px 0 0', fontSize: '11px', color: design.colors.textSecondary }}>
          {monthNetCashFlow >= 0 ? 'All credits − spending' : 'Overspent this month'}
        </p>
      </div>

      {!isFuture && (
        <button type="button" className="m-card m-status" onClick={() => navigate('history')}>
          <span className="m-avatar" style={{ background: hasDeficit ? 'rgba(239, 68, 68, 0.12)' : `rgba(${design.colors.successRgb}, 0.14)`, color: hasDeficit ? design.colors.danger : design.colors.success }}>
            {hasDeficit ? <AlertIcon size={20} /> : <CheckCircleIcon size={20} />}
          </span>
          <span className="m-row-main">
            <p className="m-row-title">Cash-Flow Deficit {inr(financeTotals.cashFlowDeficit)}</p>
            <p className="m-row-sub">{hasDeficit ? 'Cumulative spending above earnings' : 'Cumulative spending is within earnings'}</p>
          </span>
          <span style={{ fontSize: '20px', color: design.colors.textTertiary, flexShrink: 0 }} aria-hidden="true">›</span>
        </button>
      )}

      <div className="m-section-head">
        <h2>Top spending</h2>
        <button type="button" className="m-link" onClick={() => navigate('analytics')}>See all</button>
      </div>
      <div className="m-card">
        {topCats.length === 0 && <p className="m-empty">No spending recorded for {monthName}.</p>}
        {topCats.map((c, i) => (
          <div key={c.category} style={{ marginTop: i === 0 ? 0 : '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', marginBottom: '6px' }}>
              <span style={{ fontSize: '13px', fontWeight: 600, color: design.colors.textPrimary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.category}</span>
              <span style={{ fontSize: '13px', fontWeight: 700, color: design.colors.textPrimary, fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>
                {inr(c.amount)} <span style={{ color: design.colors.textTertiary, fontWeight: 500 }}>· {c.percentage.toFixed(0)}%</span>
              </span>
            </div>
            <div className="m-meter"><i style={{ width: `${Math.max(4, (c.amount / topCatMax) * 100)}%`, background: categoryColors[i % categoryColors.length] }} /></div>
          </div>
        ))}
      </div>

      <div className="m-section-head">
        <h2>Recent transactions</h2>
        <button type="button" className="m-link" onClick={() => navigate('transactions')}>See all</button>
      </div>
      <div className="m-card">
        {loading && <ListSkeleton rows={3} />}
        {!loading && recent.length === 0 && <p className="m-empty">No transactions yet for {monthName}.</p>}
        {!loading && recent.map(t => (
          <div className="m-row" key={`${t.credit ? 'c' : 'd'}-${t.id}`}>
            <span className="m-avatar" style={{ background: t.credit ? `rgba(${design.colors.successRgb}, 0.14)` : 'var(--m-surface-2)', color: t.credit ? design.colors.success : design.colors.textPrimary }}>
              {(t.category || '?').charAt(0).toUpperCase()}
            </span>
            <span className="m-row-main">
              <p className="m-row-title">{t.title}</p>
              <p className="m-row-sub">{t.category} · {format(new Date(t.date), 'dd MMM')}</p>
            </span>
            <span className="m-row-amt" style={{ color: t.credit ? design.colors.success : undefined }}>
              {t.credit ? '+' : '−'}{inr(t.amount)}
            </span>
          </div>
        ))}
      </div>
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
      <TrendCharts expenses={expenses} financeTotals={financeTotals} />
      <div className="m-section-head"><h2>Expense allocation</h2></div>
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

  const avatar = user?.photoURL ? (
    <img src={user.photoURL} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
  ) : (
    <span style={{ fontSize: '15px', fontWeight: 800 }}>{name.charAt(0).toUpperCase()}</span>
  );

  return (
    <div className="m-shell">
      <header className="m-topbar">
        <button className="m-icon-btn" onClick={() => setMenuOpen(true)} aria-label="Open menu" aria-expanded={menuOpen} aria-controls="m-drawer">
          <MenuIcon size={20} />
        </button>
        {page === 'overview' ? (
          <div className="m-greet">
            <small>{greeting()},</small>
            <strong>{name}</strong>
          </div>
        ) : (
          <h1 className="m-topbar-title">{PAGE_TITLES[page]}</h1>
        )}
        <button className="m-icon-btn" onClick={toggleTheme} aria-label="Toggle theme">
          {theme === 'light' ? <MoonIcon size={18} color={design.colors.textPrimary} /> : <SunIcon size={18} color={design.colors.textPrimary} />}
        </button>
        {page === 'overview' && (
          <button className="m-icon-btn" onClick={() => navigate('profile')} aria-label="My profile" style={{ background: design.colors.primaryGradient, color: 'white', border: 'none' }}>
            {avatar}
          </button>
        )}
      </header>

      <main>{body}</main>

      <nav className="m-tabbar" aria-label="Quick navigation">
        <button type="button" className={`m-tab ${page === 'overview' ? 'active' : ''}`} aria-current={page === 'overview' ? 'page' : undefined} onClick={() => navigate('overview')}>
          <HomeIcon /> Home
        </button>
        <button type="button" className={`m-tab ${page === 'transactions' ? 'active' : ''}`} aria-current={page === 'transactions' ? 'page' : undefined} onClick={() => navigate('transactions')}>
          <LedgerIcon size={22} /> Transactions
        </button>
        <div className="m-tab-add">
          <button type="button" className="m-fab" style={{ background: design.colors.primaryGradient }} onClick={() => navigate('add')} aria-label="Add transaction">
            <PlusIcon size={26} />
          </button>
        </div>
        <button type="button" className={`m-tab ${page === 'analytics' ? 'active' : ''}`} aria-current={page === 'analytics' ? 'page' : undefined} onClick={() => navigate('analytics')}>
          <PieIcon size={22} /> Analytics
        </button>
        <button type="button" className="m-tab" onClick={() => setMenuOpen(true)} aria-label="Open menu">
          <MenuIcon /> More
        </button>
      </nav>

      <div className={`m-scrim ${menuOpen ? 'open' : ''}`} onClick={() => setMenuOpen(false)} aria-hidden="true" />
      <nav id="m-drawer" className={`m-drawer ${menuOpen ? 'open' : ''}`} aria-label="Main menu" aria-hidden={!menuOpen} inert={!menuOpen}>
        <div className="m-drawer-head" style={{ background: HERO_BG }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '18px' }}>
            <LogoMark size={20} color="white" />
            <span style={{ flex: 1, fontSize: '15px', fontWeight: 800, letterSpacing: '0.14em' }}>PRATIQ</span>
            <button className="m-icon-btn plain" onClick={() => setMenuOpen(false)} aria-label="Close menu" style={{ color: 'white' }}>
              <CloseIcon />
            </button>
          </div>
          <button
            type="button"
            onClick={() => navigate('profile')}
            style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '100%', padding: 0, border: 'none', background: 'none', color: 'inherit', font: 'inherit', textAlign: 'left', cursor: 'pointer' }}
          >
            <span style={{ width: '46px', height: '46px', borderRadius: '50%', overflow: 'hidden', flexShrink: 0, background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {avatar}
            </span>
            <span style={{ minWidth: 0, flex: 1 }}>
              <span style={{ display: 'block', fontSize: '15px', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</span>
              <span style={{ display: 'block', fontSize: '12px', color: 'rgba(255,255,255,0.75)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.email}</span>
            </span>
            <span aria-hidden="true" style={{ fontSize: '20px', opacity: 0.8 }}>›</span>
          </button>
        </div>

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

        <div style={{ padding: '8px 10px', borderTop: '1px solid var(--m-line)' }}>
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
