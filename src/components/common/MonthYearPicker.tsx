import React, { useState } from 'react';
import { theme as design } from '../../styles/theme';

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

interface MonthYearPickerProps {
  year: number;
  month: number;
  onSelect: (year: number, month: number) => void;
  /** The current real-world month, highlighted distinctly in the grid. */
  currentYear: number;
  currentMonth: number;
  trigger: React.ReactNode;
}

/**
 * A small modal month/year jump picker — click the trigger (usually the
 * month label text) to open a year-stepper plus a 12-month grid, instead of
 * clicking ◀/▶ one month at a time to get somewhere far away.
 */
const MonthYearPicker: React.FC<MonthYearPickerProps> = ({ year, month, onSelect, currentYear, currentMonth, trigger }) => {
  const [open, setOpen] = useState(false);
  const [browsingYear, setBrowsingYear] = useState(year);

  const handleOpen = () => {
    setBrowsingYear(year);
    setOpen(true);
  };

  const handleSelect = (m: number) => {
    onSelect(browsingYear, m);
    setOpen(false);
  };

  return (
    <>
      <span onClick={handleOpen} style={{ cursor: 'pointer' }}>
        {trigger}
      </span>

      {open && (
        <div className="modal-overlay" onClick={() => setOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '320px', padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <button
                onClick={() => setBrowsingYear((y) => y - 1)}
                className="btn btn-ghost btn-icon"
                aria-label="Previous year"
              >
                ◀
              </button>
              <span style={{ fontSize: '16px', fontWeight: 700, color: design.colors.textPrimary }}>{browsingYear}</span>
              <button
                onClick={() => setBrowsingYear((y) => y + 1)}
                className="btn btn-ghost btn-icon"
                aria-label="Next year"
              >
                ▶
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginBottom: '16px' }}>
              {MONTH_LABELS.map((label, idx) => {
                const isSelected = browsingYear === year && idx === month;
                const isCurrent = browsingYear === currentYear && idx === currentMonth;
                return (
                  <button
                    key={label}
                    onClick={() => handleSelect(idx)}
                    className="btn"
                    style={{
                      padding: '10px 4px',
                      fontSize: '13px',
                      fontWeight: 600,
                      border: isCurrent && !isSelected ? `1px solid ${design.colors.primary}` : 'none',
                      background: isSelected ? design.colors.primaryGradient : 'rgba(0,0,0,0.04)',
                      color: isSelected ? 'white' : design.colors.textPrimary,
                    }}
                  >
                    {label}
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => { onSelect(currentYear, currentMonth); setOpen(false); }}
              className="btn btn-ghost"
              style={{ width: '100%', padding: '10px', fontSize: '13px' }}
            >
              Jump to this month
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default MonthYearPicker;
