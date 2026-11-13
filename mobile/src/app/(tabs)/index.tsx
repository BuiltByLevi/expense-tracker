import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { format } from 'date-fns';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppHeader } from '@/components/AppHeader';
import { BankCardTile, DeltaBadge } from '@/components/BankCardTile';
import { Card } from '@/components/Card';
import { StatCard } from '@/components/StatCard';
import { StatementUploadCard } from '@/components/StatementUploadCard';
import {
  AlertIcon,
  CalendarIcon,
  CheckCircleIcon,
  ExchangeIcon,
  LedgerIcon,
  PieIcon,
  TrendDownIcon,
  WalletIcon,
} from '@/components/FinanceIcons';
import { useDashboardData } from '@/hooks/useDashboardData';
import { useTheme } from '@/context/ThemeContext';
import { fontSize, radius, spacing } from '@/theme';
import { formatCurrency, formatSignedCurrency } from '@/utils/format';

export default function DashboardScreen() {
  const { palette, categoryColors } = useTheme();
  const router = useRouter();
  const d = useDashboardData();
  const [refreshing, setRefreshing] = React.useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await d.refresh();
    } finally {
      setRefreshing(false);
    }
  };

  const monthLabel = format(new Date(d.selectedYear, d.selectedMonth), 'MMMM yyyy');

  const recent = [
    ...d.monthExpenses.map((e) => ({
      kind: 'debit' as const, id: e.id, date: e.date,
      label: e.description || e.category, category: e.category, amount: e.amount,
    })),
    ...d.monthIncome.map((i) => ({
      kind: 'credit' as const, id: i.id, date: i.date,
      label: i.description || i.category, category: i.category, amount: i.amount,
    })),
  ]
    .sort((a, b) => b.date.getTime() - a.date.getTime())
    .slice(0, 5);

  if (d.loading) {
    return (
      <SafeAreaView style={[styles.flex, styles.center, { backgroundColor: palette.screenBg }]}>
        <ActivityIndicator size="large" color={palette.primary} />
      </SafeAreaView>
    );
  }

  const earningsStatus = d.selectedMonthEarnings.status;

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: palette.screenBg }]} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={palette.primary} />
        }
      >
        <AppHeader />

        <StatementUploadCard onOpen={() => router.push('/import')} />

        {d.error ? (
          <Card style={{ ...styles.banner, backgroundColor: palette.dangerLight }}>
            <AlertIcon size={16} color={palette.danger} />
            <Text style={[styles.bannerText, { color: palette.danger }]}>{d.error}</Text>
          </Card>
        ) : null}

        {/* Month navigator */}
        <Card style={styles.monthNav}>
          <Pressable onPress={d.goToPreviousMonth} hitSlop={12} style={styles.navBtn}>
            <Text style={[styles.navGlyph, { color: palette.primary }]}>◀</Text>
          </Pressable>
          <View style={styles.monthLabelRow}>
            <CalendarIcon size={14} color={palette.textSecondary} />
            <Text style={[styles.monthLabel, { color: palette.textPrimary }]}>{monthLabel}</Text>
          </View>
          <Pressable onPress={d.goToNextMonth} hitSlop={12} style={styles.navBtn}>
            <Text style={[styles.navGlyph, { color: palette.primary }]}>▶</Text>
          </Pressable>
          <Pressable
            onPress={d.goToCurrentMonth}
            style={[styles.todayBtn, { backgroundColor: palette.primary }]}
          >
            <Text style={styles.todayText}>Today</Text>
          </Pressable>
        </Card>

        {/* KPI grid — same cards, icons and order as the web dashboard */}
        <View style={styles.kpiRow}>
          <StatCard
            accent
            icon={<WalletIcon />}
            label={
              earningsStatus === 'estimated'
                ? 'Monthly Earnings · EST'
                : earningsStatus === 'missing'
                  ? 'Monthly Earnings (default)'
                  : 'Monthly Earnings'
            }
            value={formatCurrency(d.selectedMonthEarnings.amount)}
            hint={earningsStatus === 'confirmed' ? 'Confirmed from transactions' : 'Set in Earnings'}
            trend={d.trendWindow.map((m) => m.earnings)}
          />
          <StatCard
            accent
            icon={<TrendDownIcon />}
            label="Monthly Spending"
            value={formatCurrency(d.monthTotal)}
            hint={`${d.monthExpenses.length} transactions`}
            trend={d.trendWindow.map((m) => m.spent)}
          />
        </View>

        <View style={styles.kpiRow}>
          <StatCard
            accent
            icon={<ExchangeIcon />}
            label="Monthly Net Cash Flow"
            value={formatCurrency(d.monthNetCashFlow)}
            valueColor={d.monthNetCashFlow >= 0 ? '#ffffff' : '#fecaca'}
            hint={d.monthNetCashFlow >= 0 ? 'All credits − Spending' : 'Overspent this month'}
            trend={d.trendWindow.map((m) => m.monthBalance)}
          />
          <BankCardTile
            value={d.isFuture ? '—' : formatCurrency(d.financeTotals.cumulativeNetCashFlow)}
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
        <Card
          style={{
            ...styles.deficitCard,
            backgroundColor: d.hasDeficit ? palette.dangerLight : palette.successLight,
          }}
        >
          {d.hasDeficit ? (
            <AlertIcon size={20} color={palette.danger} />
          ) : (
            <CheckCircleIcon size={20} color={palette.success} />
          )}
          <View style={styles.flexShrink}>
            <Text
              style={[
                styles.deficitTitle,
                { color: d.hasDeficit ? palette.danger : palette.success },
              ]}
            >
              Cash-Flow Deficit {formatCurrency(d.financeTotals.cashFlowDeficit)}
            </Text>
            <Text style={[styles.deficitSub, { color: palette.textSecondary }]}>
              {d.hasDeficit
                ? 'Cumulative spending has exceeded cumulative credits.'
                : 'No deficit — cumulative spending is within earnings.'}
            </Text>
          </View>
        </Card>

        {/* Expense allocation */}
        <Card style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <PieIcon size={16} color={palette.primary} />
              <Text style={[styles.sectionTitle, { color: palette.textPrimary }]}>
                Expense Allocation
              </Text>
            </View>
            <Pressable onPress={() => router.push('/analytics')} hitSlop={8}>
              <Text style={[styles.link, { color: palette.primary }]}>Details</Text>
            </Pressable>
          </View>
          {d.monthCategoryAnalysis.length === 0 ? (
            <Text style={[styles.empty, { color: palette.textTertiary }]}>
              No spending recorded for {monthLabel}.
            </Text>
          ) : (
            d.monthCategoryAnalysis.slice(0, 5).map((c, i) => (
              <View key={c.category} style={styles.catRow}>
                <View
                  style={[styles.dot, { backgroundColor: categoryColors[i % categoryColors.length] }]}
                />
                <Text style={[styles.catName, { color: palette.textPrimary }]} numberOfLines={1}>
                  {c.category}
                </Text>
                <Text style={[styles.catPct, { color: palette.textTertiary }]}>
                  {c.percentage.toFixed(0)}%
                </Text>
                <Text style={[styles.catAmt, { color: palette.textPrimary }]}>
                  {formatCurrency(c.amount)}
                </Text>
              </View>
            ))
          )}
        </Card>

        {/* Recent activity */}
        <Card style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <LedgerIcon size={16} color={palette.primary} />
              <Text style={[styles.sectionTitle, { color: palette.textPrimary }]}>
                Recent Activity
              </Text>
            </View>
            <Pressable onPress={() => router.push('/transactions')} hitSlop={8}>
              <Text style={[styles.link, { color: palette.primary }]}>See all</Text>
            </Pressable>
          </View>
          {recent.length === 0 ? (
            <Text style={[styles.empty, { color: palette.textTertiary }]}>
              No transactions in {monthLabel}.
            </Text>
          ) : (
            recent.map((t) => (
              <View key={`${t.kind}-${t.id}`} style={styles.txRow}>
                <View style={styles.flexShrink}>
                  <Text style={[styles.txLabel, { color: palette.textPrimary }]} numberOfLines={1}>
                    {t.label}
                  </Text>
                  <Text style={[styles.txMeta, { color: palette.textTertiary }]}>
                    {format(t.date, 'dd MMM')} · {t.category}
                  </Text>
                </View>
                <Text
                  style={[
                    styles.txAmt,
                    { color: t.kind === 'credit' ? palette.success : palette.textPrimary },
                  ]}
                >
                  {formatSignedCurrency(t.amount, t.kind)}
                </Text>
              </View>
            ))
          )}
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center' },
  flexShrink: { flexShrink: 1, flex: 1 },
  scroll: { padding: spacing.md, gap: spacing.md, paddingBottom: spacing.xxxl },
  banner: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md },
  bannerText: { fontWeight: '600', flexShrink: 1 },
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  navBtn: { padding: spacing.xs },
  navGlyph: { fontSize: fontSize.lg, fontWeight: '700' },
  monthLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6, minWidth: 140, justifyContent: 'center' },
  monthLabel: { fontSize: fontSize.lg, fontWeight: '700' },
  todayBtn: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: radius.full },
  todayText: { color: '#fff', fontWeight: '700', fontSize: fontSize.xs },
  kpiRow: { flexDirection: 'row', gap: spacing.md },
  deficitCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md },
  deficitTitle: { fontSize: fontSize.lg, fontWeight: '700' },
  deficitSub: { fontSize: fontSize.sm, marginTop: 2 },
  section: { gap: spacing.sm },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sectionTitle: { fontSize: fontSize.lg, fontWeight: '700' },
  link: { fontWeight: '600', fontSize: fontSize.sm },
  empty: { fontSize: fontSize.md, paddingVertical: spacing.md },
  catRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xs },
  dot: { width: 10, height: 10, borderRadius: 5 },
  catName: { flex: 1, fontSize: fontSize.md, fontWeight: '600' },
  catPct: { fontSize: fontSize.sm, width: 40, textAlign: 'right' },
  catAmt: { fontSize: fontSize.md, fontWeight: '700', width: 90, textAlign: 'right' },
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  txLabel: { fontSize: fontSize.md, fontWeight: '600' },
  txMeta: { fontSize: fontSize.xs, marginTop: 2 },
  txAmt: { fontSize: fontSize.md, fontWeight: '700' },
});
