import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { format } from 'date-fns';
import { AppModal, ModalHeader } from '@/components/AppModal';
import { useTheme } from '@/context/ThemeContext';
import type { computeFinanceTotals } from '@shared/finance';

type Totals = ReturnType<typeof computeFinanceTotals>;

/**
 * The "View Breakdown" modal from the desktop deficit banner: total earned /
 * spent / deficit-or-net summary, then the month-by-month table.
 */
export const FinancialHistoryModal: React.FC<{
  visible: boolean;
  onClose: () => void;
  totals: Totals;
  hasDeficit: boolean;
}> = ({ visible, onClose, totals, hasDeficit }) => {
  const { palette } = useTheme();
  const inr = (n: number) => `₹${n.toLocaleString('en-IN')}`;
  const summary = [
    { label: 'TOTAL EARNED', value: inr(totals.totalEarnings), color: palette.textPrimary },
    { label: 'TOTAL SPENT', value: inr(totals.totalSpent), color: palette.textPrimary },
    {
      label: hasDeficit ? 'DEFICIT' : 'NET POSITIVE',
      value: inr(hasDeficit ? totals.cashFlowDeficit : totals.cumulativeNetCashFlow),
      color: hasDeficit ? palette.danger : palette.success,
    },
  ];
  const th = (label: string, w: number, right = true) => (
    <Text style={[styles.th, { width: w, textAlign: right ? 'right' : 'left', color: palette.textSecondary }]}>{label}</Text>
  );

  return (
    <AppModal visible={visible} onClose={onClose} maxWidth={700}>
      <ModalHeader title="Financial History" subtitle="Month-by-month cash flow (per-month earnings)" onClose={onClose} />

      <View style={[styles.summary, { backgroundColor: `${palette.primary}0D` }]}>
        {summary.map((s) => (
          <View key={s.label} style={styles.summaryItem}>
            <Text style={[styles.summaryLabel, { color: palette.textSecondary }]}>{s.label}</Text>
            <Text style={[styles.summaryValue, { color: s.color }]} numberOfLines={1} adjustsFontSizeToFit>
              {s.value}
            </Text>
          </View>
        ))}
      </View>

      <ScrollView horizontal>
        <View>
          <View style={[styles.tr, { borderBottomWidth: 2, borderBottomColor: `${palette.primary}4D` }]}>
            {th('MONTH', 130, false)}
            {th('EARNED', 100)}
            {th('SPENT', 100)}
            {th('STATUS', 100)}
          </View>
          {totals.monthlySummaries.map((m) => {
            const deficit = m.debtAtEndOfMonth > 0;
            return (
              <View key={`${m.year}-${m.month}`} style={[styles.tr, { borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.05)' }]}>
                <Text style={[styles.td, { width: 130, fontWeight: '600', color: palette.textPrimary }]}>
                  {format(new Date(m.year, m.month), 'MMM yyyy')}
                  {m.earningsStatus === 'estimated' ? <Text style={{ fontSize: 10, color: palette.warning }}>  EST</Text> : null}
                  {m.earningsStatus === 'missing' ? <Text style={{ fontSize: 10, color: palette.textTertiary }}>  (default)</Text> : null}
                </Text>
                <Text style={[styles.td, styles.right, { width: 100, color: palette.textPrimary }]}>{inr(m.earnings)}</Text>
                <Text style={[styles.td, styles.right, { width: 100, color: palette.textPrimary }]}>{inr(m.spent)}</Text>
                <Text style={[styles.td, styles.right, { width: 100, fontWeight: '700', color: deficit ? palette.danger : palette.success }]}>
                  {deficit ? `-${inr(m.debtAtEndOfMonth)}` : `+${inr(m.savingsAtEndOfMonth)}`}
                </Text>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </AppModal>
  );
};

const styles = StyleSheet.create({
  summary: { flexDirection: 'row', gap: 12, marginBottom: 20, padding: 16, borderRadius: 12 },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryLabel: { fontSize: 11, fontWeight: '600' },
  summaryValue: { fontSize: 16, fontWeight: '700', marginTop: 4 },
  tr: { flexDirection: 'row', paddingHorizontal: 8 },
  th: { fontSize: 11, fontWeight: '600', paddingVertical: 10 },
  td: { fontSize: 13, paddingVertical: 10 },
  right: { textAlign: 'right' },
});
