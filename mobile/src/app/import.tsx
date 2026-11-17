import React, { useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { format } from 'date-fns';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card } from '@/components/Card';
import { useStatementImport } from '@/hooks/useStatementImport';
import { useDashboardMonth } from '@/context/DashboardMonthContext';
import { useTheme } from '@/context/useTheme';
import { BankIcon } from '@/components/FinanceIcons';
import { fontSize, radius, spacing } from '@/theme';
import { formatCurrency } from '@/utils/format';
import { needsCategory, needsConfirmation, needsDirection } from '@shared/statementReview';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '@shared/types';

export default function ImportScreen() {
  const { palette } = useTheme();
  const router = useRouter();
  const imp = useStatementImport();
  const { goToMonth } = useDashboardMonth();
  // The row whose category is being chosen in the picker sheet.
  const [pickerRowId, setPickerRowId] = useState<string | null>(null);
  const pickerRow = imp.rows.find((r) => r.rowId === pickerRowId) ?? null;
  const pickerOptions: readonly string[] = pickerRow?.type === 'credit' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  const close = () => router.back();

  // Jumps the Dashboard tab to the statement's month before leaving this
  // modal — the two screens are separate routes, so without this the
  // Dashboard stays on whatever month it was already showing and the
  // just-imported transactions (debits and credits alike) appear to be
  // missing whenever the statement isn't for the currently-viewed month.
  const closeToImportedMonth = () => {
    if (imp.statementPeriod.end) {
      goToMonth(imp.statementPeriod.end.getFullYear(), imp.statementPeriod.end.getMonth());
    }
    close();
  };

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: palette.screenBg }]} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <View style={styles.flexShrink}>
          <View style={styles.titleRow}>
            <BankIcon size={18} color={palette.primary} />
            <Text style={[styles.title, { color: palette.textPrimary }]}>Import Statement</Text>
          </View>
          {imp.fileName ? (
            <Text style={[styles.sub, { color: palette.textSecondary }]} numberOfLines={1}>
              {imp.fileName}
            </Text>
          ) : null}
        </View>
        <Pressable onPress={imp.status === 'done' ? closeToImportedMonth : close} hitSlop={12}>
          <Text style={{ color: palette.primary, fontWeight: '700', fontSize: fontSize.md }}>
            Close
          </Text>
        </Pressable>
      </View>

      {/* IDLE — format guidance + picker */}
      {imp.status === 'idle' && (
        <View style={styles.body}>
          <Card style={styles.card}>
            <Text style={[styles.cardTitle, { color: palette.textPrimary }]}>
              Choose a bank statement
            </Text>
            <Text style={[styles.cardBody, { color: palette.textSecondary }]}>
              Transactions are parsed on your device, categorised automatically, and shown for
              review before anything is saved.
            </Text>
            <View style={styles.formatRow}>
              <View style={[styles.badge, { backgroundColor: palette.successLight }]}>
                <Text style={[styles.badgeText, { color: palette.success }]}>CSV ✓</Text>
              </View>
              <View style={[styles.badge, { backgroundColor: palette.successLight }]}>
                <Text style={[styles.badgeText, { color: palette.success }]}>XLS / XLSX ✓</Text>
              </View>
              <View style={[styles.badge, { backgroundColor: palette.warningLight }]}>
                <Text style={[styles.badgeText, { color: palette.warning }]}>PDF — web only</Text>
              </View>
            </View>
            <Pressable onPress={imp.pickAndParse} style={styles.ctaWrap}>
              <LinearGradient
                colors={palette.primaryGradient as unknown as [string, string]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.cta}
              >
                <Text style={styles.ctaText}>Select File</Text>
              </LinearGradient>
            </Pressable>
          </Card>
        </View>
      )}

      {imp.status === 'parsing' && (
        <View style={[styles.body, styles.center]}>
          <ActivityIndicator size="large" color={palette.primary} />
          <Text style={[styles.sub, { color: palette.textSecondary, marginTop: spacing.md }]}>
            Reading and parsing your statement…
          </Text>
        </View>
      )}

      {imp.status === 'error' && (
        <View style={styles.body}>
          <Card style={{ ...styles.card, backgroundColor: palette.dangerLight }}>
            <Text style={[styles.cardTitle, { color: palette.danger }]}>Import failed</Text>
            <Text style={[styles.cardBody, { color: palette.textSecondary }]}>
              {imp.errorMessage}
            </Text>
            <Pressable
              onPress={imp.reset}
              style={[styles.secondary, { borderColor: palette.danger }]}
            >
              <Text style={{ color: palette.danger, fontWeight: '700' }}>Try another file</Text>
            </Pressable>
          </Card>
        </View>
      )}

      {/* REVIEW — mandatory before anything is written */}
      {imp.status === 'review' && (
        <>
          <Card style={styles.statsCard}>
            <View style={styles.statsRow}>
              <Text style={[styles.statsText, { color: palette.textSecondary }]}>
                {imp.stats.included} of {imp.stats.total} selected
              </Text>
              <View style={styles.bulkRow}>
                <Pressable onPress={() => imp.setAllIncluded(true)} hitSlop={8}>
                  <Text style={{ color: palette.primary, fontWeight: '600', fontSize: fontSize.sm }}>
                    All
                  </Text>
                </Pressable>
                <Pressable onPress={() => imp.setAllIncluded(false)} hitSlop={8}>
                  <Text style={{ color: palette.textSecondary, fontWeight: '600', fontSize: fontSize.sm }}>
                    None
                  </Text>
                </Pressable>
              </View>
            </View>
            <View style={styles.statsRow}>
              <Text style={[styles.statsText, { color: palette.success }]}>
                ↓ {formatCurrency(imp.stats.creditTotal)} credits
              </Text>
              <Text style={[styles.statsText, { color: palette.textPrimary }]}>
                ↑ {formatCurrency(imp.stats.debitTotal)} debits
              </Text>
            </View>
            {imp.stats.duplicates > 0 || imp.stats.uncertain > 0 || imp.stats.unassigned > 0 || imp.stats.undecided > 0 ? (
              <Text style={[styles.warn, { color: palette.warning }]}>
                {imp.stats.duplicates > 0 ? `${imp.stats.duplicates} possible duplicate(s) unselected. ` : ''}
                {imp.stats.undecided > 0 ? `${imp.stats.undecided} row(s) need money in or out. ` : ''}
                {imp.stats.unassigned > 0 ? `${imp.stats.unassigned} deposit(s) need a category. ` : ''}
                {imp.stats.uncertain > 0 ? `${imp.stats.uncertain} row(s) need a check.` : ''}
              </Text>
            ) : null}
          </Card>

          <FlatList
            data={imp.rows}
            keyExtractor={(r) => r.rowId}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => {
              const isCredit = item.type === 'credit';
              return (
                <Pressable
                  onPress={() => imp.toggleInclude(item.rowId)}
                  style={[
                    styles.row,
                    {
                      backgroundColor: palette.cardBg,
                      borderColor: item.included ? palette.primary : palette.cardBorder,
                      opacity: item.included ? 1 : 0.55,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.check,
                      {
                        backgroundColor: item.included ? palette.primary : 'transparent',
                        borderColor: item.included ? palette.primary : palette.textTertiary,
                      },
                    ]}
                  >
                    {item.included ? <Text style={styles.checkMark}>✓</Text> : null}
                  </View>

                  <View style={styles.flexShrink}>
                    <Text style={[styles.rowLabel, { color: palette.textPrimary }]} numberOfLines={2}>
                      {item.narration}
                    </Text>
                    <Text style={[styles.rowMeta, { color: palette.textTertiary }]}>
                      {item.date ? format(item.date, 'dd MMM yyyy') : 'No date'} · {item.category || 'No category'}
                    </Text>
                    {item.type !== null ? (
                      <Pressable onPress={() => setPickerRowId(item.rowId)} hitSlop={8}>
                        <Text style={[styles.catLink, { color: palette.primary }]}>Change category</Text>
                      </Pressable>
                    ) : null}
                    {needsDirection(item) ? (
                      <View style={styles.dirRow}>
                        <Pressable
                          onPress={() => imp.setRowType(item.rowId, 'credit')}
                          style={[styles.dirBtn, { borderColor: palette.cardBorder }]}
                        >
                          <Text style={[styles.dirText, { color: palette.success }]}>Money in</Text>
                        </Pressable>
                        <Pressable
                          onPress={() => imp.setRowType(item.rowId, 'debit')}
                          style={[styles.dirBtn, { borderColor: palette.cardBorder }]}
                        >
                          <Text style={[styles.dirText, { color: palette.textPrimary }]}>Money out</Text>
                        </Pressable>
                      </View>
                    ) : null}
                    {needsCategory(item) ? (
                      <Text style={[styles.flag, { color: palette.warning }]}>Choose a category — not imported yet</Text>
                    ) : null}
                    {needsConfirmation(item) ? (
                      <View>
                        <Text style={[styles.flag, { color: palette.warning }]}>
                          Looks like a transfer between your own accounts — not counted until you confirm it
                        </Text>
                        <Pressable onPress={() => imp.confirmRow(item.rowId)} hitSlop={8}>
                          <Text style={[styles.catLink, { color: palette.primary }]}>Confirm transfer</Text>
                        </Pressable>
                      </View>
                    ) : null}
                    {item.duplicateOf ? (
                      <Text style={[styles.flag, { color: palette.warning }]}>
                        Possible {item.duplicateConfidence} duplicate
                      </Text>
                    ) : null}
                    {item.parseIssue ? (
                      <Text style={[styles.flag, { color: palette.warning }]} numberOfLines={2}>
                        {item.parseIssue}
                      </Text>
                    ) : null}
                  </View>

                  <Text
                    style={[
                      styles.rowAmount,
                      { color: isCredit ? palette.success : palette.textPrimary },
                    ]}
                  >
                    {item.amount === null
                      ? '—'
                      : `${isCredit ? '+' : '-'}${formatCurrency(item.amount)}`}
                  </Text>
                </Pressable>
              );
            }}
          />

          <View style={[styles.footer, { borderTopColor: palette.cardBorder, backgroundColor: palette.screenBg }]}>
            <Pressable onPress={imp.reset} style={[styles.secondary, { borderColor: palette.cardBorder, flex: 1 }]}>
              <Text style={{ color: palette.textSecondary, fontWeight: '600' }}>Cancel</Text>
            </Pressable>
            <Pressable
              onPress={imp.confirmImport}
              disabled={imp.stats.included === 0}
              style={[styles.ctaWrap, { flex: 2, opacity: imp.stats.included === 0 ? 0.5 : 1 }]}
            >
              <LinearGradient
                colors={palette.primaryGradient as unknown as [string, string]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.cta}
              >
                <Text style={styles.ctaText}>Import {imp.stats.included}</Text>
              </LinearGradient>
            </Pressable>
          </View>
        </>
      )}

      <Modal
        visible={pickerRow !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setPickerRowId(null)}
      >
        <Pressable style={styles.backdrop} onPress={() => setPickerRowId(null)}>
          <Pressable
            style={[styles.sheet, { backgroundColor: palette.cardBg, borderColor: palette.cardBorder }]}
            onPress={() => undefined}
          >
            <Text style={[styles.cardTitle, { color: palette.textPrimary }]}>Category</Text>
            <Text style={[styles.sub, { color: palette.textSecondary }]} numberOfLines={2}>
              {pickerRow?.narration}
            </Text>
            <ScrollView style={styles.optionList}>
              {pickerOptions.map((option) => {
                const selected = pickerRow?.category === option;
                return (
                  <Pressable
                    key={option}
                    onPress={() => {
                      if (pickerRow) imp.updateCategory(pickerRow.rowId, option);
                      setPickerRowId(null);
                    }}
                    style={[styles.option, { borderBottomColor: palette.cardBorder }]}
                  >
                    <Text style={{ color: selected ? palette.primary : palette.textPrimary, fontWeight: selected ? '700' : '500' }}>
                      {option}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      {imp.status === 'importing' && (
        <View style={[styles.body, styles.center]}>
          <ActivityIndicator size="large" color={palette.primary} />
          <Text style={[styles.sub, { color: palette.textSecondary, marginTop: spacing.md }]}>
            Saving transactions…
          </Text>
        </View>
      )}

      {imp.status === 'done' && imp.summary && (
        <View style={styles.body}>
          <Card style={{ ...styles.card, backgroundColor: palette.successLight }}>
            <Text style={[styles.cardTitle, { color: palette.success }]}>Import complete</Text>
            <Text style={[styles.cardBody, { color: palette.textSecondary }]}>
              {imp.summary.expensesImported} expense(s) and {imp.summary.incomeImported} income
              entr{imp.summary.incomeImported === 1 ? 'y' : 'ies'} saved
              {imp.summary.skipped > 0 ? `, ${imp.summary.skipped} skipped` : ''}.
            </Text>
            <Pressable onPress={closeToImportedMonth} style={styles.ctaWrap}>
              <LinearGradient
                colors={palette.primaryGradient as unknown as [string, string]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.cta}
              >
                <Text style={styles.ctaText}>Back to Dashboard</Text>
              </LinearGradient>
            </Pressable>
          </Card>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  flexShrink: { flexShrink: 1, flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  title: { fontSize: fontSize.xl, fontWeight: '700' },
  sub: { fontSize: fontSize.sm, marginTop: 2 },
  body: { flex: 1, padding: spacing.lg },
  card: { gap: spacing.md },
  cardTitle: { fontSize: fontSize.lg, fontWeight: '700' },
  cardBody: { fontSize: fontSize.md, lineHeight: 20 },
  formatRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  badge: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: radius.full },
  badgeText: { fontSize: fontSize.xs, fontWeight: '700' },
  ctaWrap: { borderRadius: radius.md, overflow: 'hidden' },
  cta: { height: 50, alignItems: 'center', justifyContent: 'center' },
  ctaText: { color: '#fff', fontSize: fontSize.md, fontWeight: '700' },
  secondary: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 50,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  statsCard: { marginHorizontal: spacing.lg, gap: spacing.sm },
  statsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  statsText: { fontSize: fontSize.sm, fontWeight: '600' },
  bulkRow: { flexDirection: 'row', gap: spacing.lg },
  warn: { fontSize: fontSize.xs, fontWeight: '600' },
  listContent: { padding: spacing.lg, gap: spacing.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  check: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  checkMark: { color: '#fff', fontSize: 13, fontWeight: '700' },
  rowLabel: { fontSize: fontSize.sm, fontWeight: '600' },
  rowMeta: { fontSize: fontSize.xs, marginTop: 2 },
  flag: { fontSize: fontSize.xs, marginTop: 2, fontWeight: '600' },
  rowAmount: { fontSize: fontSize.md, fontWeight: '700' },
  catLink: { fontSize: fontSize.xs, fontWeight: '700', marginTop: 4 },
  dirRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs },
  dirBtn: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: radius.full, borderWidth: StyleSheet.hairlineWidth },
  dirText: { fontSize: fontSize.xs, fontWeight: '700' },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: { maxHeight: '70%', borderTopLeftRadius: radius.md, borderTopRightRadius: radius.md, borderWidth: StyleSheet.hairlineWidth, padding: spacing.lg, gap: spacing.sm },
  optionList: { marginTop: spacing.sm },
  option: { paddingVertical: spacing.md, borderBottomWidth: StyleSheet.hairlineWidth },
  footer: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
