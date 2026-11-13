import React, { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { format } from 'date-fns';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card } from '@/components/Card';
import { DonutChart } from '@/components/DonutChart';
import { useDashboardData } from '@/hooks/useDashboardData';
import { useTheme } from '@/context/ThemeContext';
import { PieIcon } from '@/components/FinanceIcons';
import { fontSize, radius, spacing } from '@/theme';
import { formatCurrency } from '@/utils/format';

type Scope = 'month' | 'all';

export default function AnalyticsScreen() {
  const { palette, categoryColors } = useTheme();
  const d = useDashboardData();
  const [scope, setScope] = useState<Scope>('all');

  const analysis = scope === 'month' ? d.monthCategoryAnalysis : d.allTimeCategoryAnalysis;
  const total = scope === 'month' ? d.monthTotal : d.totalAllTime;
  const monthLabel = format(new Date(d.selectedYear, d.selectedMonth), 'MMMM yyyy');

  const slices = analysis.map((c, i) => ({
    label: c.category,
    value: c.amount,
    color: categoryColors[i % categoryColors.length],
  }));

  if (d.loading) {
    return (
      <SafeAreaView style={[styles.flex, styles.center, { backgroundColor: palette.screenBg }]}>
        <ActivityIndicator size="large" color={palette.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: palette.screenBg }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.titleRow}>
          <PieIcon size={18} color={palette.primary} />
          <Text style={[styles.title, { color: palette.textPrimary }]}>Expense Allocation</Text>
        </View>

        <View style={[styles.toggle, { backgroundColor: palette.cardBg, borderColor: palette.cardBorder }]}>
          {(
            [
              ['all', 'Total Expenses'],
              ['month', 'Monthly Expenses'],
            ] as [Scope, string][]
          ).map(([value, label]) => {
            const active = scope === value;
            return (
              <Pressable
                key={value}
                onPress={() => setScope(value)}
                style={[
                  styles.toggleBtn,
                  active && { backgroundColor: palette.primary, borderRadius: radius.sm },
                ]}
              >
                <Text
                  style={{
                    color: active ? '#fff' : palette.textSecondary,
                    fontWeight: '600',
                    fontSize: fontSize.sm,
                  }}
                >
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Card style={styles.chartCard}>
          {slices.length === 0 ? (
            <View style={styles.emptyWrap}>
              <Text style={[styles.emptyTitle, { color: palette.textSecondary }]}>
                Nothing to chart yet
              </Text>
              <Text style={[styles.emptyBody, { color: palette.textTertiary }]}>
                {scope === 'month'
                  ? `No spending recorded for ${monthLabel}.`
                  : 'Add an expense or import a statement to see your allocation.'}
              </Text>
            </View>
          ) : (
            <>
              <DonutChart
                slices={slices}
                total={total}
                centerCaption={scope === 'month' ? monthLabel.toUpperCase() : 'ALL TIME'}
              />
              <View style={styles.legend}>
                {analysis.map((c, i) => (
                  <View key={c.category} style={styles.legendRow}>
                    <View
                      style={[
                        styles.dot,
                        { backgroundColor: categoryColors[i % categoryColors.length] },
                      ]}
                    />
                    <Text
                      style={[styles.legendName, { color: palette.textPrimary }]}
                      numberOfLines={1}
                    >
                      {c.category}
                    </Text>
                    <Text style={[styles.legendPct, { color: palette.textTertiary }]}>
                      {c.percentage.toFixed(1)}%
                    </Text>
                    <Text style={[styles.legendAmt, { color: palette.textPrimary }]}>
                      {formatCurrency(c.amount)}
                    </Text>
                  </View>
                ))}
              </View>
            </>
          )}
        </Card>

        <Card style={styles.statsCard}>
          <View style={styles.statRow}>
            <Text style={[styles.statLabel, { color: palette.textSecondary }]}>TRANSACTIONS</Text>
            <Text style={[styles.statValue, { color: palette.textPrimary }]}>
              {scope === 'month' ? d.monthExpenses.length : d.expenses.length}
            </Text>
          </View>
          <View style={styles.statRow}>
            <Text style={[styles.statLabel, { color: palette.textSecondary }]}>TOP CATEGORY</Text>
            <Text style={[styles.statValue, { color: palette.textPrimary }]} numberOfLines={1}>
              {analysis[0]?.category ?? '—'}
            </Text>
          </View>
          <View style={styles.statRow}>
            <Text style={[styles.statLabel, { color: palette.textSecondary }]}>MONTHLY AVG</Text>
            <Text style={[styles.statValue, { color: palette.textPrimary }]}>
              {formatCurrency(Math.round(d.financeTotals.calendarMonthAverage))}
            </Text>
          </View>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center' },
  scroll: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxxl },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  title: { fontSize: fontSize.xl, fontWeight: '700' },
  toggle: {
    flexDirection: 'row',
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 3,
  },
  toggleBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.sm },
  chartCard: { alignItems: 'center', gap: spacing.lg },
  legend: { alignSelf: 'stretch', gap: spacing.xs },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  dot: { width: 10, height: 10, borderRadius: 5 },
  legendName: { flex: 1, fontSize: fontSize.md, fontWeight: '600' },
  legendPct: { fontSize: fontSize.sm, width: 52, textAlign: 'right' },
  legendAmt: { fontSize: fontSize.md, fontWeight: '700', width: 92, textAlign: 'right' },
  statsCard: { gap: spacing.md },
  statRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  statLabel: { fontSize: fontSize.xs, fontWeight: '700', letterSpacing: 0.6 },
  statValue: { fontSize: fontSize.lg, fontWeight: '700', flexShrink: 1, textAlign: 'right' },
  emptyWrap: { alignItems: 'center', paddingVertical: spacing.xxxl, gap: spacing.xs },
  emptyTitle: { fontSize: fontSize.lg, fontWeight: '600' },
  emptyBody: { fontSize: fontSize.md, textAlign: 'center' },
});
