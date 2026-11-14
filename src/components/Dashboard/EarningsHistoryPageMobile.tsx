import React from 'react';
import { theme as design } from '../../styles/theme';
import { format } from 'date-fns';
import { useEarningsHistoryLogic } from '../../hooks/useEarningsHistoryLogic';
import StatusBadge from '../common/StatusBadge';
import { CheckIcon, AlertIcon } from '../common/FinanceIcons';

interface Props {
  /** Unused: the mobile shell's menu handles navigation. Kept for API parity with the Web page. */
  onBack?: () => void;
}

const EarningsHistoryPageMobile: React.FC<Props> = () => {
  const {
    getDisplay, handleRevert, months, availableYears, yearFilter, setYearFilter,
    editingKey, setEditingKey, editValue, setEditValue, handleSave,
    selectedMonths, toggleSelection, toggleSelectAll, allSelected,
    bulkAmount, setBulkAmount, bulkSaving, handleBulkSaveAmount, handleBulkStatus, clearSelection,
    handleBulkRevert, selectedOverriddenCount,
  } = useEarningsHistoryLogic();

  return (
    <div style={{ padding: '12px', paddingBottom: selectedMonths.size > 0 ? '180px' : '12px' }}>
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>

        <div className="glass-card animate-in" style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '14px 16px', marginBottom: '12px' }}>
          <p style={{ fontSize: '12px', color: design.colors.textSecondary, margin: 0 }}>Select months to update in bulk.</p>
          <select
            className="input"
            value={yearFilter}
            onChange={(e) => setYearFilter(e.target.value === 'All' ? 'All' : parseInt(e.target.value))}
            style={{ padding: '10px', fontSize: '13px', width: '100%' }}
            aria-label="Filter by year"
          >
            <option value="All">All years</option>
            {availableYears.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingLeft: '4px', marginBottom: '8px' }}>
            <input type="checkbox" aria-label="Select all months" checked={allSelected} onChange={toggleSelectAll} style={{ width: '18px', height: '18px' }} />
            <span style={{ fontSize: '13px', fontWeight: 600, color: design.colors.textSecondary }}>Select All</span>
          </div>

          {months.map(({ year, month }) => {
            const key = `${year}-${month}`;
            const { amount, status, imported, overridden } = getDisplay(year, month);
            const isEditing = editingKey === key;
            const isSelected = selectedMonths.has(key);
            const isCurrentMonth = year === new Date().getFullYear() && month === new Date().getMonth();

            return (
              <div key={key} style={{
                background: isSelected ? `rgba(${design.colors.primaryRgb}, 0.08)` : isCurrentMonth ? `rgba(${design.colors.primaryRgb}, 0.04)` : 'var(--glass-bg)',
                borderRadius: '16px', padding: '16px', border: '1px solid var(--glass-border)',
                display: 'flex', flexDirection: 'column', gap: '12px',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <input
                      type="checkbox"
                      aria-label={`Select ${format(new Date(year, month), 'MMMM yyyy')}`}
                      checked={isSelected}
                      onChange={() => toggleSelection(key)}
                      style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                    />
                    <span style={{ fontWeight: 600, color: design.colors.textPrimary, fontSize: '15px' }}>
                      {format(new Date(year, month), 'MMM yyyy')}
                      {isCurrentMonth && <span style={{ marginLeft: '6px', fontSize: '10px', color: design.colors.primary, fontWeight: 700 }}>CUR</span>}
                      {imported && !overridden && <span style={{ marginLeft: '6px', fontSize: '9px', color: design.colors.success, fontWeight: 700 }}>IMPORT</span>}
                      {overridden && <span style={{ marginLeft: '6px', fontSize: '9px', color: design.colors.warning, fontWeight: 700 }}>OVERRIDDEN</span>}
                    </span>
                  </div>
                  {status !== 'missing' && <StatusBadge status={status} size="sm" />}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px' }}>
                  {isEditing ? (
                    <input type="number" className="input" style={{ flex: 1, padding: '10px', fontSize: '15px' }} value={editValue} onChange={e => setEditValue(e.target.value)} autoFocus onKeyDown={e => e.key === 'Enter' && handleSave(year, month)} />
                  ) : (
                    <span style={{ fontWeight: 700, fontSize: '18px', color: design.colors.textPrimary }}>₹{amount.toLocaleString('en-IN')}</span>
                  )}
                  {!isEditing && (
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button onClick={() => { setEditingKey(key); setEditValue(amount.toString()); }} className="btn btn-ghost" style={{ padding: '6px 16px', fontSize: '12px' }}>
                        {imported && !overridden ? 'Override' : 'Edit'}
                      </button>
                      {overridden && (
                        <button onClick={() => handleRevert(year, month)} className="btn btn-ghost" style={{ padding: '6px 12px', fontSize: '12px' }}>Revert</button>
                      )}
                    </div>
                  )}
                </div>
                {overridden && imported && (
                  <p style={{ fontSize: '11px', color: design.colors.textTertiary, margin: 0 }}>
                    Imported total: ₹{imported.amount.toLocaleString('en-IN')}
                  </p>
                )}

                {isEditing && (
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={() => handleSave(year, month)} className="btn btn-primary" style={{ flex: 1, padding: '10px', fontSize: '13px' }}>Save</button>
                    <button onClick={() => setEditingKey(null)} className="btn btn-ghost" style={{ flex: 1, padding: '10px', fontSize: '13px' }}>Cancel</button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {selectedMonths.size > 0 && (
        <div style={{
          position: 'fixed', bottom: '10px', left: '50%', transform: 'translateX(-50%)',
          width: 'calc(100% - 20px)', maxWidth: '600px',
          background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
          borderRadius: '20px', padding: '16px', boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
          display: 'flex', flexDirection: 'column', gap: '12px', zIndex: 1000, animation: 'slideUp 0.3s ease',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <p style={{ fontSize: '12px', color: '#94a3b8', margin: 0, fontWeight: 600 }}>{selectedMonths.size} months selected</p>
            <button onClick={clearSelection} aria-label="Clear selection" className="btn btn-ghost" style={{ padding: '4px 8px', fontSize: '11px', color: 'white' }}>X</button>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <input type="number" placeholder="Amount ₹" value={bulkAmount} onChange={(e) => setBulkAmount(e.target.value)} style={{ flex: 1, padding: '10px', borderRadius: '10px', background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', fontSize: '14px' }} />
            <button onClick={handleBulkSaveAmount} disabled={bulkSaving || !bulkAmount} className="btn btn-primary" style={{ padding: '10px 16px', fontSize: '13px', fontWeight: 700 }}>{bulkSaving ? '...' : 'Update'}</button>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={() => handleBulkStatus('confirmed')} disabled={bulkSaving} className="btn" style={{ flex: 1, padding: '10px', fontSize: '12px', fontWeight: 600, background: `rgba(${design.colors.successRgb}, 0.15)`, color: design.colors.accentBright, border: `1px solid rgba(${design.colors.successRgb}, 0.3)`, borderRadius: '10px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}><CheckIcon size={11} color={design.colors.accentBright} strokeWidth={2.5} /> Confirm</button>
            <button onClick={() => handleBulkStatus('estimated')} disabled={bulkSaving} className="btn" style={{ flex: 1, padding: '10px', fontSize: '12px', fontWeight: 600, background: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: '10px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}><AlertIcon size={11} color="#fbbf24" strokeWidth={2.5} /> Est</button>
          </div>

          {selectedOverriddenCount > 0 && (
            <button onClick={handleBulkRevert} disabled={bulkSaving} className="btn" style={{ padding: '10px', fontSize: '12px', fontWeight: 600, background: 'rgba(255,255,255,0.05)', color: '#cbd5e1', border: '1px solid rgba(148, 163, 184, 0.3)', borderRadius: '10px' }}>
              ↺ Revert {selectedOverriddenCount} to imported
            </button>
          )}
        </div>
      )}
      <style>{`@keyframes slideUp { from { transform: translate(-50%, 100px); opacity: 0; } to { transform: translate(-50%, 0); opacity: 1; } }`}</style>
    </div>
  );
};

export default EarningsHistoryPageMobile;
