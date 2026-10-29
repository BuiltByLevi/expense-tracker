import React, { useState, useMemo } from 'react';
import { useEarnings } from '../../context/EarningsContext';
import { theme as design } from '../../styles/theme';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

interface Props {
  onBack: () => void;
}

const EarningsHistoryPageMobile: React.FC<Props> = ({ onBack }) => {
  const { getEarningsForMonth, setEarningsForMonth, earnings: defaultEarnings } = useEarnings();
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [selectedMonths, setSelectedMonths] = useState<Set<string>>(new Set());
  const [bulkAmount, setBulkAmount] = useState('');
  const [bulkSaving, setBulkSaving] = useState(false);

  const months = useMemo(() => {
    const list = [];
    const now = new Date();
    for (let i = 35; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      list.push({ year: d.getFullYear(), month: d.getMonth() });
    }
    return list.reverse();
  }, []);

  const handleSave = async (year: number, month: number) => {
    const num = parseFloat(editValue);
    if (isNaN(num) || num < 0) { toast.error('Enter valid amount'); return; }
    try {
      await setEarningsForMonth(year, month, num, 'confirmed');
      setEditingKey(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save earnings');
    }
  };

  const toggleSelection = (key: string) => {
    setSelectedMonths(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedMonths.size === months.length) setSelectedMonths(new Set());
    else setSelectedMonths(new Set(months.map(m => `${m.year}-${m.month}`)));
  };

  const handleBulkSaveAmount = async () => {
    const num = parseFloat(bulkAmount);
    if (isNaN(num) || num < 0) { toast.error('Enter valid amount'); return; }
    if (selectedMonths.size === 0) { toast.error('Select months'); return; }
    setBulkSaving(true);
    let success = 0;
    for (const key of Array.from(selectedMonths)) {
      const [y, m] = key.split('-').map(Number);
      try {
        await setEarningsForMonth(y, m, num, 'confirmed');
        success++;
      } catch {
        // Continue updating the remaining selected months.
      }
    }
    setBulkSaving(false);
    setSelectedMonths(new Set());
    setBulkAmount('');
    toast.success(`${success} months updated to ₹${num.toLocaleString('en-IN')}`);
  };

  const handleBulkStatus = async (newStatus: 'confirmed' | 'estimated') => {
    if (selectedMonths.size === 0) { toast.error('Select months'); return; }
    setBulkSaving(true);
    let success = 0;
    for (const key of Array.from(selectedMonths)) {
      const [y, m] = key.split('-').map(Number);
      const record = getEarningsForMonth(y, m);
      const amt = record ? record.amount : defaultEarnings;
      try { await setEarningsForMonth(y, m, amt, newStatus); success++; } catch {
        // Continue updating the remaining selected months.
      }
    }
    setBulkSaving(false);
    setSelectedMonths(new Set());
    toast.success(`${success} months marked as ${newStatus}`);
  };

  const allSelected = selectedMonths.size === months.length;

  return (
    <div style={{ minHeight: '100vh', padding: '10px', paddingBottom: selectedMonths.size > 0 ? '180px' : '10px' }}>
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        
        <div className="glass-card animate-in" style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '16px', marginBottom: '16px' }}>
          <div>
            <h1 className="text-gradient" style={{ fontSize: '20px', fontWeight: 700, margin: 0 }}>Earnings History</h1>
            <p style={{ fontSize: '12px', color: design.colors.textSecondary, margin: '4px 0 0 0' }}>Select months to update in bulk.</p>
          </div>
          <button onClick={onBack} className="btn btn-ghost" style={{ padding: '8px', fontSize: '12px', width: '100%' }}>← Back to Dashboard</button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingLeft: '4px', marginBottom: '8px' }}>
            <input type="checkbox" checked={allSelected} onChange={toggleSelectAll} style={{ width: '18px', height: '18px' }} />
            <span style={{ fontSize: '13px', fontWeight: 600, color: design.colors.textSecondary }}>Select All</span>
          </div>
          
          {months.map(({ year, month }) => {
            const key = `${year}-${month}`;
            const record = getEarningsForMonth(year, month);
            const amount = record ? record.amount : defaultEarnings;
            const status = record ? record.status : 'missing';
            const isEditing = editingKey === key;
            const isSelected = selectedMonths.has(key);
            const isCurrentMonth = year === new Date().getFullYear() && month === new Date().getMonth();

            return (
              <div key={key} style={{
                background: isSelected ? 'rgba(99, 102, 241, 0.08)' : isCurrentMonth ? 'rgba(99, 102, 241, 0.04)' : 'var(--glass-bg)',
                borderRadius: '16px', padding: '16px', border: '1px solid var(--glass-border)',
                display: 'flex', flexDirection: 'column', gap: '12px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <input type="checkbox" checked={isSelected} onChange={() => toggleSelection(key)} style={{ width: '18px', height: '18px' }} />
                    <span style={{ fontWeight: 600, color: design.colors.textPrimary, fontSize: '15px' }}>
                      {format(new Date(year, month), 'MMM yyyy')}
                      {isCurrentMonth && <span style={{ marginLeft: '6px', fontSize: '10px', color: design.colors.primary, fontWeight: 700 }}>CUR</span>}
                    </span>
                  </div>
                  {status === 'confirmed' && <span style={{ fontSize: '10px', padding: '3px 8px', borderRadius: '12px', background: 'rgba(16,185,129,0.1)', color: design.colors.success, fontWeight: 600 }}>✓ Confirmed</span>}
                  {status === 'estimated' && <span style={{ fontSize: '10px', padding: '3px 8px', borderRadius: '12px', background: 'rgba(245,158,11,0.1)', color: design.colors.warning, fontWeight: 600 }}>⚠ Est</span>}
                </div>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px' }}>
                  {isEditing ? (
                    <input type="number" className="input" style={{ flex: 1, padding: '10px', fontSize: '15px' }} value={editValue} onChange={e => setEditValue(e.target.value)} autoFocus onKeyDown={e => e.key === 'Enter' && handleSave(year, month)} />
                  ) : (
                    <span style={{ fontWeight: 700, fontSize: '18px', color: design.colors.textPrimary }}>₹{amount.toLocaleString('en-IN')}</span>
                  )}
                  {!isEditing && (
                    <button onClick={() => { setEditingKey(key); setEditValue(amount.toString()); }} className="btn btn-ghost" style={{ padding: '6px 16px', fontSize: '12px' }}>Edit</button>
                  )}
                </div>
                
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
            <button onClick={() => { setSelectedMonths(new Set()); setBulkAmount(''); }} className="btn btn-ghost" style={{ padding: '4px 8px', fontSize: '11px', color: 'white' }}>X</button>
          </div>
          
          <div style={{ display: 'flex', gap: '8px' }}>
            <input type="number" placeholder="Amount ₹" value={bulkAmount} onChange={(e) => setBulkAmount(e.target.value)} style={{ flex: 1, padding: '10px', borderRadius: '10px', background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', fontSize: '14px' }} />
            <button onClick={handleBulkSaveAmount} disabled={bulkSaving || !bulkAmount} className="btn btn-primary" style={{ padding: '10px 16px', fontSize: '13px', fontWeight: 700 }}>{bulkSaving ? '...' : 'Update'}</button>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={() => handleBulkStatus('confirmed')} disabled={bulkSaving} className="btn" style={{ flex: 1, padding: '10px', fontSize: '12px', fontWeight: 600, background: 'rgba(16, 185, 129, 0.15)', color: '#34d399', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '10px' }}>✓ Confirm</button>
            <button onClick={() => handleBulkStatus('estimated')} disabled={bulkSaving} className="btn" style={{ flex: 1, padding: '10px', fontSize: '12px', fontWeight: 600, background: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: '10px' }}>⚠ Est</button>
          </div>
        </div>
      )}
      <style>{`@keyframes slideUp { from { transform: translate(-50%, 100px); opacity: 0; } to { transform: translate(-50%, 0); opacity: 1; } }`}</style>
    </div>
  );
};

export default EarningsHistoryPageMobile;