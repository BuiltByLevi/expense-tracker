import React, { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { theme as design } from '../../styles/theme';
import { useEarningsHistoryLogic } from '../../hooks/useEarningsHistoryLogic';
import { RupeeIcon, CheckIcon, Sparkline, DeltaBadge } from '../common/FinanceIcons';
import { useLanguage } from '../../context/useLanguage';

/**
 * Manage Earnings, banking style: a summary card for the shown period, the
 * default monthly figure (editable), year chips, months grouped by year
 * with tap-to-edit rows, and a Select mode with a bulk-action bar.
 * Shared by the phone and desktop pages; all logic is in
 * useEarningsHistoryLogic.
 */

const inr = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`;

const EarningsView: React.FC = () => {
  const { t } = useLanguage();
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

  const now = useMemo(() => new Date(), []);
  // Months with no real earnings behind them (no import, no saved record worth
  // keeping) show as ₹0 clutter in the history — drop them, except the
  // current month, which stays visible so there's always a row to edit.
  const rows = useMemo(
    () => months
      .map((m) => ({ ...m, key: `${m.year}-${m.month}`, ...getDisplay(m.year, m.month) }))
      .filter((r) => {
        const isCurrent = r.year === now.getFullYear() && r.month === now.getMonth();
        return isCurrent || r.amount !== 0 || !!r.imported;
      }),
    [months, getDisplay, now],
  );
  const pastRows = rows.filter((r) => r.year < now.getFullYear() || (r.year === now.getFullYear() && r.month <= now.getMonth()));
  const total = pastRows.reduce((s, r) => s + r.amount, 0);
  const avg = pastRows.length ? total / pastRows.length : 0;
  const needsAttention = pastRows.filter((r) => r.status !== 'confirmed').length;
  const trend = pastRows.slice(0, 12).map((r) => r.amount).reverse();

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
      <section className="si-summary er-hero animate-in" style={{ background: design.colors.primaryGradient }}>
        <span className="hero-watermark" aria-hidden="true"><RupeeIcon size={110} strokeWidth={1.2} color="#fff" /></span>
        <div className="si-summary-head">
          <span className="si-hero-ico small"><RupeeIcon size={18} color="white" /></span>
          <div style={{ minWidth: 0, flex: 1 }}>
            <small>
              {yearFilter === 'All'
                ? t(pastRows.length === 1 ? 'earnings.earnedMonth' : 'earnings.earnedMonths', { count: pastRows.length })
                : t('earnings.earnedYear', { year: yearFilter })}
            </small>
            <strong className="er-big">{inr(total)}</strong>
          </div>
          {trend.length >= 2 && <Sparkline data={trend} color="#fff" width={80} height={28} />}
        </div>
        {pastRows.length >= 2 && (
          <div className="er-delta">
            <DeltaBadge current={pastRows[0].amount} previous={pastRows[1].amount} light />
          </div>
        )}
        <div className="si-summary-tiles">
          <div><small>{t('earnings.monthlyAverage')}</small><strong>{inr(avg)}</strong></div>
          <div>
            <small>{t('earnings.needsAttention')}</small>
            <strong>{needsAttention}</strong>
            <small>{t(needsAttention === 1 ? 'earnings.estimatedOrUnsetSingular' : 'earnings.estimatedOrUnsetPlural')}</small>
          </div>
        </div>
      </section>

      <div className="glass-card pf-group animate-in animate-in-delay-1">
        {editingDefault ? (
          <div className="pf-row pf-edit">
            <span className="pf-ico t-green"><RupeeIcon size={16} /></span>
            <label className="pf-edit-field">
              <small>{t('earnings.defaultLabel')}</small>
              <input inputMode="decimal" value={defaultDraft} onChange={(e) => setDefaultDraft(e.target.value)} autoFocus />
            </label>
            <button type="button" className="pf-save" disabled={savingDefault || !defaultDraft.trim()} onClick={saveDefault}>
              {savingDefault ? t('earnings.saving') : t('common.save')}
            </button>
            <button type="button" className="pf-cancel" onClick={() => setEditingDefault(false)}>{t('common.cancel')}</button>
          </div>
        ) : (
          <button type="button" className="pf-row" onClick={() => { setDefaultDraft(String(defaultEarnings || '')); setEditingDefault(true); }}>
            <span className="pf-ico t-green"><RupeeIcon size={16} /></span>
            <span className="pf-text"><strong>{t('earnings.defaultLabel')} · {inr(defaultEarnings)}</strong><small>{t('earnings.defaultHint')}</small></span>
            <span className="pf-action">{t('common.edit')}</span>
          </button>
        )}
      </div>

      <div className="tl-tools animate-in animate-in-delay-2">
        <div className="tl-chips er-years" role="group" aria-label="Year">
          {(['All', ...availableYears] as const).map((y) => (
            <button key={y} type="button" aria-pressed={yearFilter === y} onClick={() => setYearFilter(y)}>
              {y === 'All' ? t('earnings.allYears') : y}
            </button>
          ))}
        </div>
        <button type="button" className={`tl-select-btn ${selectMode ? 'on' : ''}`} onClick={() => (selectMode ? exitSelect() : (setSelectMode(true), setEditingKey(null)))}>
          {selectMode ? t('common.done') : t('earnings.select')}
        </button>
      </div>

      {selectMode && (
        <button type="button" className="tl-link er-selall" onClick={toggleSelectAll}>
          {allSelected ? t('earnings.clearSelection') : t('earnings.selectAllShown')} · {t('common.selectedCount', { count: selectedMonths.size })}
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
                        {isCurrent && <em className="t-blue">{t('earnings.tagThisMonth')}</em>}
                        {r.overridden ? <em className="t-orange">{t('earnings.tagYourFigure')}</em> : r.imported ? <em className="t-green">{t('earnings.tagFromStatement')}</em> : null}
                        {r.status === 'estimated' && <em className="t-orange">{t('earnings.tagEstimated')}</em>}
                        {r.status === 'missing' && !isFuture && <em className="t-red">{t('earnings.tagUsingDefault')}</em>}
                        {r.status === 'confirmed' && !r.imported && !r.overridden && <em className="t-teal">{t('earnings.tagConfirmed')}</em>}
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
                        {r.imported && !r.overridden ? t('earnings.useMyFigure') : t('common.save')}
                      </button>
                      {r.overridden && (
                        <button type="button" className="bd-remove er-revert" onClick={() => handleRevert(r.year, r.month)}>
                          {t('earnings.useStatement')}
                        </button>
                      )}
                      {r.imported && (
                        <small className="bd-hint er-note">
                          {t('earnings.statementTotal', { amount: inr(r.imported.amount) })}
                          {!r.overridden && ` · ${t('earnings.savingReplaces')}`}
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
              <input inputMode="decimal" placeholder={t('earnings.bulkAmountPlaceholder')} value={bulkAmount} onChange={(e) => setBulkAmount(e.target.value)} />
            </label>
            <button type="button" className="bd-save" disabled={bulkSaving || !bulkAmount} onClick={handleBulkSaveAmount}>
              {bulkSaving ? '…' : t('earnings.set')}
            </button>
          </div>
          <div className="er-bulk-row">
            <button type="button" className="er-chip t-green" disabled={bulkSaving} onClick={() => handleBulkStatus('confirmed')}>
              <CheckIcon size={12} color="currentColor" strokeWidth={2.6} /> {t('earnings.tagConfirmed')}
            </button>
            <button type="button" className="er-chip t-orange" disabled={bulkSaving} onClick={() => handleBulkStatus('estimated')}>{t('earnings.tagEstimated')}</button>
            {selectedOverriddenCount > 0 && (
              <button type="button" className="er-chip t-blue" disabled={bulkSaving} onClick={handleBulkRevert}>{t('earnings.revertStatement', { count: selectedOverriddenCount })}</button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default EarningsView;
