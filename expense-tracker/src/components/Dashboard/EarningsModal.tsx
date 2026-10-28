import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { theme } from '../../styles/theme';
import { useEarnings } from '../../context/EarningsContext';

interface EarningsModalProps {
  isOpen: boolean;
  onClose: () => void;
  year: number;
  month: number;
}

const EarningsModal: React.FC<EarningsModalProps> = ({ isOpen, onClose, year, month }) => {
  const { getEarningsForMonth, setEarningsForMonth, earnings: defaultEarnings } = useEarnings();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>('');
  const [saveError, setSaveError] = useState<string>('');

  const existingRecord = getEarningsForMonth(year, month);
  const monthKey = `${isOpen ? 'open' : 'closed'}:${year}:${month}`;
  const initialAmount = existingRecord
    ? String(existingRecord.amount)
    : String(defaultEarnings || 0);
  const initialStatus = existingRecord?.status ?? 'estimated';
  const [draft, setDraft] = useState(() => ({
    monthKey,
    amount: initialAmount,
    status: initialStatus as 'confirmed' | 'estimated',
  }));

  const amount = draft.monthKey === monthKey ? draft.amount : initialAmount;
  const status = draft.monthKey === monthKey ? draft.status : initialStatus;
  const setAmount = (value: string) => {
    setDraft((current) => ({
      monthKey,
      amount: value,
      status: current.monthKey === monthKey ? current.status : initialStatus,
    }));
  };
  const setStatus = (value: 'confirmed' | 'estimated') => {
    setDraft((current) => ({
      monthKey,
      amount: current.monthKey === monthKey ? current.amount : initialAmount,
      status: value,
    }));
  };

  if (!isOpen) return null;

  const monthLabel = format(new Date(year, month), 'MMMM yyyy');

  const validate = (): boolean => {
    const num = parseFloat(amount);
    if (amount === '' || isNaN(num)) {
      setError('Enter a valid amount');
      return false;
    }
    if (num < 0) {
      setError('Earnings cannot be negative');
      return false;
    }
    if (num > 100000000) {
      setError('Amount seems too large (max ₹10 crore)');
      return false;
    }
    setError('');
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) {
      toast.error('Please fix the errors');
      return;
    }
    setSaving(true);
    setSaveError('');
    try {
      await setEarningsForMonth(year, month, parseFloat(amount), status);
      onClose(); // close modal on success
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save earnings';
      setSaveError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
          <div>
            <h2 style={{ fontSize: '22px', fontWeight: 700, color: theme.colors.textPrimary, marginBottom: '6px' }}>
              Set Earnings
            </h2>
            <p style={{ fontSize: '14px', color: theme.colors.textSecondary, margin: 0 }}>
              {monthLabel} — only affects this month
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(0,0,0,0.05)',
              border: 'none',
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              cursor: 'pointer',
              fontSize: '18px',
              color: theme.colors.textSecondary,
            }}
          >
            ×
          </button>
        </div>

        {existingRecord && (
          <div style={{
            marginBottom: '16px',
            padding: '10px 12px',
            background: existingRecord.status === 'estimated'
              ? 'rgba(245, 158, 11, 0.1)'
              : 'rgba(16, 185, 129, 0.1)',
            borderRadius: '10px',
            fontSize: '12px',
            color: theme.colors.textSecondary,
          }}>
            {existingRecord.status === 'estimated' ? (
              <>⚠ Currently <strong>estimated</strong> (migrated from default). Confirm to lock in this value.</>
            ) : (
              <>✓ Currently <strong>confirmed</strong>. Editing will update this month only.</>
            )}
          </div>
        )}

        {saveError && (
          <div style={{
            marginBottom: '16px',
            padding: '10px 12px',
            background: 'rgba(239, 68, 68, 0.1)',
            border: `1px solid ${theme.colors.danger}40`,
            borderRadius: '10px',
            fontSize: '12px',
            color: theme.colors.danger,
            fontWeight: 500,
          }}>
            ⚠ {saveError}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <div style={{ marginBottom: '16px' }}>
            <label className="input-label">Monthly Earnings (₹)</label>
            <input
              type="number"
              className="input"
              style={{
                fontSize: '18px',
                fontWeight: 600,
                padding: '16px',
                ...(error ? { borderColor: theme.colors.danger, background: 'rgba(239, 68, 68, 0.05)' } : {})
              }}
              value={amount}
              onChange={(e) => {
                setAmount(e.target.value);
                if (error) setError('');
              }}
              placeholder="0"
              step="1000"
              autoFocus
            />
            {error && (
              <p style={{ fontSize: '12px', color: theme.colors.danger, margin: '6px 0 0 0', fontWeight: 500 }}>
                {error}
              </p>
            )}
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label className="input-label">Status</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                onClick={() => setStatus('confirmed')}
                style={{
                  flex: 1,
                  padding: '10px',
                  background: status === 'confirmed' ? theme.colors.primary : 'rgba(0,0,0,0.05)',
                  color: status === 'confirmed' ? 'white' : theme.colors.textSecondary,
                  border: 'none',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: 600,
                }}
              >
                ✓ Confirmed
              </button>
              <button
                type="button"
                onClick={() => setStatus('estimated')}
                style={{
                  flex: 1,
                  padding: '10px',
                  background: status === 'estimated' ? theme.colors.warning : 'rgba(0,0,0,0.05)',
                  color: status === 'estimated' ? 'white' : theme.colors.textSecondary,
                  border: 'none',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: 600,
                }}
              >
                ⚠ Estimated
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              type="button"
              onClick={onClose}
              className="btn btn-ghost"
              style={{ flex: 1, padding: '14px' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={saving}
              style={{ flex: 1, padding: '14px' }}
            >
              {saving ? 'Saving...' : `Save for ${format(new Date(year, month), 'MMM yyyy')}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EarningsModal;