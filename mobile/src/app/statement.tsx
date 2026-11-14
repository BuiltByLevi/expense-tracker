import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { format } from 'date-fns';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Card, GlassPage, PageHeader } from '@/components/Card';
import { ClockIcon } from '@/components/FinanceIcons';
import { MonthNav } from '@/components/MonthNav';
import { useTheme } from '@/context/ThemeContext';
import { useTransactionLedgerLogic } from '@/hooks/useTransactionLedgerLogic';

const inr = (n: number) => `₹${n.toLocaleString('en-IN')}`;
const COLS = { date: 110, desc: 220, debit: 100, credit: 100, balance: 110 };

/** Port of Dashboard/TransactionLedgerPageWeb — ledger with running balance. */
export default function StatementScreen() {
  const { palette } = useTheme();
  const router = useRouter();
  const l = useTransactionLedgerLogic();
  const monthName = format(new Date(l.selectedYear, l.selectedMonth), 'MMMM yyyy');

  const th = (label: string, width: number, right = false) => (
    <Text style={[styles.th, { width, textAlign: right ? 'right' : 'left', color: palette.textSecondary }]}>{label}</Text>
  );

  return (
    <GlassPage>
      <PageHeader title="Account Statement" subtitle="Ledger with running balance." onBack={() => router.back()} />

      <Card style={styles.navCard}>
        <MonthNav
          large
          year={l.selectedYear}
          month={l.selectedMonth}
          currentYear={l.currentYear}
          currentMonth={l.currentMonth}
          onPrev={l.goToPreviousMonth}
          onNext={l.goToNextMonth}
          onToday={l.goToCurrentMonth}
          onSelect={l.goToMonth}
        />
      </Card>

      {l.isFutureMonth ? (
        <Card style={[styles.future, { backgroundColor: 'rgba(245, 158, 11, 0.1)', borderColor: `${palette.warning}4D` }]}>
          <View style={styles.futureRow}>
            <ClockIcon size={13} color={palette.warning} />
            <Text style={[styles.futureTitle, { color: palette.textPrimary }]}>Future Month</Text>
          </View>
          <Text style={[styles.futureBody, { color: palette.textSecondary }]}>Salary credits are not predicted.</Text>
        </Card>
      ) : null}

      <View style={styles.totals}>
        <Card style={[styles.total, { borderLeftWidth: 3, borderLeftColor: palette.success }]}>
          <Text style={[styles.totalLabel, { color: palette.textSecondary }]}>TOTAL CREDITS</Text>
          <Text style={[styles.totalValue, { color: palette.success }]} numberOfLines={1} adjustsFontSizeToFit>
            {l.isFutureMonth ? '—' : `+${inr(l.totalCredit)}`}
          </Text>
        </Card>
        <Card style={[styles.total, { borderLeftWidth: 3, borderLeftColor: palette.danger }]}>
          <Text style={[styles.totalLabel, { color: palette.textSecondary }]}>TOTAL DEBITS</Text>
          <Text style={[styles.totalValue, { color: palette.danger }]} numberOfLines={1} adjustsFontSizeToFit>
            -{inr(l.totalDebit)}
          </Text>
        </Card>
        <LinearGradient
          colors={palette.primaryGradient as unknown as [string, string]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.total, styles.balance]}
        >
          <Text style={[styles.totalLabel, { color: 'rgba(255,255,255,0.8)' }]}>BALANCE</Text>
          <Text style={[styles.totalValue, { color: '#ffffff' }]} numberOfLines={1} adjustsFontSizeToFit>
            ₹{l.isFutureMonth ? l.totalDebit : l.closingBalance.toLocaleString('en-IN')}
          </Text>
        </LinearGradient>
      </View>

      {l.ledger.length === 0 ? (
        <Card style={styles.empty}>
          <Text style={{ color: palette.textSecondary, textAlign: 'center' }}>No transactions for {monthName}.</Text>
        </Card>
      ) : (
        <Card style={styles.tableCard}>
          <ScrollView horizontal>
            <View>
              <View style={[styles.tr, styles.thead, { borderBottomColor: `${palette.primary}33` }]}>
                {th('DATE', COLS.date)}
                {th('DESCRIPTION', COLS.desc)}
                {th('DEBIT', COLS.debit, true)}
                {th('CREDIT', COLS.credit, true)}
                {th('BALANCE', COLS.balance, true)}
              </View>
              {l.ledger.map((e) => (
                <View key={e.id} style={[styles.tr, styles.row]}>
                  <Text style={[styles.td, { width: COLS.date, color: palette.textSecondary }]}>
                    {format(e.date, 'dd MMM yyyy')}
                  </Text>
                  <View style={{ width: COLS.desc }}>
                    <Text style={[styles.desc, { color: palette.textPrimary }]} numberOfLines={2}>
                      {e.description}
                    </Text>
                    <Text style={[styles.cat, { color: palette.textTertiary }]}>{e.category}</Text>
                  </View>
                  <Text style={[styles.td, styles.amt, { width: COLS.debit, color: palette.danger }]}>
                    {e.type === 'debit' ? `-${inr(e.amount)}` : ''}
                  </Text>
                  <Text style={[styles.td, styles.amt, { width: COLS.credit, color: palette.success }]}>
                    {e.type === 'credit' ? `+${inr(e.amount)}` : ''}
                  </Text>
                  <Text style={[styles.td, styles.amt, { width: COLS.balance, color: palette.textPrimary, fontWeight: '700' }]}>
                    {inr(e.runningBalance)}
                  </Text>
                </View>
              ))}
            </View>
          </ScrollView>
        </Card>
      )}
    </GlassPage>
  );
}

const styles = StyleSheet.create({
  navCard: { padding: 12 },
  future: { padding: 12 },
  futureRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  futureTitle: { fontSize: 12, fontWeight: '700' },
  futureBody: { fontSize: 11, marginTop: 2 },
  totals: { flexDirection: 'row', gap: 8 },
  total: { flex: 1, padding: 12, minWidth: 0 },
  balance: { borderRadius: 20 },
  totalLabel: { fontSize: 11, fontWeight: '600' },
  totalValue: { fontSize: 18, fontWeight: '700', marginTop: 4 },
  empty: { padding: 40 },
  tableCard: { padding: 0, overflow: 'hidden' },
  tr: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingHorizontal: 20 },
  thead: { paddingVertical: 16, borderBottomWidth: 2, backgroundColor: 'rgba(0,0,0,0.02)' },
  th: { fontSize: 11, fontWeight: '600' },
  row: { paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.04)' },
  td: { fontSize: 14 },
  desc: { fontSize: 14, fontWeight: '600' },
  cat: { fontSize: 11 },
  amt: { textAlign: 'right', fontWeight: '600', fontVariant: ['tabular-nums'] },
});
