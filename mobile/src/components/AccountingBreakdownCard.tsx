import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { breakdownForPeriod, type AccountingPeriod, type MonthlyBreakdown } from '@shared/accounting';
import { accountingStrings, type AccountingKey } from '@shared/i18n/accountingStrings';
import type { Expense, Income } from '@shared/types';
import { Card } from '@/components/Card';
import { useTheme } from '@/context/useTheme';
import { fontSize, radius, spacing } from '@/theme';
import { formatCurrency } from '@/utils/format';

interface Props {
  expenses: Expense[];
  income: Income[];
  year: number;
  month: number;
  dashboardEarnings: number;
  dashboardNetCashFlow: number;
}

const SAME = 0.005;

/**
 * The seven accounting figures for the selected month or year, computed by
 * shared/accounting. This card only lays them out. Expo has no language
 * setting yet, so it uses English from the shared dictionary.
 */
export function AccountingBreakdownCard({ expenses, income, year, month, dashboardEarnings, dashboardNetCashFlow }: Props) {
  const { palette } = useTheme();
  const s = accountingStrings('en');
  const [view, setView] = useState<'month' | 'year'>('month');

  const b: MonthlyBreakdown = useMemo(() => {
    const period: AccountingPeriod = view === 'month' ? { kind: 'month', year, month } : { kind: 'year', year };
    return breakdownForPeriod(expenses, income, period);
  }, [expenses, income, view, year, month]);

  const differs =
    view === 'month' &&
    (Math.abs(b.monthlyEarnings - dashboardEarnings) > SAME || Math.abs(b.netCashFlow - dashboardNetCashFlow) > SAME);

  const row = (label: AccountingKey, value: number, hint: AccountingKey, emphasis = false) => (
    <View key={label} style={[styles.row, { borderBottomColor: palette.cardBorder }]}>
      <View style={styles.flex}>
        <Text style={[styles.label, { color: palette.textPrimary, fontWeight: emphasis ? '700' : '600' }]}>{s[label]}</Text>
        <Text style={[styles.hint, { color: palette.textSecondary }]}>{s[hint]}</Text>
      </View>
      <Text style={[styles.value, { color: palette.textPrimary }]}>{formatCurrency(value)}</Text>
    </View>
  );

  const heading = (text: string) => (
    <Text style={[styles.heading, { color: palette.primary }]}>{text.toUpperCase()}</Text>
  );

  const seg = (key: 'month' | 'year', label: string) => {
    const active = view === key;
    return (
      <Pressable
        key={key}
        onPress={() => setView(key)}
        accessibilityRole="button"
        accessibilityState={{ selected: active }}
        style={[styles.seg, { backgroundColor: active ? palette.primary : 'transparent' }]}
      >
        <Text style={{ color: active ? '#fff' : palette.textSecondary, fontWeight: '700', fontSize: fontSize.xs }}>{label}</Text>
      </Pressable>
    );
  };

  return (
    <Card style={styles.card}>
      <View style={styles.titleRow}>
        <Text style={[styles.title, { color: palette.textPrimary }]}>{s.title}</Text>
        <View style={[styles.segWrap, { backgroundColor: palette.cardBorder }]}>
          {seg('month', s.monthly)}
          {seg('year', s.yearly)}
        </View>
      </View>

      {heading(s.sectionEarnings)}
      {row('earnings', b.monthlyEarnings, 'earningsHint', true)}
      {row('refunds', b.refunds, 'refundsHint')}
      {row('transfersIn', b.transfersIn, 'transfersInHint')}

      {heading(s.sectionSpending)}
      {row('expenses', b.monthlyExpenses, 'expensesHint', true)}
      {row('netCashFlow', b.netCashFlow, 'netCashFlowHint', true)}

      {heading(s.sectionExcluded)}
      {row('cashWithdrawals', b.cashWithdrawals, 'cashWithdrawalsHint')}
      {row('transfersOut', b.transfersOut, 'transfersOutHint')}
      {row('investments', b.investments, 'investmentsHint')}

      <View style={styles.bankRow}>
        <View style={styles.flex}>
          <Text style={[styles.label, { color: palette.textPrimary }]}>{s.bankMovement}</Text>
          <Text style={[styles.hint, { color: palette.textSecondary }]}>{s.bankMovementHint}</Text>
        </View>
        <Text style={[styles.value, { color: palette.textPrimary }]}>{formatCurrency(b.bankNetChange)}</Text>
      </View>

      {view === 'year' ? <Text style={[styles.note, { color: palette.textTertiary }]}>{s.yearNote}</Text> : null}
      {differs ? <Text style={[styles.note, { color: palette.warning, fontWeight: '600' }]}>{s.manualDiffers}</Text> : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.xs },
  flex: { flex: 1, minWidth: 0 },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm, flexWrap: 'wrap' },
  title: { fontSize: fontSize.md, fontWeight: '700' },
  segWrap: { flexDirection: 'row', borderRadius: radius.md, padding: 3, gap: 3 },
  seg: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: radius.md },
  heading: { fontSize: fontSize.xs, fontWeight: '700', marginTop: spacing.sm, letterSpacing: 0.4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.sm, borderBottomWidth: StyleSheet.hairlineWidth },
  label: { fontSize: fontSize.sm },
  hint: { fontSize: fontSize.xs, marginTop: 2, lineHeight: 16 },
  value: { fontSize: fontSize.md, fontWeight: '700' },
  bankRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingTop: spacing.md },
  note: { fontSize: fontSize.xs, marginTop: spacing.sm },
});
