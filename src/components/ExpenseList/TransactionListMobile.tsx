import React, { useMemo, useState } from 'react';
import { format, isToday, isYesterday } from 'date-fns';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, type Expense, type Income } from '../../types';
import { categoryColors, incomeCategoryColors, theme } from '../../styles/theme';
import ConfirmDialog from '../common/ConfirmDialog';
import { InboxIcon } from '../common/FinanceIcons';

/**
 * Phone transaction history, styled like a banking app: period summary,
 * search + Money in / Money out filter, entries grouped under day headers
 * with a day total, and a tap-to-open action strip (Edit / Delete) per row.
 * Same props and behaviour as ExpenseList, which renders this on phones.
 */

export interface TransactionListMobileProps {
  expenses: Expense[];
  onDelete: (id: string) => Promise<void>;
  onEdit: (expense: Expense) => void;
  income?: Income[];
  onDeleteIncome?: (id: string) => Promise<void>;
  onEditIncome?: (income: Income) => void;
  onBulkCategory?: (kind: 'expense' | 'income', ids: string[], category: string) => Promise<void>;
  emptyStateLabel?: string;
}

interface Row {
  key: string;
  id: string;
  date: Date;
  description: string;
  category: string;
  amount: number;
  kind: 'expense' | 'income';
  source: Expense | Income;
}

type Flow = 'all' | 'in' | 'out';

const inr = (n: number) => `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

function categoryColor(row: Pick<Row, 'kind' | 'category'>): string {
  if (row.kind === 'income') return incomeCategoryColors[row.category] ?? theme.colors.success;
  const idx = (EXPENSE_CATEGORIES as readonly string[]).indexOf(row.category);
  return categoryColors[Math.max(0, idx) % categoryColors.length];
}

function dayLabel(d: Date): string {
  if (isToday(d)) return 'Today';
  if (isYesterday(d)) return 'Yesterday';
  return format(d, d.getFullYear() === new Date().getFullYear() ? 'EEE, d MMM' : 'EEE, d MMM yyyy');
}

const SearchIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
    <circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" />
  </svg>
);
const ArrowIn = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M17 7 7 17M7 9v8h8" /></svg>
);
const ArrowOut = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M7 17 17 7M9 7h8v8" /></svg>
);

const TransactionListMobile: React.FC<TransactionListMobileProps> = ({
  expenses, onDelete, onEdit, income = [], onDeleteIncome, onEditIncome, onBulkCategory, emptyStateLabel,
}) => {
  const [search, setSearch] = useState('');
  const [flow, setFlow] = useState<Flow>('all');
  const [category, setCategory] = useState('All');
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Row | null>(null);
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkCategory, setBulkCategory] = useState('');
  const [bulkSaving, setBulkSaving] = useState(false);

  const rows = useMemo<Row[]>(() => [
    ...expenses.map((e): Row => ({ key: `expense-${e.id}`, id: e.id, date: new Date(e.date), description: e.description, category: e.category, amount: e.amount, kind: 'expense', source: e })),
    ...income.map((i): Row => ({ key: `income-${i.id}`, id: i.id, date: new Date(i.date), description: i.description, category: i.category, amount: i.amount, kind: 'income', source: i })),
  ].sort((a, b) => b.date.getTime() - a.date.getTime()), [expenses, income]);

  const totals = useMemo(() => {
    let inSum = 0, outSum = 0;
    for (const r of rows) { if (r.kind === 'income') inSum += r.amount; else outSum += r.amount; }
    return { inSum, outSum, net: inSum - outSum };
  }, [rows]);

  const categoryOptions = useMemo(() => {
    const present = new Set(rows.filter((r) => flow === 'all' || (flow === 'in') === (r.kind === 'income')).map((r) => r.category));
    return [...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES].filter((c) => present.has(c));
  }, [rows, flow]);

  const q = search.trim().toLowerCase();
  const filtered = rows.filter((r) =>
    (flow === 'all' || (flow === 'in') === (r.kind === 'income')) &&
    (category === 'All' || r.category === category) &&
    (!q || r.description.toLowerCase().includes(q) || r.category.toLowerCase().includes(q) || r.amount.toString().includes(q)),
  );

  const groups = useMemo(() => {
    const out: { label: string; key: string; rows: Row[]; net: number }[] = [];
    for (const r of filtered) {
      const key = format(r.date, 'yyyy-MM-dd');
      let g = out[out.length - 1];
      if (!g || g.key !== key) { g = { label: dayLabel(r.date), key, rows: [], net: 0 }; out.push(g); }
      g.rows.push(r);
      g.net += r.kind === 'income' ? r.amount : -r.amount;
    }
    return out;
  }, [filtered]);

  // Selection only counts rows still visible, so a filter change can't leave hidden rows selected.
  const selectedRows = filtered.filter((r) => selected.has(r.key));
  const kinds = new Set(selectedRows.map((r) => r.kind));
  const selectionKind = kinds.size === 1 ? [...kinds][0] : null;
  const bulkOptions: readonly string[] = selectionKind === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  const allSelected = filtered.length > 0 && selectedRows.length === filtered.length;

  const exitSelect = () => { setSelectMode(false); setSelected(new Set()); setBulkCategory(''); };
  const toggle = (r: Row) => setSelected((prev) => {
    const next = new Set(prev);
    if (next.has(r.key)) next.delete(r.key); else next.add(r.key);
    return next;
  });
  const applyBulk = async () => {
    if (!onBulkCategory || !selectionKind || !bulkCategory) return;
    setBulkSaving(true);
    try {
      await onBulkCategory(selectionKind, selectedRows.map((r) => r.id), bulkCategory);
      exitSelect();
    } finally {
      setBulkSaving(false);
    }
  };
  const confirmDelete = async () => {
    if (!pendingDelete) return;
    if (pendingDelete.kind === 'income') { if (onDeleteIncome) await onDeleteIncome(pendingDelete.id); }
    else await onDelete(pendingDelete.id);
    setPendingDelete(null);
    setOpenKey(null);
  };

  const summary = (
    <div className="tl-summary">
      <div className="tl-sum in">
        <span className="tl-sum-ico"><ArrowIn /></span>
        <div><small>Money in</small><strong>{inr(totals.inSum)}</strong></div>
      </div>
      <div className="tl-sum out">
        <span className="tl-sum-ico"><ArrowOut /></span>
        <div><small>Money out</small><strong>{inr(totals.outSum)}</strong></div>
      </div>
    </div>
  );

  if (rows.length === 0) {
    return (
      <>
        {summary}
        <div className="glass-card tl-empty">
          <span className="tl-empty-ico"><InboxIcon size={28} color={theme.colors.textTertiary} strokeWidth={1.6} /></span>
          <strong>{emptyStateLabel || 'No transactions yet'}</strong>
          <small>Add one with the + button, or import a bank statement.</small>
        </div>
      </>
    );
  }

  return (
    <>
      {summary}

      <div className="tl-tools">
        <label className="tl-search">
          <SearchIcon />
          <input type="search" placeholder="Search transactions" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search transactions" />
        </label>
        {onBulkCategory && (
          <button type="button" className={`tl-select-btn ${selectMode ? 'on' : ''}`} onClick={() => (selectMode ? exitSelect() : (setSelectMode(true), setOpenKey(null)))}>
            {selectMode ? 'Done' : 'Select'}
          </button>
        )}
      </div>

      <div className="tl-chips" role="group" aria-label="Filter transactions">
        {(['all', 'in', 'out'] as Flow[]).map((f) => (
          <button key={f} type="button" aria-pressed={flow === f} onClick={() => { setFlow(f); setCategory('All'); }}>
            {f === 'all' ? 'All' : f === 'in' ? 'Money in' : 'Money out'}
          </button>
        ))}
        <label className={`tl-cat-chip ${category !== 'All' ? 'on' : ''}`}>
          <select value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Category">
            <option value="All">All categories</option>
            {categoryOptions.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </label>
      </div>

      {selectMode && (
        <div className="glass-card tl-bulk">
          <button type="button" className="tl-link" onClick={() => setSelected(allSelected ? new Set() : new Set(filtered.map((r) => r.key)))}>
            {allSelected ? 'Clear' : 'Select all'} · {selectedRows.length} selected
          </button>
          {selectedRows.length > 0 && !selectionKind ? (
            <p className="tl-warn">Pick only money in or only money out to change the category.</p>
          ) : (
            <div className="tl-bulk-row">
              <select value={bulkCategory} onChange={(e) => setBulkCategory(e.target.value)} disabled={!selectionKind} aria-label="New category for selected transactions">
                <option value="">Change category to…</option>
                {bulkOptions.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <button type="button" onClick={applyBulk} disabled={!selectionKind || !bulkCategory || bulkSaving}>
                {bulkSaving ? 'Updating…' : 'Apply'}
              </button>
            </div>
          )}
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="glass-card tl-empty">
          <strong>No matches</strong>
          <small>Try a different search or filter.</small>
        </div>
      ) : (
        groups.map((g) => (
          <section key={g.key} className="tl-group" aria-label={g.label}>
            <header className="tl-day">
              <span>{g.label}</span>
              <span className={g.net >= 0 ? 'pos' : ''}>{g.net >= 0 ? '+' : '−'}{inr(Math.abs(g.net))}</span>
            </header>
            <ul className="glass-card tl-list">
              {g.rows.map((r) => {
                const isIn = r.kind === 'income';
                const color = categoryColor(r);
                const open = openKey === r.key && !selectMode;
                const canEdit = isIn ? !!onEditIncome : true;
                const canDelete = isIn ? !!onDeleteIncome : true;
                const isSel = selected.has(r.key);
                return (
                  <li key={r.key} className={`tl-row ${open ? 'open' : ''}`}>
                    <button
                      type="button"
                      className="tl-main"
                      aria-expanded={selectMode ? undefined : open}
                      aria-pressed={selectMode ? isSel : undefined}
                      onClick={() => (selectMode ? toggle(r) : setOpenKey(open ? null : r.key))}
                    >
                      {selectMode ? (
                        <span className={`tl-check ${isSel ? 'on' : ''}`} aria-hidden="true">{isSel && '✓'}</span>
                      ) : (
                        <span className="tl-avatar" style={{ background: `${color}1f`, color }} aria-hidden="true">
                          {r.category.charAt(0)}
                          <span className={`tl-flow ${isIn ? 'in' : 'out'}`}>{isIn ? <ArrowIn /> : <ArrowOut />}</span>
                        </span>
                      )}
                      <span className="tl-text">
                        <strong>{r.description || r.category}</strong>
                        <small><i style={{ background: color }} aria-hidden="true" />{r.category}</small>
                      </span>
                      <span className={`tl-amt ${isIn ? 'in' : ''}`}>
                        {isIn ? '+' : '−'}{inr(r.amount)}
                        <small>{isIn ? 'Credit' : 'Debit'}</small>
                      </span>
                    </button>
                    {open && (canEdit || canDelete) && (
                      <div className="tl-actions">
                        <span>{format(r.date, 'd MMM yyyy')}</span>
                        {canEdit && (
                          <button type="button" onClick={() => (isIn ? onEditIncome?.(r.source as Income) : onEdit(r.source as Expense))}>Edit</button>
                        )}
                        {canDelete && (
                          <button type="button" className="danger" onClick={() => setPendingDelete(r)}>Delete</button>
                        )}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        ))
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
    </>
  );
};

export default TransactionListMobile;
