import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { format } from 'date-fns';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/context/ThemeContext';
import { LedgerIcon } from '@/components/FinanceIcons';
import { useExpenses } from '@/context/ExpensesContext';
import { useIncome } from '@/context/IncomeContext';
import { QUICK_RANGE_OPTIONS, filterByDateRange, type DateRange } from '@shared/dateRangePresets';
import { fontSize, radius, spacing } from '@/theme';
import { formatSignedCurrency } from '@/utils/format';

type Row = {
  kind: 'debit' | 'credit';
  id: string;
  date: Date;
  label: string;
  category: string;
  amount: number;
};

export default function TransactionsScreen() {
  const { palette } = useTheme();
  const { expenses, loading: expLoading, refresh: refreshExp, deleteExpense } = useExpenses();
  const { income, loading: incLoading, refresh: refreshInc, deleteIncome } = useIncome();

  const [search, setSearch] = useState('');
  const [range, setRange] = useState<DateRange | null>(null);
  const [activePreset, setActivePreset] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const rows = useMemo<Row[]>(() => {
    const scopedExpenses = range ? filterByDateRange(expenses, range) : expenses;
    const scopedIncome = range ? filterByDateRange(income, range) : income;

    const merged: Row[] = [
      ...scopedExpenses.map((e) => ({
        kind: 'debit' as const,
        id: e.id,
        date: e.date,
        label: e.description || 'No description',
        category: e.category,
        amount: e.amount,
      })),
      ...scopedIncome.map((i) => ({
        kind: 'credit' as const,
        id: i.id,
        date: i.date,
        label: i.description || 'No description',
        category: i.category,
        amount: i.amount,
      })),
    ];

    const q = search.trim().toLowerCase();
    const filtered = q
      ? merged.filter(
          (r) =>
            r.label.toLowerCase().includes(q) ||
            r.category.toLowerCase().includes(q) ||
            String(r.amount).includes(q)
        )
      : merged;

    return filtered.sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [expenses, income, range, search]);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([refreshExp(), refreshInc()]);
    } finally {
      setRefreshing(false);
    }
  };

  const confirmDelete = (row: Row) => {
    Alert.alert(
      'Delete transaction?',
      `${row.label} · ${formatSignedCurrency(row.amount, row.kind)}\n\nThis cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              if (row.kind === 'debit') await deleteExpense(row.id);
              else await deleteIncome(row.id);
            } catch {
              Alert.alert('Could not delete', 'Please check your connection and try again.');
            }
          },
        },
      ]
    );
  };

  /** Tapping the active chip clears the filter, so there is always a way back
   *  to "everything" without a separate reset control. */
  const applyPreset = (key: string, build: (now: Date) => DateRange) => {
    if (activePreset === key) {
      setActivePreset(null);
      setRange(null);
    } else {
      setActivePreset(key);
      setRange(build(new Date()));
    }
  };

  if (expLoading || incLoading) {
    return (
      <SafeAreaView style={[styles.flex, styles.center, { backgroundColor: palette.screenBg }]}>
        <ActivityIndicator size="large" color={palette.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: palette.screenBg }]} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <LedgerIcon size={18} color={palette.primary} />
          <Text style={[styles.title, { color: palette.textPrimary }]}>Account Statement</Text>
        </View>
        <Text style={[styles.count, { color: palette.textSecondary }]}>
          {rows.length} {rows.length === 1 ? 'entry' : 'entries'}
        </Text>
      </View>

      <TextInput
        value={search}
        onChangeText={setSearch}
        placeholder="Search description, category, amount…"
        placeholderTextColor={palette.textTertiary}
        style={[
          styles.search,
          { color: palette.textPrimary, backgroundColor: palette.cardBg, borderColor: palette.cardBorder },
        ]}
        returnKeyType="search"
        clearButtonMode="while-editing"
      />

      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        data={QUICK_RANGE_OPTIONS}
        keyExtractor={(o) => o.key}
        contentContainerStyle={styles.chipRow}
        style={styles.chipList}
        renderItem={({ item }) => {
          const active = activePreset === item.key;
          return (
            <Pressable
              onPress={() => applyPreset(item.key, item.range)}
              style={[
                styles.chip,
                {
                  backgroundColor: active ? palette.primary : palette.cardBg,
                  borderColor: active ? palette.primary : palette.cardBorder,
                },
              ]}
            >
              <Text
                style={{
                  color: active ? '#fff' : palette.textSecondary,
                  fontSize: fontSize.sm,
                  fontWeight: '600',
                }}
              >
                {item.label}
              </Text>
            </Pressable>
          );
        }}
      />

      <FlatList
        data={rows}
        keyExtractor={(r) => `${r.kind}-${r.id}`}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={palette.primary} />
        }
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Text style={[styles.emptyTitle, { color: palette.textSecondary }]}>
              No transactions found
            </Text>
            <Text style={[styles.emptyBody, { color: palette.textTertiary }]}>
              {search || range
                ? 'Try clearing the search or date filter.'
                : 'Add one from the Add tab, or import a bank statement.'}
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <Pressable
            onLongPress={() => confirmDelete(item)}
            delayLongPress={400}
            style={({ pressed }) => [
              styles.row,
              {
                backgroundColor: pressed ? palette.pastelBlue : palette.cardBg,
                borderColor: palette.cardBorder,
              },
            ]}
          >
            <View style={styles.rowMain}>
              <Text style={[styles.rowLabel, { color: palette.textPrimary }]} numberOfLines={1}>
                {item.label}
              </Text>
              <Text style={[styles.rowMeta, { color: palette.textTertiary }]} numberOfLines={1}>
                {format(item.date, 'dd MMM yyyy')} · {item.category}
              </Text>
            </View>
            <Text
              style={[
                styles.rowAmount,
                { color: item.kind === 'credit' ? palette.success : palette.textPrimary },
              ]}
            >
              {formatSignedCurrency(item.amount, item.kind)}
            </Text>
          </Pressable>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 7, flexShrink: 1 },
  title: { fontSize: fontSize.xl, fontWeight: '700' },
  count: { fontSize: fontSize.sm },
  search: {
    height: 46,
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.lg,
    fontSize: fontSize.md,
  },
  chipList: { flexGrow: 0, marginTop: spacing.md },
  chipRow: { paddingHorizontal: spacing.lg, gap: spacing.sm },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    borderWidth: StyleSheet.hairlineWidth,
  },
  listContent: { padding: spacing.lg, gap: spacing.sm, paddingBottom: spacing.xxxl },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  rowMain: { flexShrink: 1 },
  rowLabel: { fontSize: fontSize.md, fontWeight: '600' },
  rowMeta: { fontSize: fontSize.xs, marginTop: 2 },
  rowAmount: { fontSize: fontSize.md, fontWeight: '700' },
  emptyWrap: { alignItems: 'center', paddingVertical: spacing.xxxl * 2, gap: spacing.xs },
  emptyTitle: { fontSize: fontSize.lg, fontWeight: '600' },
  emptyBody: { fontSize: fontSize.md, textAlign: 'center' },
});
