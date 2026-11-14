import React, { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { theme as design } from '../../styles/theme';
import { useEarningsHistoryLogic } from '../../hooks/useEarningsHistoryLogic';
import { RupeeIcon, CheckIcon } from '../common/FinanceIcons';

/**
 * Manage Earnings, banking style: a summary card for the shown period, the
 * default monthly figure (editable), year chips, months grouped by year
 * with tap-to-edit rows, and a Select mode with a bulk-action bar.
 * Shared by the phone and desktop pages; all logic is in
 * useEarningsHistoryLogic.
 */

const inr = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`;

const EarningsView: React.FC = () => {
  const {
    getDisplay, handleRevert, defaultEarnings, setDefaultEarnings, months, availableYears, yearFilter, setYearFilter,
    editingKey, setEditingKey, editValue, setEditValue, handleSave,
    selectedMonths, toggleSelection, toggleSelectAll, allSelected,
    bulkAmount, setBulkAmount, bulkSaving, handleBulkSaveAmount, handleBulkStatus, clearSelection,
    handleBulkRevert, selectedOverriddenCount,
  } = useEarningsHistoryLogic();

  const [selectMode, setSelectMode] = useState(false);
  const [editingDefault, setEditingDefault] = useState(false);
  const [defaultDraft, setDefaultDraft] = useState('');
  const [savingDefault, setSavingDefault] = useState(false);

  const now = new Date();
  const rows = useMemo(
    () => months.map((m) => ({ ...m, key: `${m.year}-${m.month}`, ...getDisplay(m.year, m.month) })),
    [months, getDisplay],
  );
  const pastRows = rows.filter((r) => r.year < now.getFullYear() || (r.year === now.getFullYear() && r.month <= now.getMonth()));
  const total = pastRows.reduce((s, r) => s + r.amount, 0);
  const avg = pastRows.length ? total / pastRows.length : 0;
  const needsAttention = pastRows.filter((r) => r.status !== 'confirmed').length;

  const groups = useMemo(() => {
    const out: { year: number; rows: typeof rows; total: number }[] = [];
    for (const r of rows) {
      let g = out[out.length - 1];
      if (!g || g.year !== r.year) { g = { year: r.year, rows: [], total: 0 }; out.push(g); }
      g.rows.push(r);
      g.total += r.amount;
    }
    return out;
  }, [rows]);

  const exitSelect = () => { setSelectMode(false); clearSelection(); };
  const saveDefault = async () => {
    const n = parseFloat(defaultDraft.replace(/,/g, ''));
    if (!Number.isFinite(n) || n < 0) return;
    setSavingDefault(true);
    try {
      await setDefaultEarnings(n);
      setEditingDefault(false);
    } catch {
      // toast shown by the context
    } finally {
      setSavingDefault(false);
    }
  };

  return (
    <div className="er-wrap">
      <section className="si-summary er-hero" style={{ background: design.colors.primaryGradient }}>
        <small>Earned · {yearFilter === 'All' ? `last ${pastRows.length} ${pastRows.length === 1 ? 'month' : 'months'}` : yearFilter}</small>
        <strong className="er-big">{inr(total)}</strong>
        <div className="si-summary-tiles">
          <div><small>Monthly average</small><strong>{inr(avg)}</strong></div>
          <div>
            <small>Need a look</small>
            <strong>{needsAttention}</strong>
            <small>{needsAttention === 1 ? 'month estimated or unset' : 'months estimated or unset'}</small>
          </div>
        </div>
      </section>

      <div className="glass-card pf-group">
        {editingDefault ? (
          <div className="pf-row pf-edit">
            <span className="pf-ico t-green"><RupeeIcon size={16} /></span>
            <label className="pf-edit-field">
              <small>Default monthly earnings</small>
              <input inputMode="decimal" value={defaultDraft} onChange={(e) => setDefaultDraft(e.target.value)} autoFocus />
            </label>
            <button type="button" className="pf-save" disabled={savingDefault || !defaultDraft.trim()} onClick={saveDefault}>
              {savingDefault ? 'Saving…' : 'Save'}
            </button>
            <button type="button" className="pf-cancel" onClick={() => setEditingDefault(false)}>Cancel</button>
          </div>
        ) : (
          <button type="button" className="pf-row" onClick={() => { setDefaultDraft(String(defaultEarnings || '')); setEditingDefault(true); }}>
            <span className="pf-ico t-green"><RupeeIcon size={16} /></span>
            <span className="pf-text"><strong>Default monthly earnings · {inr(defaultEarnings)}</strong><small>Used for any month without its own figure</small></span>
            <span className="pf-action">Edit</span>
          </button>
        )}
      </div>

      <div className="tl-tools">
        <div className="tl-chips er-years" role="group" aria-label="Year">
          {(['All', ...availableYears] as const).map((y) => (
            <button key={y} type="button" aria-pressed={yearFilter === y} onClick={() => setYearFilter(y)}>
              {y === 'All' ? 'All years' : y}
            </button>
          ))}
        </div>
        <button type="button" className={`tl-select-btn ${selectMode ? 'on' : ''}`} onClick={() => (selectMode ? exitSelect() : (setSelectMode(true), setEditingKey(null)))}>
          {selectMode ? 'Done' : 'Select'}
        </button>
      </div>

      {selectMode && (
        <button type="button" className="tl-link er-selall" onClick={toggleSelectAll}>
          {allSelected ? 'Clear selection' : 'Select all shown'} · {selectedMonths.size} selected
        </button>
      )}

      {groups.map((g) => (
        <section key={g.year} className="tl-group" aria-label={String(g.year)}>
          <header className="tl-day"><span>{g.year}</span><span>{inr(g.total)}</span></header>
          <ul className="glass-card tl-list">
            {g.rows.map((r) => {
              const isCurrent = r.year === now.getFullYear() && r.month === now.getMonth();
              const isFuture = r.year > now.getFullYear() || (r.year === now.getFullYear() && r.month > now.getMonth());
              const editing = editingKey === r.key && !selectMode;
              const selected = selectedMonths.has(r.key);
              return (
                <li key={r.key} className={`tl-row ${editing ? 'open' : ''}`}>
                  <button
                    type="button"
                    className="tl-main"
                    aria-expanded={selectMode ? undefined : editing}
                    aria-pressed={selectMode ? selected : undefined}
                    onClick={() => {
                      if (selectMode) toggleSelection(r.key);
                      else if (editing) setEditingKey(null);
                      else { setEditingKey(r.key); setEditValue(String(r.amount)); }
                    }}
                  >
                    {selectMode ? (
                      <span className={`tl-check ${selected ? 'on' : ''}`} aria-hidden="true">{selected && '✓'}</span>
                    ) : (
                      <span className={`er-month ${isCurrent ? 'cur' : ''}`} aria-hidden="true">{format(new Date(r.year, r.month), 'MMM')}</span>
                    )}
                    <span className="tl-text">
                      <strong>{format(new Date(r.year, r.month), 'MMMM yyyy')}</strong>
                      <span className="er-tags">
                        {isCurrent && <em className="t-blue">This month</em>}
                        {r.overridden ? <em className="t-orange">Your figure</em> : r.imported ? <em className="t-green">From statement</em> : null}
                        {r.status === 'estimated' && <em className="t-orange">Estimated</em>}
                        {r.status === 'missing' && !isFuture && <em className="t-red">Using default</em>}
                        {r.status === 'confirmed' && !r.imported && !r.overridden && <em className="t-teal">Confirmed</em>}
                      </span>
                    </span>
                    <span className={`tl-amt ${r.status === 'missing' ? 'er-muted' : ''}`}>{inr(r.amount)}</span>
                  </button>
                  {editing && (
                    <div className="er-edit">
                      <label className="bd-input">
                        <span>₹</span>
                        <input
                          inputMode="decimal"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleSave(r.year, r.month)}
                          aria-label={`Earnings for ${format(new Date(r.year, r.month), 'MMMM yyyy')}`}
                          autoFocus
                        />
                      </label>
                      <button type="button" className="bd-save" onClick={() => handleSave(r.year, r.month)}>
                        {r.imported && !r.overridden ? 'Use my figure' : 'Save'}
                      </button>
                      {r.overridden && (
                        <button type="button" className="bd-remove er-revert" onClick={() => handleRevert(r.year, r.month)}>
                          Use statement
                        </button>
                      )}
                      {r.imported && (
                        <small className="bd-hint er-note">
                          Statement total: {inr(r.imported.amount)}
                          {!r.overridden && ' · saving replaces it for this month'}
                        </small>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      ))}

      {selectMode && selectedMonths.size > 0 && (
        <div className="si-bar er-bulk">
          <div className="er-bulk-row">
            <label className="bd-input">
              <span>₹</span>
              <input inputMode="decimal" placeholder="Amount for all selected" value={bulkAmount} onChange={(e) => setBulkAmount(e.target.value)} />
            </label>
            <button type="button" className="bd-save" disabled={bulkSaving || !bulkAmount} onClick={handleBulkSaveAmount}>
              {bulkSaving ? '…' : 'Set'}
            </button>
          </div>
          <div className="er-bulk-row">
            <button type="button" className="er-chip t-green" disabled={bulkSaving} onClick={() => handleBulkStatus('confirmed')}>
              <CheckIcon size={12} color="currentColor" strokeWidth={2.6} /> Confirmed
            </button>
            <button type="button" className="er-chip t-orange" disabled={bulkSaving} onClick={() => handleBulkStatus('estimated')}>Estimated</button>
            {selectedOverriddenCount > 0 && (
              <button type="button" className="er-chip t-blue" disabled={bulkSaving} onClick={handleBulkRevert}>↺ Statement ({selectedOverriddenCount})</button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default EarningsView;
