import React, { useState, useMemo } from 'react';
import { useEarnings } from '../../context/EarningsContext';
import { theme as design } from '../../styles/theme';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

interface EarningsHistoryPageProps {
  onBack: () => void;
}

const EarningsHistoryPage: React.FC<EarningsHistoryPageProps> = ({ onBack }) => {
  const { getEarningsForMonth, setEarningsForMonth, earnings: defaultEarnings } = useEarnings();
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  
  // Bulk selection state
  const [selectedMonths, setSelectedMonths] = useState<Set<string>>(new Set());
  const [bulkAmount, setBulkAmount] = useState('');
  const [bulkSaving, setBulkSaving] = useState(false);

  // Generate a list of the last 36 months (3 years) to display
  const months = useMemo(() => {
    const list = [];
    const now = new Date();
    for (let i = 35; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      list.push({ year: d.getFullYear(), month: d.getMonth() });
    }
    return list.reverse(); // Newest first
  }, []);

  const handleEditClick = (year: number, month: number, currentAmount: number) => {
    const key = `${year}-${month}`;
    setEditingKey(key);
    setEditValue(currentAmount.toString());
  };

  const handleSave = async (year: number, month: number) => {
    const num = parseFloat(editValue);
    if (isNaN(num) || num < 0) {
      toast.error('Enter a valid amount');
      return
    }
    try {
      await setEarningsForMonth(year, month, num, 'confirmed');
      setEditingKey(null);
    } catch {
      // error toast handled in context
    }
  };

  // Toggle single row selection
  const toggleSelection = (key: string) => {
    setSelectedMonths(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  // Select all / deselect all
  const toggleSelectAll = () => {
    if (selectedMonths.size === months.length) {
      setSelectedMonths(new Set());
    } else {
      setSelectedMonths(new Set(months.map(m => `${m.year}-${m.month}`)));
    }
  };

  // Bulk update selected months
  const handleBulkSave = async () => {
    const num = parseFloat(bulkAmount);
    if (isNaN(num) || num < 0) {
      toast.error('Enter a valid amount');
      return;
    }
    if (selectedMonths.size === 0) {
      toast.error('Select at least one month');
      return;
    }

    setBulkSaving(true);
    let successCount = 0;
    let failCount = 0;

    for (const key of Array.from(selectedMonths)) {
      const [yearStr, monthStr] = key.split('-');
      const year = parseInt(yearStr);
      const month = parseInt(monthStr);
      try {
        await setEarningsForMonth(year, month, num, 'confirmed');
        successCount++;
      } catch {
        failCount++;
      }
    }

    setBulkSaving(false);
    setSelectedMonths(new Set());
    setBulkAmount('');

    if (failCount === 0) {
      toast.success(`${successCount} months updated to ₹${num.toLocaleString('en-IN')}`);
    } else {
      toast.error(`Updated ${successCount}, failed ${failCount}`);
    }
  };

  const allSelected = selectedMonths.size === months.length && months.length > 0;
  const someSelected = selectedMonths.size > 0 && !allSelected;

  return (
    <div style={{ minHeight: '100vh', padding: '24px', paddingBottom: selectedMonths.size > 0 ? '120px' : '24px' }}>
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
          <button onClick={onBack} className="btn btn-ghost" style={{ padding: '10px 20px' }}>
            ← Back to Dashboard
          </button>
        </div>

        {/* Info Banner */}
        <div className="glass-card animate-in animate-in-delay-1" style={{
          padding: '16px 24px', marginBottom: '20px',
          background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.05) 0%, rgba(139, 92, 246, 0.05) 100%)',
          border: `1px solid ${design.colors.primary}20`,
        }}>
          <p style={{ fontSize: '13px', color: design.colors.textSecondary, margin: 0 }}>
            💡 <strong>Tip:</strong> Tick the checkboxes to select multiple months, then update them all at once using the bar at the bottom.
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
                const record = getEarningsForMonth(year, month);
                const amount = record ? record.amount : defaultEarnings;
                const status = record ? record.status : 'missing';
                const isEditing = editingKey === key;
                const isCurrentMonth = year === new Date().getFullYear() && month === new Date().getMonth();
                const isSelected = selectedMonths.has(key);

                return (
                  <tr key={key} style={{ 
                    borderBottom: '1px solid rgba(0,0,0,0.04)',
                    background: isSelected 
                      ? 'rgba(99, 102, 241, 0.08)' 
                      : isCurrentMonth 
                        ? 'rgba(99, 102, 241, 0.04)' 
                        : 'transparent',
                  }}>
                    <td style={{ padding: '16px 12px 16px 24px' }}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelection(key)}
                        style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                      />
                    </td>
                    <td style={{ padding: '16px 12px', fontWeight: 600, color: design.colors.textPrimary }}>
                      {format(new Date(year, month), 'MMMM yyyy')}
                      {isCurrentMonth && <span style={{ marginLeft: '8px', fontSize: '10px', color: design.colors.primary, fontWeight: 700 }}>CURRENT</span>}
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
                      {status === 'confirmed' && <span style={{ padding: '4px 10px', background: 'rgba(16, 185, 129, 0.1)', color: design.colors.success, borderRadius: '20px', fontSize: '11px', fontWeight: 600 }}>✓ Confirmed</span>}
                      {status === 'estimated' && <span style={{ padding: '4px 10px', background: 'rgba(245, 158, 11, 0.1)', color: design.colors.warning, borderRadius: '20px', fontSize: '11px', fontWeight: 600 }}>⚠ Estimated</span>}
                      {status === 'missing' && <span style={{ padding: '4px 10px', background: 'rgba(0,0,0,0.05)', color: design.colors.textSecondary, borderRadius: '20px', fontSize: '11px', fontWeight: 600 }}>Default</span>}
                    </td>
                    <td style={{ padding: '16px 24px 16px 12px', textAlign: 'center' }}>
                      {isEditing ? (
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
          maxWidth: '860px',
          background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
          borderRadius: '20px',
          padding: '16px 24px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
          border: '1px solid rgba(139, 92, 246, 0.3)',
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
          
          <div style={{ flex: 1, minWidth: '200px', display: 'flex', gap: '8px', alignItems: 'center' }}>
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
                onKeyDown={(e) => e.key === 'Enter' && handleBulkSave()}
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
            <button
              onClick={() => {
                setSelectedMonths(new Set());
                setBulkAmount('');
              }}
              className="btn btn-ghost"
              style={{ padding: '10px 16px', fontSize: '13px', color: '#cbd5e1', background: 'rgba(255,255,255,0.05)' }}
            >
              Cancel
            </button>
            <button
              onClick={handleBulkSave}
              disabled={bulkSaving || !bulkAmount}
              className="btn btn-primary"
              style={{ padding: '10px 20px', fontSize: '13px', fontWeight: 700 }}
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