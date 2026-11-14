import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { format } from 'date-fns';
import { ConfirmDialog } from '@/components/AppModal';
import { Btn, Input, Select } from '@/components/controls';
import { InboxIcon } from '@/components/FinanceIcons';
import { useTheme } from '@/context/ThemeContext';
import { EMPTY_STATE_QUOTES, getRandomQuote } from '@shared/quotes';
import { EXPENSE_CATEGORIES, type Expense, type Income } from '@shared/types';

/**
 * Port of ExpenseList/ExpenseList in its DESKTOP form: search + category
 * filter, then the six-column ledger (Date · Category · Particulars · Debit ·
 * Credit · Actions) with one fixed column template shared by header and
 * rows. On a phone the ledger keeps its desktop column widths and scrolls
 * sideways, the way the web table does in a narrow window.
 */
const COLS = { date: 90, category: 150, particulars: 220, debit: 110, credit: 110, actions: 132 };
const GAP = 14;

interface Row {
  id: string;
  date: Date;
  description: string;
  category: string;
  amount: number;
  kind: 'expense' | 'income';
  source: Expense | Income;
}

const CATEGORY_FILTER = ['All', ...EXPENSE_CATEGORIES] as const;

export const ExpenseList: React.FC<{
  expenses: Expense[];
  income?: Income[];
  onDelete: (id: string) => Promise<void>;
  onDeleteIncome?: (id: string) => Promise<void>;
  onEdit: (expense: Expense) => void;
  emptyStateLabel?: string;
}> = ({ expenses, income = [], onDelete, onDeleteIncome, onEdit, emptyStateLabel }) => {
  const { palette, categoryColors, incomeCategoryColors } = useTheme();
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('All');
  const [pendingDelete, setPendingDelete] = useState<Row | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [emptyQuote] = useState(() => getRandomQuote(EMPTY_STATE_QUOTES));

  const rows = useMemo<Row[]>(
    () =>
      [
        ...expenses.map((e): Row => ({ id: e.id, date: new Date(e.date), description: e.description, category: e.category, amount: e.amount, kind: 'expense', source: e })),
        ...income.map((i): Row => ({ id: i.id, date: new Date(i.date), description: i.description, category: i.category, amount: i.amount, kind: 'income', source: i })),
      ].sort((a, b) => b.date.getTime() - a.date.getTime()),
    [expenses, income]
  );

  const filtered = rows.filter((r) => {
    const q = search.toLowerCase();
    const matchesSearch =
      r.description.toLowerCase().includes(q) ||
      r.category.toLowerCase().includes(q) ||
      r.amount.toString().includes(search);
    return matchesSearch && (filterCategory === 'All' || r.category === filterCategory);
  });

  const colorFor = (r: Row) => {
    if (r.kind === 'income') return incomeCategoryColors[r.category] ?? palette.success;
    const idx = (EXPENSE_CATEGORIES as readonly string[]).indexOf(r.category);
    return categoryColors[(idx < 0 ? 0 : idx) % categoryColors.length];
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      if (pendingDelete.kind === 'income') await onDeleteIncome?.(pendingDelete.id);
      else await onDelete(pendingDelete.id);
      setPendingDelete(null);
    } finally {
      setDeleting(false);
    }
  };

  if (rows.length === 0) {
    return (
      <View style={styles.empty}>
        <InboxIcon size={36} color={palette.textTertiary} strokeWidth={1.5} />
        <Text style={[styles.emptyTitle, { color: palette.textSecondary }]}>
          {emptyStateLabel || 'No transactions yet for this month'}
        </Text>
        <Text style={[styles.emptyBody, { color: palette.textTertiary }]}>
          Add one with Quick Transaction, or import a bank statement.
        </Text>
        <Text style={[styles.emptyQuote, { color: palette.textTertiary }]}>“{emptyQuote.text}”</Text>
      </View>
    );
  }

  const headerCell = (label: string, width: number, right = false) => (
    <Text style={[styles.th, { width, color: palette.textSecondary, textAlign: right ? 'right' : 'left' }]}>
      {label.toUpperCase()}
    </Text>
  );

  return (
    <View>
      <View style={styles.filters}>
        <Input
          value={search}
          onChangeText={setSearch}
          placeholder="Search description, amount..."
          containerStyle={styles.search}
          style={styles.filterInput}
        />
        <Select
          value={filterCategory}
          options={CATEGORY_FILTER.map((c) => [c, c === 'All' ? 'All Categories' : c] as const)}
          onChange={setFilterCategory}
          title="Category"
          style={[styles.filterInput, styles.categorySelect]}
        />
      </View>

      {filtered.length === 0 ? (
        <Text style={[styles.noMatch, { color: palette.textSecondary }]}>
          No transactions found matching your search.
        </Text>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator>
          <View>
            <View style={[styles.tr, styles.thead, { borderBottomColor: `${palette.primary}33` }]}>
              {headerCell('Date', COLS.date)}
              {headerCell('Category', COLS.category)}
              {headerCell('Particulars', COLS.particulars)}
              {headerCell('Debit', COLS.debit, true)}
              {headerCell('Credit', COLS.credit, true)}
              {headerCell('Actions', COLS.actions, true)}
            </View>
            {filtered.map((r, idx) => {
              const isIncome = r.kind === 'income';
              const color = colorFor(r);
              return (
                <View
                  key={`${r.kind}-${r.id}`}
                  style={[
                    styles.tr,
                    styles.row,
                    {
                      borderBottomWidth: idx < filtered.length - 1 ? 1 : 0,
                      borderBottomColor: 'rgba(0,0,0,0.04)',
                      backgroundColor: isIncome ? `${palette.success}0A` : 'transparent',
                    },
                  ]}
                >
                  <Text style={[styles.dateCell, { width: COLS.date, color: palette.textSecondary }]}>
                    {format(r.date, 'dd MMM')}
                  </Text>
                  <View style={{ width: COLS.category }}>
                    <View style={[styles.chip, { backgroundColor: `${color}33` }]}>
                      <Text style={[styles.chipText, { color }]} numberOfLines={1}>
                        {r.category}
                      </Text>
                    </View>
                  </View>
                  <Text
                    style={[styles.particulars, { width: COLS.particulars, color: palette.textPrimary }]}
                    numberOfLines={1}
                  >
                    {r.description}
                  </Text>
                  <Text
                    style={[styles.amount, { width: COLS.debit, color: isIncome ? palette.textTertiary : palette.textPrimary }]}
                  >
                    {isIncome ? '—' : `₹${r.amount.toLocaleString('en-IN')}`}
                  </Text>
                  <Text
                    style={[styles.amount, { width: COLS.credit, color: isIncome ? palette.success : palette.textTertiary }]}
                  >
                    {isIncome ? `₹${r.amount.toLocaleString('en-IN')}` : '—'}
                  </Text>
                  <View style={[styles.actions, { width: COLS.actions }]}>
                    {isIncome ? (
                      onDeleteIncome ? (
                        <Btn variant="danger" size="xs" label="Delete" onPress={() => setPendingDelete(r)} />
                      ) : null
                    ) : (
                      <>
                        <Btn variant="ghost" size="xs" label="Edit" onPress={() => onEdit(r.source as Expense)} />
                        <Btn variant="danger" size="xs" label="Delete" onPress={() => setPendingDelete(r)} />
                      </>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        </ScrollView>
      )}

      <ConfirmDialog
        open={!!pendingDelete}
        danger
        busy={deleting}
        title={pendingDelete?.kind === 'income' ? 'Delete this income entry?' : 'Delete this expense?'}
        message={
          pendingDelete
            ? `"${pendingDelete.description.length > 60 ? pendingDelete.description.slice(0, 60) + '…' : pendingDelete.description}" will be permanently removed and all totals will update.`
            : ''
        }
        confirmLabel="Delete"
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  empty: { alignItems: 'center', paddingVertical: 36, paddingHorizontal: 20 },
  emptyTitle: { fontSize: 14, fontWeight: '600', marginTop: 12, textAlign: 'center' },
  emptyBody: { fontSize: 12, marginTop: 4, textAlign: 'center' },
  emptyQuote: { fontSize: 11, fontStyle: 'italic', marginTop: 14, opacity: 0.8, textAlign: 'center' },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  search: { flexGrow: 1, flexBasis: 180 },
  filterInput: { paddingVertical: 8, paddingHorizontal: 12, fontSize: 13, minHeight: 40 },
  categorySelect: { width: 170 },
  noMatch: { textAlign: 'center', padding: 40, fontSize: 13 },
  tr: { flexDirection: 'row', alignItems: 'center', gap: GAP, paddingHorizontal: 8 },
  thead: { paddingBottom: 10, borderBottomWidth: 2 },
  th: { fontSize: 10, fontWeight: '700', letterSpacing: 0.6 },
  row: { paddingVertical: 11 },
  dateCell: { fontSize: 13, fontWeight: '500', fontVariant: ['tabular-nums'] },
  chip: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, maxWidth: COLS.category },
  chipText: { fontSize: 11, fontWeight: '600' },
  particulars: { fontSize: 13, fontWeight: '500' },
  amount: { fontSize: 14, fontWeight: '700', textAlign: 'right', fontVariant: ['tabular-nums'] },
  actions: { flexDirection: 'row', gap: 6, justifyContent: 'flex-end' },
});
