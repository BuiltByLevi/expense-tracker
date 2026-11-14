import React, { useState } from 'react';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, type Expense, type Income } from '../../types';
import { format } from 'date-fns';
import { theme, categoryColors, incomeCategoryColors } from '../../styles/theme';
import { useIsMobile } from '../../hooks/useIsMobile';
import ConfirmDialog from '../common/ConfirmDialog';
import { InboxIcon } from '../common/FinanceIcons';
import { EMPTY_STATE_QUOTES, getRandomQuote } from '../../utils/quotes';

// One fixed template shared by the ledger header and every row. Fixed widths
// everywhere except Particulars, so the six columns line up across rows
// regardless of how many action buttons a row renders.
const LEDGER_COLUMNS = '90px 150px minmax(0, 1fr) 110px 110px 132px';
// Select mode prepends a checkbox column to the SAME template for header and rows.
const SELECT_COLUMNS = `24px ${LEDGER_COLUMNS}`;

interface ExpenseListProps {
  expenses: Expense[];
  onDelete: (id: string) => Promise<void>;
  onEdit: (expense: Expense) => void;
  /** Credit transactions for the same period — shown merged with expenses so
   *  imported income isn't invisible in the main transaction list. Read-only
   *  (editing isn't supported yet) but deletable via onDeleteIncome. */
  income?: Income[];
  onDeleteIncome?: (id: string) => Promise<void>;
  /** Opens the income editor — works for entries saved from a statement import too. */
  onEditIncome?: (income: Income) => void;
  /** Bulk category change for the selected rows; rows must all be debits or all credits. */
  onBulkCategory?: (kind: 'expense' | 'income', ids: string[], category: string) => Promise<void>;
  /** Shown when the list is empty — lets callers describe the active filter
   *  (a selected month vs. a custom date range) instead of a generic string. */
  emptyStateLabel?: string;
}

const categories = EXPENSE_CATEGORIES;

interface Row {
  id: string;
  date: Date;
  description: string;
  category: string;
  amount: number;
  kind: 'expense' | 'income';
  source: Expense | Income;
}

const ExpenseList: React.FC<ExpenseListProps> = ({ expenses, onDelete, onEdit, income = [], onDeleteIncome, onEditIncome, onBulkCategory, emptyStateLabel }) => {
  const isMobile = useIsMobile();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('All');
  const [pendingDelete, setPendingDelete] = useState<{ id: string; kind: 'expense' | 'income'; description: string } | null>(null);
  const [emptyQuote] = useState(() => getRandomQuote(EMPTY_STATE_QUOTES));
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkCategory, setBulkCategory] = useState('');
  const [bulkSaving, setBulkSaving] = useState(false);

  const rowKey = (row: Pick<Row, 'kind' | 'id'>) => `${row.kind}-${row.id}`;
  const toggleRow = (row: Row) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(rowKey(row))) next.delete(rowKey(row));
      else next.add(rowKey(row));
      return next;
    });
  const exitSelect = () => {
    setSelectMode(false);
    setSelected(new Set());
    setBulkCategory('');
  };

  const handleDelete = (row: Row) => {
    setPendingDelete({ id: row.id, kind: row.kind, description: row.description });
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    if (pendingDelete.kind === 'income') {
      if (onDeleteIncome) await onDeleteIncome(pendingDelete.id);
    } else {
      await onDelete(pendingDelete.id);
    }
    setPendingDelete(null);
  };

  const getCategoryColor = (category: string) => {
    const idx = (categories as readonly string[]).indexOf(category);
    return categoryColors[idx % categoryColors.length];
  };

  // Merge expenses and income into one chronological list — the main
  // transaction history should show every transaction, not just debits.
  const rows: Row[] = [
    ...expenses.map((e): Row => ({ id: e.id, date: new Date(e.date), description: e.description, category: e.category, amount: e.amount, kind: 'expense', source: e })),
    ...income.map((i): Row => ({ id: i.id, date: new Date(i.date), description: i.description, category: i.category, amount: i.amount, kind: 'income', source: i })),
  ].sort((a, b) => b.date.getTime() - a.date.getTime());

  // Filtering Logic
  const filteredRows = rows.filter(row => {
    const matchesSearch =
      row.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      row.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      row.amount.toString().includes(searchTerm);

    const matchesCategory = filterCategory === 'All' || row.category === filterCategory;

    return matchesSearch && matchesCategory;
  });

  // Selection is kept to rows still visible, so a filter change can't leave
  // hidden rows silently selected.
  const selectedRows = filteredRows.filter((r) => selected.has(rowKey(r)));
  const selectedKinds = new Set(selectedRows.map((r) => r.kind));
  const selectionKind = selectedKinds.size === 1 ? [...selectedKinds][0] : null;
  const bulkOptions: readonly string[] = selectionKind === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  const allVisibleSelected = filteredRows.length > 0 && selectedRows.length === filteredRows.length;

  const applyBulkCategory = async () => {
    if (!onBulkCategory || !selectionKind || !bulkCategory) return;
    setBulkSaving(true);
    try {
      await onBulkCategory(selectionKind, selectedRows.map((r) => r.id), bulkCategory);
      exitSelect();
    } finally {
      setBulkSaving(false);
    }
  };

  const checkbox = (row: Row) => (
    <input
      type="checkbox"
      aria-label={`Select ${row.description}`}
      checked={selected.has(rowKey(row))}
      onChange={() => toggleRow(row)}
      style={{ width: '16px', height: '16px', cursor: 'pointer' }}
    />
  );

  // Reset filters if list is empty
  if (rows.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '36px 20px', color: theme.colors.textTertiary }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '12px' }}>
          <InboxIcon size={36} color={theme.colors.textTertiary} strokeWidth={1.5} />
        </div>
        <p style={{ fontSize: '14px', fontWeight: 600, margin: 0, color: theme.colors.textSecondary }}>{emptyStateLabel || 'No transactions yet for this month'}</p>
        <p style={{ fontSize: '12px', margin: '4px 0 0 0' }}>Add one with Quick Transaction, or import a bank statement.</p>
        <p style={{ fontSize: '11px', fontStyle: 'italic', margin: '14px 0 0 0', opacity: 0.8 }}>“{emptyQuote.text}”</p>
      </div>
    );
  }

  return (
    <div>
      {/* Search and Filter Bar */}
      <div style={{
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        gap: '10px',
        marginBottom: '16px'
      }}>
        <input
          type="text"
          className="input"
          placeholder="Search description, amount..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ flex: '1 1 0%', minWidth: 0, padding: '8px 12px', fontSize: '13px' }}
        />
        <select
          className="input"
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          style={{ flex: isMobile ? '1 1 0%' : `0 0 170px`, width: isMobile ? '100%' : '170px', padding: '8px 12px', fontSize: '13px' }}
        >
          <option value="All">All Categories</option>
          {categories.map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
        {onBulkCategory && (
          <button
            onClick={() => (selectMode ? exitSelect() : setSelectMode(true))}
            className={selectMode ? 'btn btn-primary' : 'btn btn-ghost'}
            style={{ padding: '8px 14px', fontSize: '13px', flexShrink: 0 }}
          >
            {selectMode ? 'Done' : 'Select'}
          </button>
        )}
      </div>

      {selectMode && (
        <div style={{
          display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '10px', marginBottom: '14px',
          padding: '10px 12px', borderRadius: '12px', background: `rgba(${theme.colors.primaryRgb}, 0.06)`,
          border: `1px solid ${theme.colors.primary}20`,
        }}>
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 600, color: theme.colors.textSecondary, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={allVisibleSelected}
              onChange={() => setSelected(allVisibleSelected ? new Set() : new Set(filteredRows.map(rowKey)))}
              style={{ width: '16px', height: '16px' }}
            />
            {selectedRows.length} selected
          </label>
          {selectedRows.length > 0 && !selectionKind ? (
            <span style={{ fontSize: '12px', color: theme.colors.warning, fontWeight: 500 }}>
              Select only debits or only credits to change the category.
            </span>
          ) : (
            <>
              <select
                className="input"
                value={bulkCategory}
                onChange={(e) => setBulkCategory(e.target.value)}
                disabled={!selectionKind}
                aria-label="New category for selected transactions"
                style={{ width: 'auto', minWidth: '170px', padding: '8px 12px', fontSize: '13px' }}
              >
                <option value="">Change category to…</option>
                {bulkOptions.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
              </select>
              <button
                onClick={applyBulkCategory}
                disabled={!selectionKind || !bulkCategory || bulkSaving}
                className="btn btn-primary"
                style={{ padding: '8px 16px', fontSize: '13px' }}
              >
                {bulkSaving ? 'Updating…' : `Update ${selectedRows.length || ''}`.trim()}
              </button>
            </>
          )}
        </div>
      )}

      {/* List */}
      {filteredRows.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', color: theme.colors.textSecondary, fontSize: '13px' }}>
          No transactions found matching your search.
        </div>
      ) : isMobile ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {filteredRows.map(row => {
            const isIncome = row.kind === 'income';
            const color = isIncome ? (incomeCategoryColors[row.category] ?? theme.colors.success) : getCategoryColor(row.category);
            return (
              <div key={`${row.kind}-${row.id}`} style={{
                background: isIncome ? `rgba(${theme.colors.successRgb}, 0.06)` : 'rgba(255,255,255,0.6)', borderRadius: '14px', padding: '14px', border: '1px solid rgba(0,0,0,0.04)',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                    {selectMode && checkbox(row)}
                    <span style={{ background: `${color}20`, color, padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 600 }}>
                      {row.category}
                    </span>
                  </span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{
                      fontSize: '9px', fontWeight: 800, letterSpacing: '0.08em', padding: '2px 6px', borderRadius: '6px',
                      color: isIncome ? theme.colors.success : theme.colors.danger,
                      background: isIncome ? `rgba(${theme.colors.successRgb}, 0.12)` : 'rgba(239, 68, 68, 0.1)',
                    }}>
                      {isIncome ? 'CR' : 'DR'}
                    </span>
                    <span style={{ fontWeight: 700, fontSize: '16px', color: isIncome ? theme.colors.success : theme.colors.textPrimary, fontVariantNumeric: 'tabular-nums' }}>
                      {isIncome ? '+' : ''}₹{row.amount.toLocaleString('en-IN')}
                    </span>
                  </span>
                </div>
                <p style={{ fontSize: '13px', color: theme.colors.textSecondary, margin: '0 0 10px 0' }}>
                  {row.description}
                </p>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '11px', color: theme.colors.textTertiary }}>
                    {format(row.date, 'dd MMM yyyy')}
                  </span>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    {isIncome ? (
                      <>
                        {onEditIncome && <button onClick={() => onEditIncome(row.source as Income)} className="btn btn-ghost" style={{ padding: '6px 12px', fontSize: '11px' }}>Edit</button>}
                        {onDeleteIncome && <button onClick={() => handleDelete(row)} className="btn btn-danger" style={{ padding: '6px 12px', fontSize: '11px' }}>Delete</button>}
                      </>
                    ) : (
                      <>
                        <button onClick={() => onEdit(row.source as Expense)} className="btn btn-ghost" style={{ padding: '6px 12px', fontSize: '11px' }}>Edit</button>
                        <button onClick={() => handleDelete(row)} className="btn btn-danger" style={{ padding: '6px 12px', fontSize: '11px' }}>Delete</button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div>
          <div style={{
            // Must stay identical to the row template below — header and rows
            // are separate grids, so any auto-sized column would resolve to a
            // different width per row and skew every column.
            display: 'grid', gridTemplateColumns: selectMode ? SELECT_COLUMNS : LEDGER_COLUMNS, gap: '14px', padding: '0 8px 10px 8px',
            borderBottom: `2px solid ${theme.colors.primary}20`,
          }}>
            {selectMode && <span />}
            <span style={{ fontSize: '10px', fontWeight: 700, color: theme.colors.textSecondary, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Date</span>
            <span style={{ fontSize: '10px', fontWeight: 700, color: theme.colors.textSecondary, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Category</span>
            <span style={{ fontSize: '10px', fontWeight: 700, color: theme.colors.textSecondary, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Particulars</span>
            <span style={{ fontSize: '10px', fontWeight: 700, color: theme.colors.textSecondary, textTransform: 'uppercase', letterSpacing: '0.06em', textAlign: 'right' }}>Debit</span>
            <span style={{ fontSize: '10px', fontWeight: 700, color: theme.colors.textSecondary, textTransform: 'uppercase', letterSpacing: '0.06em', textAlign: 'right' }}>Credit</span>
            <span style={{ fontSize: '10px', fontWeight: 700, color: theme.colors.textSecondary, textTransform: 'uppercase', letterSpacing: '0.06em', textAlign: 'right' }}>Actions</span>
          </div>
          {filteredRows.map((row, idx) => {
            const isIncome = row.kind === 'income';
            const color = isIncome ? (incomeCategoryColors[row.category] ?? theme.colors.success) : getCategoryColor(row.category);
            return (
              <div key={`${row.kind}-${row.id}`} className="tx-row" style={{
                display: 'grid', gridTemplateColumns: selectMode ? SELECT_COLUMNS : LEDGER_COLUMNS, gap: '14px', alignItems: 'center', padding: '11px 8px',
                borderBottom: idx < filteredRows.length - 1 ? '1px solid rgba(0,0,0,0.04)' : 'none',
                background: isIncome ? `rgba(${theme.colors.successRgb}, 0.04)` : 'transparent',
              }}>
                {selectMode && checkbox(row)}
                <span style={{ fontSize: '13px', color: theme.colors.textSecondary, fontWeight: 500, fontVariantNumeric: 'tabular-nums' }}>
                  {format(row.date, 'dd MMM')}
                </span>
                <span style={{ background: `${color}20`, color, padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 600, display: 'inline-block', width: 'fit-content' }}>
                  {row.category}
                </span>
                <span
                  title={row.description}
                  style={{
                    fontSize: '13px', color: theme.colors.textPrimary, fontWeight: 500, minWidth: 0,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}
                >
                  {row.description}
                </span>
                <span style={{ fontSize: '14px', fontWeight: 700, color: isIncome ? theme.colors.textTertiary : theme.colors.textPrimary, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                  {isIncome ? '—' : `₹${row.amount.toLocaleString('en-IN')}`}
                </span>
                <span style={{ fontSize: '14px', fontWeight: 700, color: isIncome ? theme.colors.success : theme.colors.textTertiary, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                  {isIncome ? `₹${row.amount.toLocaleString('en-IN')}` : '—'}
                </span>
                <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                  {isIncome ? (
                    <>
                      {onEditIncome && <button onClick={() => onEditIncome(row.source as Income)} className="btn btn-ghost" style={{ padding: '6px 10px', fontSize: '11px' }}>Edit</button>}
                      {onDeleteIncome && <button onClick={() => handleDelete(row)} className="btn btn-danger" style={{ padding: '6px 10px', fontSize: '11px' }}>Delete</button>}
                    </>
                  ) : (
                    <>
                      <button onClick={() => onEdit(row.source as Expense)} className="btn btn-ghost" style={{ padding: '6px 10px', fontSize: '11px' }}>Edit</button>
                      <button onClick={() => handleDelete(row)} className="btn btn-danger" style={{ padding: '6px 10px', fontSize: '11px' }}>Delete</button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ConfirmDialog
        open={!!pendingDelete}
        danger
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
    </div>
  );
};

export default ExpenseList;
