import React, { useMemo, useState } from 'react';
import { format, isToday, isYesterday } from 'date-fns';
import { theme as design, categoryColors, incomeCategoryColors } from '../../styles/theme';
import { useTransactionLedgerLogic, type LedgerEntry } from '../../hooks/useTransactionLedgerLogic';
import { EXPENSE_CATEGORIES } from '../../types';
import MonthYearPicker from '../common/MonthYearPicker';
import { ClockIcon, LedgerIcon } from '../common/FinanceIcons';

/**
 * Monthly ledger body shared by the phone and desktop pages, styled to match the banking-style Transactions page:
 * month switcher, closing-balance card, search + Credits / Debits chips,
 * and entries grouped by day (oldest first, like a bank statement) with
 * the running balance under each amount and at the end of each day.
 */

type Flow = 'all' | 'credit' | 'debit';

const inr = (n: number) => `₹${Math.abs(n).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
const signed = (n: number) => `${n < 0 ? '−' : ''}${inr(n)}`;

function entryColor(e: LedgerEntry): string {
  if (e.type === 'credit') return incomeCategoryColors[e.category] ?? design.colors.success;
  const idx = (EXPENSE_CATEGORIES as readonly string[]).indexOf(e.category);
  return idx === -1 ? design.colors.textSecondary : categoryColors[idx % categoryColors.length];
}

function dayLabel(d: Date): string {
  if (isToday(d)) return 'Today';
  if (isYesterday(d)) return 'Yesterday';
  return format(d, 'EEE, d MMM');
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

const LedgerView: React.FC = () => {
  const {
    selectedYear, selectedMonth, currentYear, currentMonth, isFutureMonth,
    goToPreviousMonth, goToNextMonth, goToCurrentMonth, goToMonth,
    ledger, totalCredit, totalDebit, closingBalance,
  } = useTransactionLedgerLogic();

  const [search, setSearch] = useState('');
  const [flow, setFlow] = useState<Flow>('all');

  const monthName = format(new Date(selectedYear, selectedMonth), 'MMMM yyyy');
  const isCurrentMonth = selectedYear === currentYear && selectedMonth === currentMonth;
  const spentPct = totalCredit > 0 ? Math.min(100, Math.round((totalDebit / totalCredit) * 100)) : null;

  const q = search.trim().toLowerCase();
  const filtered = ledger.filter((e) =>
    (flow === 'all' || e.type === flow) &&
    (!q || e.description.toLowerCase().includes(q) || e.category.toLowerCase().includes(q) || e.amount.toString().includes(q)),
  );

  const groups = useMemo(() => {
    const out: { key: string; label: string; rows: LedgerEntry[] }[] = [];
    for (const e of filtered) {
      const key = format(e.date, 'yyyy-MM-dd');
      let g = out[out.length - 1];
      if (!g || g.key !== key) { g = { key, label: dayLabel(e.date), rows: [] }; out.push(g); }
      g.rows.push(e);
    }
    return out;
  }, [filtered]);

  // End-of-day balance comes from the full ledger, so filtering never changes it.
  const endOfDay = useMemo(() => {
    const m = new Map<string, number>();
    for (const e of ledger) m.set(format(e.date, 'yyyy-MM-dd'), e.runningBalance);
    return m;
  }, [ledger]);

  return (
    <>
      <div className="m-month">
        <button onClick={goToPreviousMonth} className="step" aria-label="Previous month">◀</button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <MonthYearPicker
            year={selectedYear}
            month={selectedMonth}
            currentYear={currentYear}
            currentMonth={currentMonth}
            onSelect={goToMonth}
            trigger={
              <span style={{ fontSize: '14px', fontWeight: 700, color: design.colors.textPrimary, textAlign: 'center', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {monthName}
              </span>
            }
          />
        </div>
        <button onClick={goToNextMonth} className="step" aria-label="Next month">▶</button>
        {!isCurrentMonth && <button onClick={goToCurrentMonth} className="today">Today</button>}
      </div>

      <div className="si-summary lg-hero" style={{ background: design.colors.primaryGradient }}>
        <div className="si-summary-head">
          <span className="si-hero-ico small"><LedgerIcon size={18} color="white" /></span>
          <div style={{ minWidth: 0 }}>
            <small>Closing balance · {monthName}</small>
            <strong className="lg-big">{signed(closingBalance)}</strong>
          </div>
        </div>
        <div className="si-summary-tiles">
          <div><small>Credits</small><strong>{isFutureMonth ? '—' : `+${inr(totalCredit)}`}</strong></div>
          <div><small>Debits</small><strong>−{inr(totalDebit)}</strong></div>
        </div>
        {spentPct !== null && (
          <div className="lg-meter" aria-label={`${spentPct}% of credits spent`}>
            <div className="lg-meter-track"><span style={{ width: `${spentPct}%` }} /></div>
            <small>{spentPct}% of credits spent</small>
          </div>
        )}
      </div>

      {isFutureMonth && (
        <p className="si-note">
          <ClockIcon size={14} color={design.colors.warning} />
          This month hasn't started yet, so salary and other credits aren't predicted.
        </p>
      )}

      {ledger.length === 0 ? (
        <div className="glass-card tl-empty">
          <strong>No entries for {monthName}</strong>
          <small>Transactions you add or import for this month will appear here.</small>
        </div>
      ) : (
        <>
          <div className="tl-tools">
            <label className="tl-search">
              <SearchIcon />
              <input type="search" placeholder="Search ledger" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search ledger" />
            </label>
          </div>
          <div className="tl-chips" role="group" aria-label="Filter entries">
            {(['all', 'credit', 'debit'] as Flow[]).map((f) => (
              <button key={f} type="button" aria-pressed={flow === f} onClick={() => setFlow(f)}>
                {f === 'all' ? `All · ${ledger.length}` : f === 'credit' ? 'Credits' : 'Debits'}
              </button>
            ))}
          </div>

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
                  <span>Balance {signed(endOfDay.get(g.key) ?? 0)}</span>
                </header>
                <ul className="glass-card tl-list">
                  {g.rows.map((e) => {
                    const isIn = e.type === 'credit';
                    const color = entryColor(e);
                    return (
                      <li key={e.id} className="tl-row">
                        <div className="tl-main" style={{ cursor: 'default' }}>
                          <span className="tl-avatar" style={{ background: `${color}1f`, color }} aria-hidden="true">
                            {e.category.charAt(0)}
                            <span className={`tl-flow ${isIn ? 'in' : 'out'}`}>{isIn ? <ArrowIn /> : <ArrowOut />}</span>
                          </span>
                          <span className="tl-text">
                            <strong>{e.description || e.category}</strong>
                            <small><i style={{ background: color }} aria-hidden="true" />{e.category}</small>
                          </span>
                          <span className={`tl-amt ${isIn ? 'in' : ''}`}>
                            {isIn ? '+' : '−'}{inr(e.amount)}
                            <small>Bal {signed(e.runningBalance)}</small>
                          </span>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))
          )}
        </>
      )}
    </>
  );
};

export default LedgerView;
