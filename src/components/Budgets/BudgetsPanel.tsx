import React, { useMemo, useState } from 'react';
import { subMonths, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { EXPENSE_CATEGORIES, type Expense } from '../../types';
import { categoryColors } from '../../styles/theme';
import { useBudgets } from '../../context/BudgetsContext';
import { computeBudgetStatuses, type BudgetStatus } from '../../utils/budgets';

interface Props {
  /** Expenses for the month being shown. */
  monthExpenses: Expense[];
  /** All expenses, used to suggest a limit from recent spending. */
  expenses: Expense[];
  year: number;
  month: number;
  monthName: string;
  /** Home-screen preview: top few budgets only, no editing. */
  preview?: boolean;
  onManage?: () => void;
}

const inr = (n: number) => `₹${Math.round(Math.abs(n)).toLocaleString('en-IN')}`;

function colorFor(category: string): string {
  const idx = (EXPENSE_CATEGORIES as readonly string[]).indexOf(category);
  return categoryColors[Math.max(0, idx) % categoryColors.length];
}

const StatusLabel: React.FC<{ s: BudgetStatus }> = ({ s }) => {
  if (s.level === 'over') return <span className="bd-status over">⚠ Over by {inr(-s.remaining)}</span>;
  if (s.level === 'warning') return <span className="bd-status warn">⚠ {Math.round(s.percent)}% used</span>;
  return <span className="bd-status ok">{inr(s.remaining)} left</span>;
};

const Bar: React.FC<{ s: BudgetStatus }> = ({ s }) => (
  <div className="bd-track" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.min(100, Math.round(s.percent))} aria-label={`${s.category}: ${Math.round(s.percent)}% of budget used`}>
    <span className={`bd-fill ${s.level}`} style={{ width: `${Math.min(100, s.percent)}%` }} />
  </div>
);

const BudgetsPanel: React.FC<Props> = ({ monthExpenses, expenses, year, month, monthName, preview = false, onManage }) => {
  const { budgets, loading, setBudget } = useBudgets();
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [adding, setAdding] = useState(false);
  const [newCategory, setNewCategory] = useState('');
  const [saving, setSaving] = useState(false);

  const statuses = useMemo(() => computeBudgetStatuses(budgets, monthExpenses), [budgets, monthExpenses]);
  const totals = useMemo(() => {
    const limit = statuses.reduce((s, b) => s + b.limit, 0);
    const spent = statuses.reduce((s, b) => s + b.spent, 0);
    return { limit, spent, percent: limit ? (spent / limit) * 100 : 0 };
  }, [statuses]);

  // Average monthly spend per category over the 3 months before this one.
  const suggestion = useMemo(() => {
    const start = startOfMonth(subMonths(new Date(year, month), 3));
    const end = endOfMonth(subMonths(new Date(year, month), 1));
    const sums = new Map<string, number>();
    for (const e of expenses) {
      if (isWithinInterval(new Date(e.date), { start, end })) sums.set(e.category, (sums.get(e.category) ?? 0) + e.amount);
    }
    return (category: string) => {
      const avg = (sums.get(category) ?? 0) / 3;
      return avg > 0 ? Math.ceil(avg / 100) * 100 : null;
    };
  }, [expenses, year, month]);

  const unbudgeted = EXPENSE_CATEGORIES.filter((c) => !(c in budgets));
  const overCount = statuses.filter((s) => s.level === 'over').length;
  const warnCount = statuses.filter((s) => s.level === 'warning').length;

  const startEdit = (category: string, current?: number) => {
    setAdding(false);
    setEditing(category);
    setDraft(current ? String(current) : String(suggestion(category) ?? ''));
  };
  const save = async (category: string, amount: number | null) => {
    setSaving(true);
    try {
      await setBudget(category, amount);
      setEditing(null);
      setAdding(false);
      setNewCategory('');
    } finally {
      setSaving(false);
    }
  };
  const parsed = parseFloat(draft.replace(/,/g, ''));
  const draftValid = Number.isFinite(parsed) && parsed > 0;

  if (loading) return <div className="glass-card bd-card"><p className="bd-empty">Loading budgets…</p></div>;

  if (preview) {
    if (statuses.length === 0) {
      return (
        <button type="button" className="glass-card bd-card bd-cta" onClick={onManage}>
          <strong>Set monthly budgets</strong>
          <small>Choose a limit for categories like Food or Shopping and see how much is left.</small>
          <span className="bd-cta-btn">Create a budget</span>
        </button>
      );
    }
    return (
      <div className="glass-card bd-card">
        {statuses.slice(0, 3).map((s) => (
          <div key={s.category} className="bd-row">
            <div className="bd-row-top">
              <span className="bd-name"><i style={{ background: colorFor(s.category) }} />{s.category}</span>
              <span className="bd-nums">{inr(s.spent)} <small>/ {inr(s.limit)}</small></span>
            </div>
            <Bar s={s} />
            <StatusLabel s={s} />
          </div>
        ))}
      </div>
    );
  }

  if (statuses.length === 0 && !adding) {
    return (
      <div className="bd-intro">
        <div className="bd-intro-text">
          <strong>Set a monthly limit for the categories you want to control</strong>
          <small>
            For example ₹8,000 for Food &amp; Dining. You'll see how much is left each month, the bar turns
            amber at 80% and red when you go over, and you'll get a warning when an expense crosses either line.
          </small>
        </div>
        <button type="button" className="bd-save bd-intro-btn" onClick={() => { setEditing(null); setAdding(true); setDraft(''); }}>
          + Create your first budget
        </button>
      </div>
    );
  }

  return (
    <div className="bd-wrap">
      <div className="si-summary bd-hero">
        <small>Budgets · {monthName}</small>
        <strong className="bd-hero-num">
          {inr(totals.spent)} <span>of {inr(totals.limit)}</span>
        </strong>
        <div className="lg-meter-track"><span style={{ width: `${Math.min(100, totals.percent)}%` }} /></div>
        <small className="bd-hero-sub">
          {statuses.length === 0
            ? 'Choose a category to start.'
            : overCount
              ? `${overCount} over budget${warnCount ? ` · ${warnCount} close to the limit` : ''}`
              : warnCount
                ? `${warnCount} close to the limit`
                : `All ${statuses.length} on track`}
        </small>
      </div>

      {statuses.length > 0 && (
        <ul className="glass-card bd-card bd-list">
          {statuses.map((s) => (
            <li key={s.category} className="bd-row">
              <button type="button" className="bd-row-btn" onClick={() => (editing === s.category ? setEditing(null) : startEdit(s.category, s.limit))} aria-expanded={editing === s.category}>
                <div className="bd-row-top">
                  <span className="bd-name"><i style={{ background: colorFor(s.category) }} />{s.category}</span>
                  <span className="bd-nums">{inr(s.spent)} <small>/ {inr(s.limit)}</small></span>
                </div>
                <Bar s={s} />
                <StatusLabel s={s} />
              </button>
              {editing === s.category && (
                <div className="bd-edit">
                  <label className="bd-input">
                    <span>₹</span>
                    <input inputMode="decimal" value={draft} onChange={(e) => setDraft(e.target.value)} aria-label={`Monthly budget for ${s.category}`} autoFocus />
                  </label>
                  <button type="button" className="bd-save" disabled={!draftValid || saving} onClick={() => save(s.category, parsed)}>Save</button>
                  <button type="button" className="bd-remove" disabled={saving} onClick={() => save(s.category, null)}>Remove</button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {unbudgeted.length > 0 && (
        adding ? (
          <div className="glass-card bd-card bd-add">
            <label className="bd-select">
              <span>Category</span>
              <select
                value={newCategory}
                onChange={(e) => { setNewCategory(e.target.value); setDraft(String(suggestion(e.target.value) ?? '')); }}
              >
                <option value="">Choose a category…</option>
                {unbudgeted.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </label>
            {newCategory && (
              <>
                <div className="bd-edit">
                  <label className="bd-input">
                    <span>₹</span>
                    <input inputMode="decimal" value={draft} onChange={(e) => setDraft(e.target.value)} aria-label={`Monthly budget for ${newCategory}`} placeholder="Monthly limit" autoFocus />
                  </label>
                  <button type="button" className="bd-save" disabled={!draftValid || saving} onClick={() => save(newCategory, parsed)}>Add</button>
                </div>
                {suggestion(newCategory) && (
                  <small className="bd-hint">Suggested from your last 3 months: {inr(suggestion(newCategory)!)} a month</small>
                )}
              </>
            )}
            <button type="button" className="bd-link" onClick={() => { setAdding(false); setNewCategory(''); }}>Cancel</button>
          </div>
        ) : (
          <button type="button" className="bd-add-btn" onClick={() => { setEditing(null); setAdding(true); setDraft(''); }}>
            + Add a budget
          </button>
        )
      )}
    </div>
  );
};

export default BudgetsPanel;
