import React, { Suspense, lazy, useCallback, useEffect, useState } from 'react';
// Recharts is large; the pie chart loads on its own after the page appears.
const CategoryPieChart = lazy(() => import('../Charts/CategoryPieChart'));
import ExpenseForm from '../ExpenseForm/ExpenseForm';
import TransactionHistory from '../ExpenseList/TransactionHistory';
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
import RotatingQuote from '../common/RotatingQuote';
import BudgetsPanel from '../Budgets/BudgetsPanel';
import RecurringPanel from '../Recurring/RecurringPanel';
import ListSkeleton from '../common/ListSkeleton';
import { format } from 'date-fns';
import { theme as design, categoryColors } from '../../styles/theme';
import { useDashboardData } from '../../hooks/useDashboardData';
import { useInstallPrompt } from '../../hooks/useInstallPrompt';
import { useLanguage } from '../../context/useLanguage';
import type { TranslationKey } from '../../i18n';
import {
  WalletIcon, TrendDownIcon, ExchangeIcon, LedgerIcon, ChartLineIcon, PieIcon,
  RupeeIcon, AlertIcon, CheckCircleIcon, CalendarIcon, CardChip, ContactlessMark,
  DeltaBadge, MoonIcon, SunIcon, UserIcon, UploadIcon, LogoutIcon, ClockIcon, DocumentIcon,
  SavingsIcon,
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
  | 'ledger' | 'earnings' | 'history' | 'netSavings' | 'import' | 'profile' | 'budgets' | 'recurring';

function pageTitles(t: (key: TranslationKey) => string): Record<Page, string> {
  return {
    overview: t('dashboard.page.home'),
    add: t('dashboard.page.addTransaction'),
    transactions: t('dashboard.page.transactions'),
    analytics: t('dashboard.page.analytics'),
    ledger: t('dashboard.nav.ledger'),
    earnings: t('dashboard.nav.earnings'),
    history: t('dashboard.page.history'),
    netSavings: t('dashboard.netSavings.title'),
    import: t('dashboard.page.import'),
    profile: t('dashboard.page.profile'),
    budgets: t('dashboard.page.budgets'),
    recurring: t('dashboard.page.recurring'),
  };
}

const PAGE_KEYS: Page[] = ['overview', 'add', 'transactions', 'analytics', 'ledger', 'earnings', 'history', 'netSavings', 'import', 'profile', 'budgets', 'recurring'];

const Svg: React.FC<{ size?: number; children: React.ReactNode }> = ({ size = 22, children }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {children}
  </svg>
);
const MenuIcon: React.FC<{ size?: number }> = ({ size }) => <Svg size={size}><path d="M4 7h16M4 12h10M4 17h16" /></Svg>;
const CloseIcon: React.FC<{ size?: number }> = ({ size = 20 }) => <Svg size={size}><path d="M6 6l12 12M18 6L6 18" /></Svg>;
const HomeIcon: React.FC<{ size?: number }> = ({ size }) => <Svg size={size}><path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" /></Svg>;
const PlusIcon: React.FC<{ size?: number }> = ({ size }) => <Svg size={size}><path d="M12 5v14M5 12h14" /></Svg>;
const DownloadIcon: React.FC<{ size?: number }> = ({ size = 18 }) => <Svg size={size}><path d="M12 4v11M7 10l5 5 5-5M5 20h14" /></Svg>;
const ArrowIcon: React.FC<{ up?: boolean }> = ({ up }) => (
  <Svg size={16}>{up ? <path d="M12 19V5M6 11l6-6 6 6" /> : <path d="M12 5v14M6 13l6 6 6-6" />}</Svg>
);

function buildNav(t: (key: TranslationKey) => string): { section: string; items: { page: Page; label: string; icon: React.ReactNode }[] }[] {
  return [
    {
      section: t('dashboard.navSection.account'),
      items: [{ page: 'profile', label: t('dashboard.page.profile'), icon: <UserIcon size={18} /> }],
    },
    {
      section: t('dashboard.navSection.dashboard'),
      items: [
        { page: 'overview', label: t('dashboard.page.home'), icon: <HomeIcon size={18} /> },
        { page: 'add', label: t('dashboard.page.addTransaction'), icon: <RupeeIcon size={18} /> },
        { page: 'transactions', label: t('dashboard.page.transactions'), icon: <LedgerIcon size={18} /> },
        { page: 'analytics', label: t('dashboard.page.analyticsTrends'), icon: <ChartLineIcon size={18} /> },
        { page: 'budgets', label: t('dashboard.page.budgets'), icon: <WalletIcon size={18} /> },
        { page: 'recurring', label: t('dashboard.page.recurring'), icon: <ClockIcon size={18} /> },
      ],
    },
    {
      section: t('dashboard.navSection.reports'),
      items: [
        { page: 'ledger', label: t('dashboard.nav.ledger'), icon: <DocumentIcon size={18} /> },
        { page: 'earnings', label: t('dashboard.nav.earnings'), icon: <ChartLineIcon size={18} /> },
        { page: 'history', label: t('dashboard.page.history'), icon: <ClockIcon size={18} /> },
        { page: 'netSavings', label: t('dashboard.netSavings.title'), icon: <SavingsIcon size={18} /> },
        { page: 'import', label: t('dashboard.page.import'), icon: <UploadIcon size={18} /> },
      ],
    },
  ];
}

function pageFromHash(): Page {
  const key = window.location.hash.replace(/^#\/?/, '');
  return (PAGE_KEYS as string[]).includes(key) ? (key as Page) : 'overview';
}

const inr = (n: number, opts?: Intl.NumberFormatOptions) => `₹${n.toLocaleString('en-IN', opts)}`;

function greeting(t: (key: TranslationKey) => string): string {
  const h = new Date().getHours();
  return h < 12 ? t('dashboard.greeting.morning') : h < 17 ? t('dashboard.greeting.afternoon') : t('dashboard.greeting.evening');
}

/** Dark-tinted version of the brand gradient, so it follows the color theme.
 * Must be read at call time (not module load), since `design.colors` is
 * mutated in place when the theme switches. */
const heroBg = () => `linear-gradient(135deg, rgba(4, 10, 30, 0.55) 0%, rgba(4, 10, 30, 0.12) 100%), ${design.colors.primaryGradient}`;

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
  const { t } = useLanguage();

  const [page, setPage] = useState<Page>(pageFromHash);
  const [menuOpen, setMenuOpen] = useState(false);
  const { canInstall, install } = useInstallPrompt();
  const [activeView, setActiveView] = useState<'total' | 'monthly'>('total');
  const PAGE_TITLES = pageTitles(t);
  const NAV = buildNav(t);

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
      {!isCurrentMonth && <button onClick={goToCurrentMonth} className="today">{t('dashboard.today')}</button>}
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
      <div className="m-hero" style={{ background: heroBg() }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <p className="m-hero-label">{t('dashboard.netBalance.label')}</p>
          <ContactlessMark size={20} />
        </div>
        <p className="m-hero-amount">{isFuture ? '—' : inr(financeTotals.cumulativeNetCashFlow)}</p>
        <p style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', margin: '8px 0 0', fontSize: '12px', color: 'rgba(255,255,255,0.75)', fontWeight: 500 }}>
          {isFuture ? t('dashboard.netBalance.futureNote') : t('dashboard.netBalance.runningSince')}
          {!isFuture && prevSummary && (
            <DeltaBadge current={financeTotals.cumulativeNetCashFlow} previous={prevSummary.runningBalance} light />
          )}
        </p>
        <div className="m-hero-split">
          <div>
            <span className="ico"><ArrowIcon /></span>
            <span style={{ minWidth: 0 }}>
              <small>{t('dashboard.kpi.earningsShort')}</small>
              <strong>{inr(earned)}</strong>
            </span>
          </div>
          <div>
            <span className="ico"><ArrowIcon up /></span>
            <span style={{ minWidth: 0 }}>
              <small>{t('dashboard.kpi.spendingShort')}</small>
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
          <span className="ico"><PlusIcon /></span><span>{t('dashboard.addAction')}</span>
        </button>
        <button type="button" className="m-action" onClick={() => navigate('import')}>
          <span className="ico"><UploadIcon size={22} /></span><span>{t('dashboard.importAction')}</span>
        </button>
        <button type="button" className="m-action" onClick={() => navigate('earnings')}>
          <span className="ico"><ChartLineIcon size={22} /></span><span>{t('dashboard.kpi.earningsShort')}</span>
        </button>
        <button type="button" className="m-action" onClick={() => navigate('ledger')}>
          <span className="ico"><DocumentIcon size={22} /></span><span>{t('dashboard.ledgerAction')}</span>
        </button>
      </div>

      <RotatingQuote variant="card" />

      {selectedMonthEarnings.status === 'estimated' && !isFuture && (
        <Notice icon={<AlertIcon size={18} color="white" />} title={t('dashboard.estimated.title', { month: monthName })}>
          {t('dashboard.estimated.bodyMobile')}
        </Notice>
      )}
      {isFuture && (
        <Notice icon={<CalendarIcon size={18} color="white" />} title={t('dashboard.future.title')}>
          {t('dashboard.future.body', { month: monthName })}
        </Notice>
      )}

      <div className="m-section-head"><h2>{monthName}</h2></div>
      <div className="m-tiles">
        <div className="m-card">
          <p className="m-tile-label">
            <span className="dot" style={{ background: `rgba(${design.colors.successRgb}, 0.14)`, color: design.colors.success }}><WalletIcon size={15} /></span>
            {t('dashboard.kpi.earningsShort')}
          </p>
          <p className="m-tile-value">{inr(earned)}</p>
          <div className="m-tile-foot">
            <button type="button" className="m-chip-btn" onClick={() => setShowEarningsModal(true)}>✎ {t('common.edit')}</button>
            {selectedMonthEarnings.status === 'estimated' && <span style={{ color: design.colors.warning, fontWeight: 700 }}>{t('common.est')}</span>}
            {selectedMonthEarnings.status === 'missing' && <span>{t('common.default')}</span>}
          </div>
        </div>
        <div className="m-card">
          <p className="m-tile-label">
            <span className="dot" style={{ background: 'rgba(239, 68, 68, 0.12)', color: design.colors.danger }}><TrendDownIcon size={15} /></span>
            {t('dashboard.kpi.spendingShort')}
          </p>
          <p className="m-tile-value">{inr(monthTotal)}</p>
          <div className="m-tile-foot">
            <span>{t('dashboard.kpi.transactionsCount', { count: monthExpenses.length })}</span>
          </div>
        </div>
      </div>

      <div className="m-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
          <div style={{ minWidth: 0 }}>
            <p className="m-tile-label">
              <span className="dot" style={{ background: `rgba(${design.colors.primaryRgb}, 0.12)`, color: design.colors.primary }}><ExchangeIcon size={15} /></span>
              {t('dashboard.kpi.netCashFlowShort')}
            </p>
            <p className="m-tile-value" style={{ color: monthNetCashFlow >= 0 ? design.colors.success : design.colors.danger }}>
              {monthNetCashFlow < 0 ? '−' : ''}{inr(Math.abs(monthNetCashFlow))}
            </p>
          </div>
          <span style={{ fontSize: '12px', fontWeight: 700, color: meterColor, flexShrink: 0, paddingTop: '6px' }}>{t('dashboard.spentPercent', { percent: spentPct })}</span>
        </div>
        <div className="m-meter" style={{ marginTop: '12px' }} role="img" aria-label={`${spentPct}% of earnings spent`}>
          <i style={{ width: `${Math.min(100, spentPct)}%`, background: meterColor }} />
        </div>
        <p style={{ margin: '8px 0 0', fontSize: '11px', color: design.colors.textSecondary }}>
          {monthNetCashFlow >= 0 ? t('dashboard.hint.allCredits') : t('dashboard.hint.overspent')}
        </p>
      </div>

      {!isFuture && (
        <button type="button" className="m-card m-status" onClick={() => navigate('history')}>
          <span className="m-avatar" style={{ background: hasDeficit ? 'rgba(239, 68, 68, 0.12)' : `rgba(${design.colors.successRgb}, 0.14)`, color: hasDeficit ? design.colors.danger : design.colors.success }}>
            {hasDeficit ? <AlertIcon size={20} /> : <CheckCircleIcon size={20} />}
          </span>
          <span className="m-row-main">
            <p className="m-row-title">{t('dashboard.deficit.label')} {inr(financeTotals.cashFlowDeficit)}</p>
            <p className="m-row-sub">{hasDeficit ? t('dashboard.deficit.bodyNegativeMobile') : t('dashboard.deficit.bodyPositiveMobile')}</p>
          </span>
          <span style={{ fontSize: '20px', color: design.colors.textTertiary, flexShrink: 0 }} aria-hidden="true">›</span>
        </button>
      )}

      <div className="m-section-head">
        <h2>{t('dashboard.page.budgets')}</h2>
        <button className="m-link" onClick={() => navigate('budgets')}>{t('dashboard.manage')}</button>
      </div>
      <BudgetsPanel preview monthExpenses={monthExpenses} expenses={expenses} year={selectedYear} month={selectedMonth} monthName={monthName} onManage={() => navigate('budgets')} />

      <div className="m-section-head">
        <h2>{t('dashboard.topSpending')}</h2>
        <button type="button" className="m-link" onClick={() => navigate('analytics')}>{t('dashboard.seeAll')}</button>
      </div>
      <div className="m-card">
        {topCats.length === 0 && <p className="m-empty">{t('dashboard.noSpendingRecorded', { month: monthName })}</p>}
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
        <h2>{t('dashboard.recentTransactions')}</h2>
        <button type="button" className="m-link" onClick={() => navigate('transactions')}>{t('dashboard.seeAll')}</button>
      </div>
      <div className="m-card">
        {loading && <ListSkeleton rows={3} />}
        {!loading && recent.length === 0 && <p className="m-empty">{t('dashboard.noTransactionsMonth', { month: monthName })}</p>}
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
          <h3 style={sectionTitle}><RupeeIcon size={15} color={design.colors.primary} /> {t('dashboard.quickTransaction')}</h3>
          <span className="badge-pill">{t('dashboard.instantLedgerUpdate')}</span>
        </div>
        <ExpenseForm onAddExpense={handleAddExpense} onAddIncome={handleAddIncome} />
      </div>
    </>
  );

  const renderTransactions = () => (
    <>
      {!dateRange && monthBar}
      <div className="tl-ranges">
        <DateRangeFilter value={dateRange} onApply={setDateRange} onClear={clearDateRange} />
      </div>
      <div className="m-section-head">
        <h2>{dateRange ? t('dashboard.selectedDates') : monthName}</h2>
        <span style={{ fontSize: '12px', color: design.colors.textSecondary, fontWeight: 500 }}>
          {t('dashboard.entries', { count: historyExpenses.length + historyIncome.length })}{dateRange ? ` · ${historyLabel}` : ''}
        </span>
      </div>
      {loading ? (
        <div className="glass-card" style={{ padding: '16px' }}><ListSkeleton rows={6} /></div>
      ) : (
        <TransactionHistory
          expenses={historyExpenses}
          income={historyIncome}
          onDelete={handleDeleteExpense}
          onDeleteIncome={handleDeleteIncome}
          onEditIncome={handleEditIncome}
          onBulkCategory={handleBulkCategory}
          onEdit={handleEdit}
          emptyStateLabel={dateRange ? t('dashboard.noTransactionsRange') : t('dashboard.noTransactionsMonth', { month: monthName })}
        />
      )}
    </>
  );

  const renderAnalytics = () => (
    <>
      {activeView === 'monthly' && monthBar}
      <div className="glass-card" style={{ padding: '4px' }}>
        <div className="tab-container" style={{ width: '100%' }}>
          <button onClick={() => setActiveView('total')} className={`tab ${activeView === 'total' ? 'active' : ''}`} style={{ fontSize: '13px', padding: '9px' }}>{t('dashboard.tab.totalExpenses')}</button>
          <button onClick={() => setActiveView('monthly')} className={`tab ${activeView === 'monthly' ? 'active' : ''}`} style={{ fontSize: '13px', padding: '9px' }}>{t('dashboard.tab.monthlyExpenses')}</button>
        </div>
      </div>
      <div className="glass-card" style={{ padding: '16px', overflow: 'hidden' }}>
        <div style={{ textAlign: 'center', marginBottom: '4px' }}>
          <p style={{ fontSize: '11px', color: design.colors.textSecondary, margin: 0, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {activeView === 'total' ? t('dashboard.allTime') : monthName}
          </p>
          <p style={{ fontSize: '22px', fontWeight: 700, color: design.colors.primary, margin: 0 }}>
            ₹{(activeView === 'total' ? totalAllTime : monthTotal).toLocaleString('en-IN')}
          </p>
        </div>
        <div style={{ height: '260px' }}>
          <Suspense fallback={null}><CategoryPieChart data={activeView === 'total' ? allTimeCategoryAnalysis : monthCategoryAnalysis} height={260} legend={false} /></Suspense>
        </div>
        <CategoryLegend data={activeView === 'total' ? allTimeCategoryAnalysis : monthCategoryAnalysis} />
        {activeView === 'total' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '8px', marginTop: '16px', paddingTop: '16px', borderTop: `1px solid ${design.colors.primary}20` }}>
            <MiniStat label={t('dashboard.stat.transactions')} value={String(expenses.length)} />
            <MiniStat label={t('dashboard.stat.top')} value={topCategoryName} sub={`₹${topCategoryAmount.toLocaleString('en-IN')}`} />
            <MiniStat
              label={t('dashboard.stat.monthlyAvg')}
              value={`₹${financeTotals.calendarMonthAverage.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`}
              sub={t('dashboard.stat.overMonths', { count: financeTotals.calendarMonthCount })}
            />
          </div>
        )}
      </div>
      <div className="m-section-head"><h2>{t('dashboard.trends')}</h2></div>
      <TrendCharts expenses={expenses} financeTotals={financeTotals} />
    </>
  );

  const renderHistory = () => (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '8px' }}>
        <MiniStat card label={t('dashboard.history.totalEarned')} value={`₹${financeTotals.totalEarnings.toLocaleString('en-IN')}`} />
        <MiniStat card label={t('dashboard.history.totalSpent')} value={`₹${financeTotals.totalSpent.toLocaleString('en-IN')}`} />
        <MiniStat
          card
          label={hasDeficit ? t('dashboard.history.deficit') : t('dashboard.history.netPositive')}
          value={`₹${(hasDeficit ? financeTotals.cashFlowDeficit : financeTotals.cumulativeNetCashFlow).toLocaleString('en-IN')}`}
          color={hasDeficit ? design.colors.danger : design.colors.success}
        />
      </div>
      <div className="glass-card" style={{ padding: '6px 14px' }}>
        {financeTotals.monthlySummaries.length === 0 && (
          <p style={{ fontSize: '13px', color: design.colors.textSecondary, textAlign: 'center', padding: '20px 0', margin: 0 }}>{t('dashboard.history.noHistory')}</p>
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
                {s.earningsStatus === 'estimated' && <span style={{ marginLeft: '6px', fontSize: '10px', color: design.colors.warning, fontWeight: 700 }}>{t('common.est')}</span>}
              </p>
              <p style={{ margin: 0, fontSize: '14px', fontWeight: 700, textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: isDeficit ? design.colors.danger : design.colors.success }}>
                {isDeficit ? `−₹${s.debtAtEndOfMonth.toLocaleString('en-IN')}` : `+₹${s.savingsAtEndOfMonth.toLocaleString('en-IN')}`}
              </p>
              <p style={{ margin: 0, fontSize: '12px', color: design.colors.textSecondary, fontVariantNumeric: 'tabular-nums' }}>
                {t('dashboard.history.colEarned')} ₹{s.earnings.toLocaleString('en-IN')} · {t('dashboard.history.colSpent')} ₹{s.spent.toLocaleString('en-IN')}
              </p>
              <p style={{ margin: 0, fontSize: '11px', color: design.colors.textTertiary, textAlign: 'right' }}>
                {isDeficit ? t('dashboard.history.deficit') : t('dashboard.history.savings')}
              </p>
            </div>
          );
        })}
      </div>
    </>
  );

  // Net savings = that month's earnings minus that month's spending
  // (MonthlySummary.monthBalance), one row per month — distinct from the
  // Financial History page, which shows the running cumulative balance.
  const renderNetSavings = () => {
    const totalNetSavings = financeTotals.monthlySummaries.reduce((s, m) => s + m.monthBalance, 0);
    return (
      <>
        <div className="glass-card" style={{ padding: '6px 14px' }}>
          {financeTotals.monthlySummaries.length === 0 && (
            <p style={{ fontSize: '13px', color: design.colors.textSecondary, textAlign: 'center', padding: '20px 0', margin: 0 }}>
              {t('dashboard.netSavings.empty')}
            </p>
          )}
          {[...financeTotals.monthlySummaries].reverse().map((s, i, arr) => (
            <div key={`${s.year}-${s.month}`} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px',
              padding: '14px 0', borderBottom: i < arr.length - 1 ? `1px solid ${design.colors.primary}12` : 'none',
            }}>
              <p style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: design.colors.textPrimary }}>
                {format(new Date(s.year, s.month), 'MMM yyyy')}
              </p>
              <p style={{ margin: 0, fontSize: '14px', fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: s.monthBalance >= 0 ? design.colors.success : design.colors.danger }}>
                {s.monthBalance < 0 ? '−' : '+'}₹{Math.abs(s.monthBalance).toLocaleString('en-IN')}
              </p>
            </div>
          ))}
        </div>
        {financeTotals.monthlySummaries.length > 0 && (
          <div className="glass-card" style={{ padding: '18px 20px', background: design.colors.primaryGradient, border: 'none' }}>
            <p style={{ fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,0.8)', textTransform: 'uppercase', letterSpacing: '0.1em', margin: 0 }}>
              {t('dashboard.netSavings.total')}
            </p>
            <p style={{ fontSize: '26px', fontWeight: 700, color: 'white', margin: '6px 0 0 0', fontVariantNumeric: 'tabular-nums' }}>
              {totalNetSavings < 0 ? '−' : ''}₹{Math.abs(totalNetSavings).toLocaleString('en-IN')}
            </p>
          </div>
        )}
      </>
    );
  };

  let body: React.ReactNode;
  // Full sub-pages carry their own layout and padding; dashboard sections
  // share the .m-content column.
  switch (page) {
    case 'ledger': body = <TransactionLedgerPage onBack={goHome} year={selectedYear} month={selectedMonth} />; break;
    case 'earnings': body = <EarningsHistoryPage onBack={goHome} />; break;
    case 'profile': body = <ProfilePage onBack={goHome} onOpenEarnings={() => navigate('earnings')} />; break;
    case 'import':
      body = (
        <Suspense fallback={<div style={{ padding: '12px' }}><ListSkeleton rows={4} /></div>}>
          <BankStatementImportPage onBack={goHome} onImported={goToMonth} />
        </Suspense>
      );
      break;
    case 'add': body = <div className="m-content">{renderAdd()}</div>; break;
    case 'transactions': body = <div className="m-content">{renderTransactions()}</div>; break;
    case 'analytics': body = <div className="m-content">{renderAnalytics()}</div>; break;
    case 'history': body = <div className="m-content">{renderHistory()}</div>; break;
    case 'netSavings': body = <div className="m-content">{renderNetSavings()}</div>; break;
    case 'recurring': body = <div className="m-content"><RecurringPanel /></div>; break;
    case 'budgets':
      body = (
        <div className="m-content">
          {monthBar}
          <BudgetsPanel monthExpenses={monthExpenses} expenses={expenses} year={selectedYear} month={selectedMonth} monthName={monthName} />
        </div>
      );
      break;
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
            <small>{greeting(t)},</small>
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
          <HomeIcon /> {t('dashboard.page.home')}
        </button>
        <button type="button" className={`m-tab ${page === 'transactions' ? 'active' : ''}`} aria-current={page === 'transactions' ? 'page' : undefined} onClick={() => navigate('transactions')}>
          <LedgerIcon size={22} /> {t('dashboard.page.transactions')}
        </button>
        <div className="m-tab-add">
          <button type="button" className="m-fab" style={{ background: design.colors.primaryGradient }} onClick={() => navigate('add')} aria-label="Add transaction">
            <PlusIcon size={26} />
          </button>
        </div>
        <button type="button" className={`m-tab ${page === 'analytics' ? 'active' : ''}`} aria-current={page === 'analytics' ? 'page' : undefined} onClick={() => navigate('analytics')}>
          <PieIcon size={22} /> {t('dashboard.page.analytics')}
        </button>
        <button type="button" className={`m-tab ${page === 'earnings' ? 'active' : ''}`} aria-current={page === 'earnings' ? 'page' : undefined} onClick={() => navigate('earnings')}>
          <ChartLineIcon size={22} /> {t('dashboard.kpi.earningsShort')}
        </button>
      </nav>

      <div className={`m-scrim ${menuOpen ? 'open' : ''}`} onClick={() => setMenuOpen(false)} aria-hidden="true" />
      <nav id="m-drawer" className={`m-drawer ${menuOpen ? 'open' : ''}`} aria-label="Main menu" aria-hidden={!menuOpen} inert={!menuOpen}>
        <div className="m-drawer-head" style={{ background: heroBg() }}>
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
          {canInstall && (
            <button type="button" className="m-nav-item" onClick={() => { setMenuOpen(false); install(); }}>
              <span className="m-nav-icon"><DownloadIcon /></span>
              {t('dashboard.installApp')}
            </button>
          )}
          <button type="button" className="m-nav-item" onClick={logout} style={{ color: design.colors.danger }}>
            <span className="m-nav-icon"><LogoutIcon size={18} /></span>
            {t('dashboard.logout')}
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
  const { t } = useLanguage();
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
          {hiddenCount === 1 ? t('dashboard.legend.moreCategory', { count: hiddenCount }) : t('dashboard.legend.moreCategories', { count: hiddenCount })}
        </p>
      )}
    </div>
  );
};

export default DashboardMobile;
