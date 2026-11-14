import React, { useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { format } from 'date-fns';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { BankCardTile, DeltaBadge } from '@/components/BankCardTile';
import { BadgePill, Card, GlassPage, IconBox } from '@/components/Card';
import { Btn, TabGroup } from '@/components/controls';
import { CategoryLegend, CategoryPieChart } from '@/components/DonutChart';
import { DateRangeFilter } from '@/components/DateRangeFilter';
import { EarningsModal } from '@/components/EarningsModal';
import { EditExpenseModal } from '@/components/EditExpenseModal';
import { ExpenseForm } from '@/components/ExpenseForm';
import { ExpenseList } from '@/components/ExpenseList';
import { FinancialHistoryModal } from '@/components/FinancialHistoryModal';
import {
  AlertIcon,
  CalendarIcon,
  ChartLineIcon,
  CheckCircleIcon,
  ExchangeIcon,
  LedgerIcon,
  LogoMark,
  PieIcon,
  RupeeIcon,
  TrendDownIcon,
  WalletIcon,
} from '@/components/FinanceIcons';
import { MonthNav } from '@/components/MonthNav';
import { ProfileMenu } from '@/components/ProfileMenu';
import { StatCard } from '@/components/StatCard';
import { StatementUploadCard } from '@/components/StatementUploadCard';
import { useAuth } from '@/context/AuthContext';
import { useExpenses } from '@/context/ExpensesContext';
import { useIncome } from '@/context/IncomeContext';
import { useTheme } from '@/context/ThemeContext';
import { useToast } from '@/context/ToastContext';
import { useDashboardData } from '@/hooks/useDashboardData';
import { FINANCIAL_QUOTES, getDailyQuote } from '@shared/quotes';
import type { Expense } from '@shared/types';

type GraphType = 'total' | 'monthly';
const GRAPH_TABS = [
  ['total', 'Total Expenses'],
  ['monthly', 'Monthly Expenses'],
] as const;

const inr = (n: number) => `₹${n.toLocaleString('en-IN')}`;

/**
 * Mobile port of the web's DashboardWeb — the DESKTOP dashboard, section
 * for section: header, statement import, earnings/future banners, the four
 * KPI cards, the cash-flow deficit banner, Quick Transaction, Expense
 * Allocation, and the Account Statement. Multi-column desktop grids use the
 * web's own narrow-window fallbacks (KPIs 2×2, main grid stacked).
 */
export default function Dashboard() {
  const { palette } = useTheme();
  const router = useRouter();
  const toast = useToast();
  const { user, logout } = useAuth();
  const { deleteExpense } = useExpenses();
  const { deleteIncome } = useIncome();
  const d = useDashboardData();

  const [activeView, setActiveView] = useState<GraphType>('total');
  const [quote] = useState(() => getDailyQuote(FINANCIAL_QUOTES));
  const [editing, setEditing] = useState<Expense | null>(null);
  const [showEarnings, setShowEarnings] = useState(false);
  const [showDebt, setShowDebt] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  if (d.loading) {
    return (
      <GlassPage scroll={false} contentStyle={styles.center}>
        <ActivityIndicator size="large" color={palette.primary} />
      </GlassPage>
    );
  }

  const monthName = format(new Date(d.selectedYear, d.selectedMonth), 'MMMM yyyy');
  const status = d.selectedMonthEarnings.status;
  const userName = user?.email?.split('@')[0] || 'User';

  const handleDeleteExpense = async (id: string) => {
    try {
      await deleteExpense(id);
      toast.success('Expense deleted');
    } catch {
      toast.error('Failed to delete expense');
    }
  };
  const handleDeleteIncome = async (id: string) => {
    try {
      await deleteIncome(id);
      toast.success('Income entry deleted');
    } catch {
      toast.error('Failed to delete income entry');
    }
  };

  const warningBanner = (icon: React.ReactNode, title: string, body: string) => (
    <View style={[styles.warnBanner, { borderColor: `${palette.warning}4D` }]}>
      <LinearGradient
        colors={['rgba(245, 158, 11, 0.1)', 'rgba(251, 191, 36, 0.1)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={[styles.bannerIcon, { backgroundColor: palette.warning }]}>{icon}</View>
      <View style={styles.flexShrink}>
        <Text style={[styles.bannerTitle, { color: palette.textPrimary }]}>{title}</Text>
        <Text style={[styles.bannerBody, { color: palette.textSecondary }]}>{body}</Text>
      </View>
    </View>
  );

  return (
    <GlassPage
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={async () => {
            setRefreshing(true);
            try {
              await d.refresh();
            } finally {
              setRefreshing(false);
            }
          }}
          tintColor={palette.primary}
        />
      }
    >
      {/* Header */}
      <Card style={styles.header}>
        <View style={styles.brand}>
          <IconBox size={46}>
            <LogoMark size={26} color="#ffffff" />
          </IconBox>
          <View style={styles.flexShrink}>
            <View style={styles.brandRow}>
              <Text style={[styles.brandName, { color: palette.textPrimary }]}>PRATIQ</Text>
              <BadgePill label="Pro Expense Tracker" />
            </View>
            <Text style={[styles.welcome, { color: palette.textSecondary }]}>Welcome back, {userName}</Text>
            <Text style={[styles.quote, { color: palette.textTertiary }]}>
              “{quote.text}” — {quote.author}
            </Text>
          </View>
        </View>
        <View style={styles.headerActions}>
          <Btn
            variant="ghost"
            size="md"
            label="Statement"
            icon={<LedgerIcon size={15} color={palette.textPrimary} />}
            onPress={() => router.push('/statement')}
          />
          <Btn
            variant="ghost"
            size="md"
            label="Manage Earnings"
            color={palette.success}
            icon={<ChartLineIcon size={15} color={palette.success} />}
            onPress={() => router.push('/earnings')}
          />
          <ProfileMenu
            name={userName}
            email={user?.email}
            photoURL={user?.photoURL}
            onViewProfile={() => router.push('/profile')}
            onLogout={logout}
          />
        </View>
      </Card>

      <StatementUploadCard onOpen={() => router.push('/import')} />

      {d.error ? (
        <Card style={[styles.errorCard, { backgroundColor: palette.dangerLight }]}>
          <AlertIcon size={16} color={palette.danger} />
          <Text style={{ color: palette.danger, fontWeight: '600', flexShrink: 1 }}>{d.error}</Text>
        </Card>
      ) : null}

      {status === 'estimated' && !d.isFuture
        ? warningBanner(
            <AlertIcon size={20} color="#ffffff" />,
            `Estimated Earnings for ${monthName}`,
            'This month\'s earnings are estimated based on your default salary. Tap "Edit" to confirm the exact amount.'
          )
        : null}

      {d.isFuture
        ? warningBanner(
            <CalendarIcon size={20} color="#ffffff" />,
            'Future month — historical metrics not calculated',
            `You can log expenses for ${monthName}, but cumulative totals will update after the month begins.`
          )
        : null}

      {/* 4 KPI cards — the desktop .kpi-grid at its 2-column breakpoint */}
      <View style={styles.kpiRow}>
        <StatCard
          accent
          icon={<WalletIcon />}
          label={
            <View style={styles.kpiLabel}>
              <Text style={styles.kpiLabelText} numberOfLines={1}>MONTHLY EARNINGS</Text>
              {status === 'estimated' ? (
                <View style={styles.est}>
                  <AlertIcon size={10} color="#fde68a" strokeWidth={2.5} />
                  <Text style={styles.estText}>EST</Text>
                </View>
              ) : null}
              {status === 'missing' ? <Text style={styles.defaultText}>(default)</Text> : null}
            </View>
          }
          value={inr(d.selectedMonthEarnings.amount)}
          trend={d.trendWindow.map((m) => m.earnings)}
          badge={
            d.prevSummary ? (
              <DeltaBadge current={d.selectedMonthEarnings.amount} previous={d.prevSummary.earnings} light />
            ) : undefined
          }
          hint={
            <Pressable onPress={() => setShowEarnings(true)} style={styles.editBtn} accessibilityRole="button">
              <Text style={styles.editBtnText}>✎ Edit</Text>
            </Pressable>
          }
        />
        <StatCard
          accent
          icon={<TrendDownIcon />}
          label="Monthly Spending"
          value={inr(d.monthTotal)}
          trend={d.trendWindow.map((m) => m.spent)}
          badge={
            d.prevSummary ? (
              <DeltaBadge current={d.monthTotal} previous={d.prevSummary.spent} goodWhenDown light />
            ) : undefined
          }
          hint={`${d.monthExpenses.length} transactions`}
        />
      </View>
      <View style={styles.kpiRow}>
        <StatCard
          accent
          icon={<ExchangeIcon />}
          label="Monthly Net Cash Flow"
          value={inr(d.monthNetCashFlow)}
          valueColor={d.monthNetCashFlow >= 0 ? '#ffffff' : '#fecaca'}
          trend={d.trendWindow.map((m) => m.monthBalance)}
          hint={d.monthNetCashFlow >= 0 ? 'All credits − Spending' : 'Overspent this month'}
        />
        <BankCardTile
          value={d.isFuture ? '—' : inr(d.financeTotals.cumulativeNetCashFlow)}
          hint={d.isFuture ? 'Not calculated for future' : 'Running balance since first expense'}
          badge={
            !d.isFuture && d.prevSummary ? (
              <DeltaBadge
                current={d.financeTotals.cumulativeNetCashFlow}
                previous={d.prevSummary.runningBalance}
                light
              />
            ) : undefined
          }
        />
      </View>

      {/* Cash-flow deficit banner */}
      {!d.isFuture ? (
        <View
          style={[
            styles.deficit,
            { borderColor: d.hasDeficit ? 'rgba(239, 68, 68, 0.3)' : 'rgba(20, 184, 166, 0.3)' },
          ]}
        >
          <LinearGradient
            colors={
              d.hasDeficit
                ? ['rgba(239, 68, 68, 0.14)', 'rgba(249, 115, 22, 0.1)']
                : ['rgba(20, 184, 166, 0.14)', 'rgba(45, 212, 191, 0.1)']
            }
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.deficitLeft}>
            <View style={[styles.bannerIcon, { backgroundColor: d.hasDeficit ? palette.danger : palette.success }]}>
              {d.hasDeficit ? (
                <AlertIcon size={20} color="#ffffff" />
              ) : (
                <CheckCircleIcon size={20} color="#ffffff" />
              )}
            </View>
            <View style={styles.flexShrink}>
              <Text style={[styles.bannerTitle, { color: palette.textPrimary }]}>
                Cash-Flow Deficit {inr(d.financeTotals.cashFlowDeficit)}
              </Text>
              <Text style={[styles.bannerBody, { color: palette.textSecondary }]}>
                {d.hasDeficit
                  ? 'This cumulative spending above earnings — not tracked actual debt.'
                  : 'No deficit — cumulative spending is within earnings.'}
              </Text>
            </View>
          </View>
          <Btn variant="ghost" size="sm" label="View Breakdown" onPress={() => setShowDebt(true)} />
        </View>
      ) : null}

      {/* Quick Transaction */}
      <Card style={styles.section}>
        <View style={styles.sectionHead}>
          <View style={styles.titleRow}>
            <RupeeIcon size={15} color={palette.primary} />
            <Text style={[styles.sectionTitle, { color: palette.textPrimary }]}>Quick Transaction</Text>
            <BadgePill label="Instant Ledger Update" />
          </View>
          <MonthNav
            year={d.selectedYear}
            month={d.selectedMonth}
            currentYear={d.currentYear}
            currentMonth={d.currentMonth}
            onPrev={d.goToPreviousMonth}
            onNext={d.goToNextMonth}
            onToday={d.goToCurrentMonth}
            onSelect={d.goToMonth}
          />
        </View>
        <ExpenseForm />
      </Card>

      {/* Expense Allocation */}
      <Card style={styles.section}>
        <View style={[styles.sectionHead, { marginBottom: 16 }]}>
          <View style={styles.titleRow}>
            <PieIcon size={15} color={palette.primary} />
            <Text style={[styles.sectionTitle, { color: palette.textPrimary }]}>Expense Allocation</Text>
          </View>
          <TabGroup options={GRAPH_TABS} value={activeView} onChange={setActiveView} size="sm" />
        </View>

        {activeView === 'total' ? (
          <>
            <View style={styles.chartHead}>
              <Text style={[styles.chartCaption, { color: palette.textSecondary }]}>ALL TIME</Text>
              <Text style={[styles.chartTotal, { color: palette.primary }]}>{inr(d.totalAllTime)}</Text>
            </View>
            <CategoryPieChart data={d.allTimeCategoryAnalysis} height={260} />
            <CategoryLegend data={d.allTimeCategoryAnalysis} />
            <View style={[styles.statsRow, { borderTopColor: `${palette.primary}33` }]}>
              <View style={styles.stat}>
                <Text style={[styles.statLabel, { color: palette.textSecondary }]}>TRANSACTIONS</Text>
                <Text style={[styles.statValue, { color: palette.textPrimary }]}>{d.expenses.length}</Text>
              </View>
              <View style={styles.stat}>
                <Text style={[styles.statLabel, { color: palette.textSecondary }]}>TOP</Text>
                <Text style={[styles.statTop, { color: palette.textPrimary }]} numberOfLines={1}>
                  {d.topCategoryName}
                </Text>
                <Text style={[styles.statSub, { color: palette.primary }]}>{inr(d.topCategoryAmount)}</Text>
              </View>
              <View style={styles.stat}>
                <Text style={[styles.statLabel, { color: palette.textSecondary }]}>MONTHLY AVG</Text>
                <Text style={[styles.statValue, { color: palette.textPrimary }]} numberOfLines={1} adjustsFontSizeToFit>
                  ₹{d.financeTotals.calendarMonthAverage.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                </Text>
                <Text style={[styles.statFoot, { color: palette.textTertiary }]}>
                  over {d.financeTotals.calendarMonthCount} months
                </Text>
              </View>
            </View>
          </>
        ) : (
          <>
            <View style={styles.chartHead}>
              <Text style={[styles.chartCaption, { color: palette.textSecondary }]}>{monthName.toUpperCase()}</Text>
              <Text style={[styles.chartTotal, { color: palette.primary }]}>{inr(d.monthTotal)}</Text>
            </View>
            <CategoryPieChart data={d.monthCategoryAnalysis} height={300} />
            <CategoryLegend data={d.monthCategoryAnalysis} />
          </>
        )}
      </Card>

      {/* Account Statement */}
      <Card style={styles.statement}>
        <View style={styles.statementHead}>
          <View style={styles.titleRow}>
            <LedgerIcon size={15} color={palette.primary} />
            <Text style={[styles.sectionTitle, { color: palette.textPrimary }]}>Account Statement</Text>
          </View>
          <Text style={[styles.entries, { color: palette.textSecondary }]}>
            {d.historyExpenses.length + d.historyIncome.length} entries · {d.historyLabel}
          </Text>
        </View>
        <View style={[styles.filterWrap, { borderBottomColor: `${palette.primary}1F` }]}>
          <DateRangeFilter value={d.dateRange} onApply={d.setDateRange} onClear={d.clearDateRange} />
        </View>
        <ExpenseList
          expenses={d.historyExpenses}
          income={d.historyIncome}
          onDelete={handleDeleteExpense}
          onDeleteIncome={handleDeleteIncome}
          onEdit={setEditing}
          emptyStateLabel={d.dateRange ? 'No transactions in this date range' : `No transactions yet for ${monthName}`}
        />
      </Card>

      <EarningsModal
        isOpen={showEarnings}
        onClose={() => setShowEarnings(false)}
        year={d.selectedYear}
        month={d.selectedMonth}
      />
      <EditExpenseModal expense={editing} onClose={() => setEditing(null)} />
      <FinancialHistoryModal
        visible={showDebt}
        onClose={() => setShowDebt(false)}
        totals={d.financeTotals}
        hasDeficit={d.hasDeficit}
      />
    </GlassPage>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
  flexShrink: { flexShrink: 1 },
  header: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 18,
    paddingHorizontal: 20,
  },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 14, flexShrink: 1 },
  brandRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 10 },
  brandName: { fontSize: 20, fontWeight: '800', letterSpacing: 0.2 },
  welcome: { fontSize: 13, marginTop: 4 },
  quote: { fontSize: 11, fontStyle: 'italic', marginTop: 3 },
  headerActions: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 10 },
  errorCard: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 14 },
  warnBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
  },
  bannerIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  bannerTitle: { fontSize: 14, fontWeight: '700' },
  bannerBody: { fontSize: 12, marginTop: 2 },
  kpiRow: { flexDirection: 'row', gap: 16 },
  kpiLabel: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  kpiLabelText: { fontSize: 11, fontWeight: '600', letterSpacing: 0.66, color: 'rgba(255,255,255,0.85)', flexShrink: 1 },
  est: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  estText: { fontSize: 11, fontWeight: '600', color: '#fde68a' },
  defaultText: { fontSize: 11, fontWeight: '600', color: 'rgba(255,255,255,0.65)' },
  editBtn: { backgroundColor: 'rgba(255,255,255,0.22)', borderRadius: 8, paddingVertical: 3, paddingHorizontal: 10 },
  editBtnText: { fontSize: 11, fontWeight: '600', color: '#ffffff' },
  deficit: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 18,
    borderWidth: 1,
    overflow: 'hidden',
  },
  deficitLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flexShrink: 1, flexGrow: 1, flexBasis: 220 },
  section: { padding: 24 },
  sectionHead: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  sectionTitle: { fontSize: 16, fontWeight: '700' },
  chartHead: { alignItems: 'center', marginBottom: 4 },
  chartCaption: { fontSize: 11, fontWeight: '600', letterSpacing: 0.55 },
  chartTotal: { fontSize: 22, fontWeight: '700' },
  statsRow: { flexDirection: 'row', gap: 12, marginTop: 16, paddingTop: 16, borderTopWidth: 1 },
  stat: { flex: 1, alignItems: 'center', minWidth: 0 },
  statLabel: { fontSize: 10, fontWeight: '600', letterSpacing: 0.5 },
  statValue: { fontSize: 18, fontWeight: '700', marginTop: 4 },
  statTop: { fontSize: 14, fontWeight: '700', marginTop: 4 },
  statSub: { fontSize: 11, fontWeight: '600' },
  statFoot: { fontSize: 10, marginTop: 2 },
  statement: { paddingVertical: 20, paddingHorizontal: 24 },
  statementHead: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    gap: 8,
    marginBottom: 4,
  },
  entries: { fontSize: 12, fontWeight: '500' },
  filterWrap: { marginBottom: 14, paddingBottom: 14, borderBottomWidth: 1 },
});
