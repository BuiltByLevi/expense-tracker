import React, { useState } from 'react';
import { format, startOfDay, endOfDay } from 'date-fns';
import { theme as design } from '../../styles/theme';
import { parseLocalDateInput } from '../../utils/dateInput';
import { QUICK_RANGE_OPTIONS, sameDateRange, type DateRange } from '../../utils/dateRangePresets';

export type { DateRange };

interface DateRangeFilterProps {
  /** Currently applied range, or null when no range filter is active (showing the selected month instead). */
  value: DateRange | null;
  onApply: (range: DateRange) => void;
  onClear: () => void;
}

/**
 * Banking-style date-range filter for the Transaction History list only.
 * Deliberately independent of the month-navigation state (selectedYear/
 * selectedMonth) that drives the KPI cards — applying a range here never
 * touches Monthly Earnings/Spending/Net Cash Flow, which stay scoped to the
 * selected month. See useDashboardData's historyExpenses/historyIncome.
 */
const DateRangeFilter: React.FC<DateRangeFilterProps> = ({ value, onApply, onClear }) => {
  const [showCustom, setShowCustom] = useState(false);
  const [draftStart, setDraftStart] = useState(() => format(value?.start ?? new Date(), 'yyyy-MM-dd'));
  const [draftEnd, setDraftEnd] = useState(() => format(value?.end ?? new Date(), 'yyyy-MM-dd'));
  const [error, setError] = useState('');

  const pickQuick = (opt: typeof QUICK_RANGE_OPTIONS[number]) => {
    setShowCustom(false);
    setError('');
    const range = opt.range(new Date());
    setDraftStart(format(range.start, 'yyyy-MM-dd'));
    setDraftEnd(format(range.end, 'yyyy-MM-dd'));
    onApply(range);
  };

  const applyCustom = () => {
    if (!draftStart || !draftEnd) {
      setError('Pick both a start and end date');
      return;
    }
    const start = startOfDay(parseLocalDateInput(draftStart));
    const end = endOfDay(parseLocalDateInput(draftEnd));
    if (start.getTime() > end.getTime()) {
      setError('Start date must be before the end date');
      return;
    }
    setError('');
    onApply({ start, end });
  };

  const handleClear = () => {
    setError('');
    setShowCustom(false);
    onClear();
  };

  const activeQuickKey = value ? QUICK_RANGE_OPTIONS.find((opt) => sameDateRange(opt.range(new Date()), value))?.key ?? null : null;
  const isCustomActive = !!value && !activeQuickKey;

  return (
    <div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
        {QUICK_RANGE_OPTIONS.map((opt) => (
          <button
            key={opt.key}
            onClick={() => pickQuick(opt)}
            className="btn"
            style={{
              padding: '6px 12px',
              fontSize: '12px',
              fontWeight: 600,
              borderRadius: '999px',
              border: activeQuickKey === opt.key ? 'none' : `1px solid ${design.colors.primary}30`,
              background: activeQuickKey === opt.key ? design.colors.primaryGradient : 'transparent',
              color: activeQuickKey === opt.key ? 'white' : design.colors.textSecondary,
            }}
          >
            {opt.label}
          </button>
        ))}
        <button
          onClick={() => setShowCustom((s) => !s)}
          className="btn"
          style={{
            padding: '6px 12px',
            fontSize: '12px',
            fontWeight: 600,
            borderRadius: '999px',
            border: isCustomActive || showCustom ? 'none' : `1px solid ${design.colors.primary}30`,
            background: isCustomActive || showCustom ? design.colors.primaryGradient : 'transparent',
            color: isCustomActive || showCustom ? 'white' : design.colors.textSecondary,
          }}
        >
          Custom Range
        </button>
        {value && (
          <button onClick={handleClear} className="btn btn-ghost" style={{ padding: '6px 12px', fontSize: '12px', fontWeight: 600 }} aria-label="Clear date range filter">
            ✕ Clear
          </button>
        )}
      </div>

      {showCustom && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'flex-end', marginTop: '12px' }}>
          <div>
            <label className="input-label">Start Date</label>
            <input
              type="date"
              className="input"
              value={draftStart}
              max={draftEnd || undefined}
              onChange={(e) => { setDraftStart(e.target.value); setError(''); }}
              style={{ padding: '8px 12px', fontSize: '13px' }}
            />
          </div>
          <div>
            <label className="input-label">End Date</label>
            <input
              type="date"
              className="input"
              value={draftEnd}
              min={draftStart || undefined}
              onChange={(e) => { setDraftEnd(e.target.value); setError(''); }}
              style={{ padding: '8px 12px', fontSize: '13px' }}
            />
          </div>
          <button onClick={applyCustom} className="btn btn-primary" style={{ padding: '9px 18px', fontSize: '13px' }}>
            Apply Filter
          </button>
        </div>
      )}

      {error && (
        <p style={{ fontSize: '12px', color: design.colors.danger, margin: '8px 0 0 0', fontWeight: 500 }}>{error}</p>
      )}

      {value && (
        <p style={{ fontSize: '12px', color: design.colors.textSecondary, margin: '10px 0 0 0' }}>
          Showing <strong style={{ color: design.colors.textPrimary }}>{format(value.start, 'dd MMM yyyy')} – {format(value.end, 'dd MMM yyyy')}</strong> in Transaction History below. KPI cards above still reflect the selected month.
        </p>
      )}
    </div>
  );
};

export default DateRangeFilter;
