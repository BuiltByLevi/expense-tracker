import React, { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '../../types';
import { categoryColors, incomeCategoryColors, theme as design } from '../../styles/theme';
import { useRecurring, type NewRecurringRule } from '../../context/RecurringContext';
import { dueOccurrences, monthKeyOf, nextOccurrence, ordinal, type RecurringRule } from '../../utils/recurring';

/**
 * Recurring transactions: rent, EMIs, subscriptions, salary… added
 * automatically every month. Shared by the phone page and desktop card.
 */

const inr = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`;

function colorFor(r: Pick<RecurringRule, 'kind' | 'category'>) {
  if (r.kind === 'income') return incomeCategoryColors[r.category] ?? design.colors.success;
  const i = (EXPENSE_CATEGORIES as readonly string[]).indexOf(r.category);
  return categoryColors[Math.max(0, i) % categoryColors.length];
}

const ArrowIn = () => (
  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M17 7 7 17M7 9v8h8" /></svg>
);
const ArrowOut = () => (
  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M7 17 17 7M9 7h8v8" /></svg>
);

interface FormState {
  kind: 'expense' | 'income';
  amount: string;
  category: string;
  description: string;
  dayOfMonth: number;
  startMonth: string;
}

const thisMonth = () => monthKeyOf(new Date().getFullYear(), new Date().getMonth());
const emptyForm = (): FormState => ({
  kind: 'expense', amount: '', category: 'Rent', description: '', dayOfMonth: Math.min(new Date().getDate(), 28), startMonth: thisMonth(),
});

const RecurringPanel: React.FC = () => {
  const { rules, loading, addRule, updateRule, deleteRule } = useRecurring();
  const [form, setForm] = useState<FormState | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const today = new Date();
  const sorted = useMemo(
    () => [...rules].sort((a, b) => Number(b.active) - Number(a.active) || a.dayOfMonth - b.dayOfMonth),
    [rules],
  );
  const monthlyOut = rules.filter((r) => r.active && r.kind === 'expense').reduce((s, r) => s + r.amount, 0);
  const monthlyIn = rules.filter((r) => r.active && r.kind === 'income').reduce((s, r) => s + r.amount, 0);

  const startAdd = () => { setEditingId(null); setOpenId(null); setForm(emptyForm()); };
  const startEdit = (r: RecurringRule) => {
    setOpenId(null);
    setEditingId(r.id);
    setForm({ kind: r.kind, amount: String(r.amount), category: r.category, description: r.description, dayOfMonth: r.dayOfMonth, startMonth: r.startMonth });
  };

  const amount = form ? parseFloat(form.amount.replace(/,/g, '')) : NaN;
  const valid = !!form && Number.isFinite(amount) && amount > 0 && !!form.category;

  const save = async () => {
    if (!form || !valid) return;
    setSaving(true);
    try {
      const rule: NewRecurringRule = {
        kind: form.kind, amount, category: form.category, description: form.description.trim() || form.category,
        dayOfMonth: form.dayOfMonth, startMonth: form.startMonth, endMonth: null, active: true,
      };
      if (editingId) {
        // Changes apply from the next entry; ones already created stay as they are.
        const { kind, amount: a, category, description, dayOfMonth } = rule;
        await updateRule(editingId, { kind, amount: a, category, description, dayOfMonth });
      } else {
        await addRule(rule);
      }
      setForm(null);
      setEditingId(null);
    } finally {
      setSaving(false);
    }
  };

  // What saving a new rule would add straight away (months already due).
  const backfill = form && !editingId && valid
    ? dueOccurrences({ id: 'draft', kind: form.kind, amount, category: form.category, description: '', dayOfMonth: form.dayOfMonth, startMonth: form.startMonth, endMonth: null, active: true, lastGenerated: null }, today)
    : [];

  const categories: readonly string[] = form?.kind === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  const formView = form && (
    <div className="glass-card rc-form">
      <div className="au-tabs rc-kind" role="tablist" aria-label="Type">
        {(['expense', 'income'] as const).map((k) => (
          <button
            key={k}
            type="button"
            role="tab"
            aria-selected={form.kind === k}
            className={form.kind === k ? 'on' : ''}
            onClick={() => setForm({ ...form, kind: k, category: k === 'income' ? 'Salary' : 'Rent' })}
          >
            {k === 'expense' ? 'Money out' : 'Money in'}
          </button>
        ))}
      </div>
      <div className="rc-grid">
        <label className="au-field">
          <span>Amount (₹)</span>
          <input inputMode="decimal" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="e.g. 18000" autoFocus />
        </label>
        <label className="au-field">
          <span>Category</span>
          <select className="rc-select" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
            {categories.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </label>
        <label className="au-field rc-wide">
          <span>Description</span>
          <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder={form.kind === 'expense' ? 'e.g. House rent, Netflix, Car EMI' : 'e.g. Salary from ACME'} maxLength={120} />
        </label>
        <label className="au-field">
          <span>Every month on the</span>
          <select className="rc-select" value={form.dayOfMonth} onChange={(e) => setForm({ ...form, dayOfMonth: Number(e.target.value) })}>
            {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
              <option key={d} value={d}>{ordinal(d)}{d > 28 ? ' (or last day)' : ''}</option>
            ))}
          </select>
        </label>
        {!editingId && (
          <label className="au-field">
            <span>Starting</span>
            <input type="month" value={form.startMonth} onChange={(e) => e.target.value && setForm({ ...form, startMonth: e.target.value })} />
          </label>
        )}
      </div>
      <p className={`rc-note ${backfill.length > 1 ? 'rc-warn' : ''}`}>
        {editingId
          ? 'Changes apply from the next entry. Entries already added stay as they are.'
          : backfill.length === 0
            ? `Nothing is added today. The first entry comes on ${form.startMonth ? (() => { const n = nextOccurrence({ id: 'draft', kind: form.kind, amount: 1, category: '', description: '', dayOfMonth: form.dayOfMonth, startMonth: form.startMonth, endMonth: null, active: true, lastGenerated: null }, today); return n ? format(n, 'd MMM yyyy') : '—'; })() : '—'}.`
            : `Saving adds ${backfill.length} ${backfill.length === 1 ? 'entry' : 'entries'} now (${backfill.map((o) => format(o.date, 'MMM')).join(', ')}).${backfill.length > 1 ? ' If you already entered any of these by hand, pick a later start month to avoid doubles.' : ''}`}
      </p>
      <div className="bd-edit">
        <button type="button" className="bd-save rc-save" disabled={!valid || saving} onClick={save}>
          {saving ? 'Saving…' : editingId ? 'Save changes' : 'Add recurring'}
        </button>
        <button type="button" className="pf-cancel" onClick={() => { setForm(null); setEditingId(null); }}>Cancel</button>
      </div>
    </div>
  );

  if (loading) return <div className="glass-card bd-card"><p className="bd-empty">Loading…</p></div>;

  if (rules.length === 0 && !form) {
    return (
      <div className="bd-intro">
        <div className="bd-intro-text">
          <strong>Stop typing the same entries every month</strong>
          <small>Add rent, EMIs, subscriptions or your salary once. PRATIQ adds them for you on the right day every month, and you can pause or change them anytime.</small>
        </div>
        <button type="button" className="bd-save bd-intro-btn" onClick={startAdd}>+ Add a recurring entry</button>
      </div>
    );
  }

  return (
    <div className="bd-wrap">
      <div className="pf-tiles rc-tiles">
        <div className="pf-tile"><span className="pf-tile-ico t-red"><ArrowOut /></span><small>Out every month</small><strong>{inr(monthlyOut)}</strong></div>
        <div className="pf-tile"><span className="pf-tile-ico t-green"><ArrowIn /></span><small>In every month</small><strong>{inr(monthlyIn)}</strong></div>
      </div>

      {sorted.length > 0 && (
        <ul className="glass-card tl-list rc-list">
          {sorted.map((r) => {
            const color = colorFor(r);
            const next = nextOccurrence(r, today);
            const open = openId === r.id;
            return (
              <li key={r.id} className={`tl-row ${open ? 'open' : ''} ${r.active ? '' : 'rc-paused'}`}>
                <button type="button" className="tl-main" aria-expanded={open} onClick={() => setOpenId(open ? null : r.id)}>
                  <span className="tl-avatar" style={{ background: `${color}1f`, color }} aria-hidden="true">
                    {r.category.charAt(0)}
                    <span className={`tl-flow ${r.kind === 'income' ? 'in' : 'out'}`}>{r.kind === 'income' ? <ArrowIn /> : <ArrowOut />}</span>
                  </span>
                  <span className="tl-text">
                    <strong>{r.description}</strong>
                    <small>
                      Every month on the {ordinal(r.dayOfMonth)} ·{' '}
                      {r.active ? (next ? `next ${format(next, 'd MMM')}` : 'ended') : 'paused'}
                    </small>
                  </span>
                  <span className={`tl-amt ${r.kind === 'income' ? 'in' : ''}`}>
                    {r.kind === 'income' ? '+' : '−'}{inr(r.amount)}
                    <small>{r.category}</small>
                  </span>
                </button>
                {open && (
                  confirmDelete === r.id ? (
                    <div className="tl-actions rc-actions">
                      <span>Stop and remove this rule? Entries already added stay.</span>
                      <button type="button" onClick={() => setConfirmDelete(null)}>Keep</button>
                      <button type="button" className="danger" onClick={async () => { await deleteRule(r.id); setConfirmDelete(null); setOpenId(null); }}>Remove</button>
                    </div>
                  ) : (
                    <div className="tl-actions rc-actions">
                      <span>{r.lastGenerated ? `Last added for ${format(new Date(`${r.lastGenerated}-01T12:00`), 'MMM yyyy')}` : 'Nothing added yet'}</span>
                      <button type="button" onClick={() => updateRule(r.id, { active: !r.active })}>{r.active ? 'Pause' : 'Resume'}</button>
                      <button type="button" onClick={() => startEdit(r)}>Edit</button>
                      <button type="button" className="danger" onClick={() => setConfirmDelete(r.id)}>Remove</button>
                    </div>
                  )
                )}
              </li>
            );
          })}
        </ul>
      )}

      {form ? formView : (
        <button type="button" className="bd-add-btn" onClick={startAdd}>+ Add a recurring entry</button>
      )}
    </div>
  );
};

export default RecurringPanel;
