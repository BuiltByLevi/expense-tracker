import React from 'react';
import { theme as design } from '../../styles/theme';
import { format } from 'date-fns';
import { useEarningsHistoryLogic } from '../../hooks/useEarningsHistoryLogic';
import StatusBadge from '../common/StatusBadge';
import { InfoIcon, CheckIcon, AlertIcon } from '../common/FinanceIcons';

interface EarningsHistoryPageProps {
  onBack: () => void;
}

const EarningsHistoryPage: React.FC<EarningsHistoryPageProps> = ({ onBack }) => {
  const {
    getEarningsForMonth, getImportDerived, defaultEarnings, months, availableYears, yearFilter, setYearFilter,
    editingKey, setEditingKey, editValue, setEditValue, handleEditClick, handleSave,
    selectedMonths, toggleSelection, toggleSelectAll, allSelected, someSelected,
    bulkAmount, setBulkAmount, bulkSaving, handleBulkSaveAmount, handleBulkStatus, clearSelection,
  } = useEarningsHistoryLogic();

  return (
    <div style={{ minHeight: '100vh', padding: '24px', paddingBottom: selectedMonths.size > 0 ? '140px' : '24px' }}>
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>

        {/* Header */}
        <div className="glass-card animate-in" style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 28px', marginBottom: '20px',
        }}>
          <div>
            <h1 className="text-gradient" style={{ fontSize: '24px', fontWeight: 700, margin: 0 }}>
              Earnings History
            </h1>
            <p style={{ fontSize: '13px', color: design.colors.textSecondary, margin: '4px 0 0 0' }}>
              Select months and update individually or in bulk.
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <select
              className="input"
              value={yearFilter}
              onChange={(e) => setYearFilter(e.target.value === 'All' ? 'All' : parseInt(e.target.value))}
              style={{ padding: '10px 14px', fontSize: '13px', width: 'auto' }}
              aria-label="Filter by year"
            >
              <option value="All">All years</option>
              {availableYears.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
            <button onClick={onBack} className="btn btn-ghost" style={{ padding: '10px 20px' }}>
              ← Back to Dashboard
            </button>
          </div>
        </div>

        {/* Info Banner */}
        <div className="glass-card animate-in animate-in-delay-1" style={{
          padding: '16px 24px', marginBottom: '20px',
          background: `linear-gradient(135deg, rgba(${design.colors.primaryRgb}, 0.05) 0%, rgba(${design.colors.accentBrightRgb}, 0.05) 100%)`,
          border: `1px solid ${design.colors.primary}20`,
        }}>
          <p style={{ fontSize: '13px', color: design.colors.textSecondary, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <InfoIcon size={14} color={design.colors.primary} style={{ flexShrink: 0 }} />
            <span><strong>Tip:</strong> Tick the checkboxes to select multiple months, then update amounts or status in bulk.</span>
          </p>
        </div>

        {/* Table */}
        <div className="glass-card animate-in animate-in-delay-2" style={{ padding: '0', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
            <thead>
              <tr style={{ background: 'rgba(0,0,0,0.02)', borderBottom: `1px solid ${design.colors.primary}20` }}>
                <th style={{ padding: '16px 12px 16px 24px', textAlign: 'left', width: '40px' }}>
                  <input
                    type="checkbox"
                    aria-label="Select all months"
                    checked={allSelected}
                    ref={(el) => {
                      if (el) el.indeterminate = someSelected;
                    }}
                    onChange={toggleSelectAll}
                    style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                  />
                </th>
                <th style={{ padding: '16px 12px', textAlign: 'left', fontWeight: 600, color: design.colors.textSecondary, fontSize: '12px', textTransform: 'uppercase' }}>Month</th>
                <th style={{ padding: '16px 12px', textAlign: 'right', fontWeight: 600, color: design.colors.textSecondary, fontSize: '12px', textTransform: 'uppercase' }}>Earnings</th>
                <th style={{ padding: '16px 12px', textAlign: 'center', fontWeight: 600, color: design.colors.textSecondary, fontSize: '12px', textTransform: 'uppercase' }}>Status</th>
                <th style={{ padding: '16px 24px 16px 12px', textAlign: 'center', fontWeight: 600, color: design.colors.textSecondary, fontSize: '12px', textTransform: 'uppercase' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {months.map(({ year, month }) => {
                const key = `${year}-${month}`;
                const imported = getImportDerived(year, month);
                const record = getEarningsForMonth(year, month);
                const amount = imported ? imported.amount : record ? record.amount : defaultEarnings;
                const status = imported ? 'confirmed' : record ? record.status : 'missing';
                const isEditing = editingKey === key;
                const isCurrentMonth = year === new Date().getFullYear() && month === new Date().getMonth();
                const isSelected = selectedMonths.has(key);

                return (
                  <tr key={key} style={{
                    borderBottom: '1px solid rgba(0,0,0,0.04)',
                    background: isSelected
                      ? `rgba(${design.colors.primaryRgb}, 0.08)`
                      : isCurrentMonth
                        ? `rgba(${design.colors.primaryRgb}, 0.04)`
                        : 'transparent',
                    opacity: imported ? 0.85 : 1,
                  }}>
                    <td style={{ padding: '16px 12px 16px 24px' }}>
                      <input
                        type="checkbox"
                        aria-label={`Select ${format(new Date(year, month), 'MMMM yyyy')}`}
                        checked={isSelected}
                        disabled={!!imported}
                        onChange={() => toggleSelection(key)}
                        style={{ cursor: imported ? 'not-allowed' : 'pointer', width: '16px', height: '16px' }}
                      />
                    </td>
                    <td style={{ padding: '16px 12px', fontWeight: 600, color: design.colors.textPrimary }}>
                      {format(new Date(year, month), 'MMMM yyyy')}
                      {isCurrentMonth && <span style={{ marginLeft: '8px', fontSize: '10px', color: design.colors.primary, fontWeight: 700 }}>CURRENT</span>}
                      {imported && <span style={{ marginLeft: '8px', fontSize: '10px', color: design.colors.success, fontWeight: 700 }}>FROM IMPORT</span>}
                    </td>
                    <td style={{ padding: '16px 12px', textAlign: 'right' }}>
                      {isEditing ? (
                        <input
                          type="number"
                          className="input"
                          style={{ width: '150px', padding: '8px', textAlign: 'right', fontSize: '14px' }}
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          autoFocus
                          onKeyDown={(e) => e.key === 'Enter' && handleSave(year, month)}
                        />
                      ) : (
                        <span style={{ fontWeight: 700, color: design.colors.textPrimary }}>
                          ₹{amount.toLocaleString('en-IN')}
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '16px 12px', textAlign: 'center' }}>
                      <StatusBadge status={status} />
                    </td>
                    <td style={{ padding: '16px 24px 16px 12px', textAlign: 'center' }}>
                      {imported ? (
                        <span title="Earnings come from your imported bank statement — edit the source transaction to change this" style={{ fontSize: '11px', color: design.colors.textTertiary }}>
                          Not editable
                        </span>
                      ) : isEditing ? (
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                          <button onClick={() => handleSave(year, month)} className="btn btn-primary" style={{ padding: '6px 12px', fontSize: '12px' }}>Save</button>
                          <button onClick={() => setEditingKey(null)} className="btn btn-ghost" style={{ padding: '6px 12px', fontSize: '12px' }}>Cancel</button>
                        </div>
                      ) : (
                        <button onClick={() => handleEditClick(year, month, amount)} className="btn btn-ghost" style={{ padding: '6px 16px', fontSize: '12px' }}>
                          Edit
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* BULK ACTION BAR - appears when any month is selected */}
      {selectedMonths.size > 0 && (
        <div style={{
          position: 'fixed',
          bottom: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: 'calc(100% - 40px)',
          maxWidth: '900px',
          background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
          borderRadius: '20px',
          padding: '16px 24px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
          border: `1px solid rgba(${design.colors.accentBrightRgb}, 0.3)`,
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          zIndex: 1000,
          animation: 'slideUp 0.3s ease',
          flexWrap: 'wrap',
        }}>
          <div style={{ flex: '0 0 auto' }}>
            <p style={{ fontSize: '11px', color: '#94a3b8', margin: 0, textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.05em' }}>
              {selectedMonths.size} {selectedMonths.size === 1 ? 'month' : 'months'} selected
            </p>
          </div>

          {/* Amount input section */}
          <div style={{ flex: 1, minWidth: '220px', display: 'flex', gap: '8px', alignItems: 'center' }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <span style={{
                position: 'absolute',
                left: '14px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#94a3b8',
                fontWeight: 600,
                fontSize: '14px',
              }}>₹</span>
              <input
                type="number"
                placeholder="Enter new amount"
                value={bulkAmount}
                onChange={(e) => setBulkAmount(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 14px 10px 32px',
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(148, 163, 184, 0.2)',
                  borderRadius: '10px',
                  color: 'white',
                  fontSize: '14px',
                  fontWeight: 600,
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
                onKeyDown={(e) => e.key === 'Enter' && handleBulkSaveAmount()}
              />
            </div>
          </div>

          {/* Status buttons */}
          <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
            <button
              onClick={() => handleBulkStatus('confirmed')}
              disabled={bulkSaving}
              className="btn"
              style={{
                padding: '10px 14px',
                fontSize: '12px',
                fontWeight: 600,
                background: `rgba(${design.colors.successRgb}, 0.15)`,
                color: design.colors.accentBright,
                border: `1px solid rgba(${design.colors.successRgb}, 0.3)`,
                borderRadius: '10px',
                cursor: 'pointer',
              }}
              title="Mark selected as Confirmed without changing amounts"
            >
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}><CheckIcon size={11} color={design.colors.accentBright} strokeWidth={2.5} /> Mark Confirmed</span>
            </button>
            <button
              onClick={() => handleBulkStatus('estimated')}
              disabled={bulkSaving}
              className="btn"
              style={{
                padding: '10px 14px',
                fontSize: '12px',
                fontWeight: 600,
                background: 'rgba(245, 158, 11, 0.15)',
                color: '#fbbf24',
                border: '1px solid rgba(245, 158, 11, 0.3)',
                borderRadius: '10px',
                cursor: 'pointer',
              }}
              title="Mark selected as Estimated without changing amounts"
            >
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}><AlertIcon size={11} color="#fbbf24" strokeWidth={2.5} /> Mark Estimated</span>
            </button>
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
            <button
              onClick={clearSelection}
              className="btn btn-ghost"
              style={{ padding: '10px 16px', fontSize: '13px', color: '#cbd5e1', background: 'rgba(255,255,255,0.05)' }}
            >
              Cancel
            </button>
            <button
              onClick={handleBulkSaveAmount}
              disabled={bulkSaving || !bulkAmount}
              className="btn btn-primary"
              style={{ padding: '10px 20px', fontSize: '13px', fontWeight: 700 }}
              title="Update amounts and mark as Confirmed"
            >
              {bulkSaving ? 'Saving...' : `Update ${selectedMonths.size}`}
            </button>
          </div>
        </div>
      )}

      {/* Slide-up animation */}
      <style>{`
        @keyframes slideUp {
          from { transform: translate(-50%, 100px); opacity: 0; }
          to { transform: translate(-50%, 0); opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default EarningsHistoryPage;
