import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { theme } from '../../styles/theme';
import { CheckIcon, AlertIcon } from '../common/FinanceIcons';
import { useEarnings } from '../../context/EarningsContext';
import { useIncome } from '../../context/IncomeContext';
import { deriveMonthlyEarnings } from '../../utils/earningsDerivation';

interface EarningsModalProps {
  isOpen: boolean;
  onClose: () => void;
  year: number;
  month: number;
}

const EarningsModal: React.FC<EarningsModalProps> = ({ isOpen, onClose, year, month }) => {
  const { getEarningsForMonth, setEarningsForMonth, revertEarningsOverride, earnings: defaultEarnings } = useEarnings();
  const { getIncomeForMonth } = useIncome();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>('');
  const [saveError, setSaveError] = useState<string>('');

  const existingRecord = getEarningsForMonth(year, month);
  const monthKey = `${isOpen ? 'open' : 'closed'}:${year}:${month}`;
  const { entries: importedIncome } = getIncomeForMonth(year, month);
  const derived = deriveMonthlyEarnings(importedIncome);
  // An imported month the user has replaced with a manual total.
  const isOverridden = !!derived && !!existingRecord?.override;
  // Which month (if any) the user switched from the read-only imported
  // breakdown into the override form; keyed so it resets per month/open.
  const [overrideFor, setOverrideFor] = useState<string | null>(null);
  const initialAmount = isOverridden
    ? String(existingRecord!.amount)
    : derived
      ? String(derived.amount)
      : existingRecord
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

  // Reset the override form whenever the modal closes, so reopening starts
  // from the imported breakdown again (render-phase reset of own state).
  if (!isOpen && overrideFor !== null) setOverrideFor(null);
  if (!isOpen) return null;

  const monthLabel = format(new Date(year, month), 'MMMM yyyy');

  if (derived && !isOverridden && overrideFor !== monthKey) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
            <div>
              <h2 style={{ fontSize: '22px', fontWeight: 700, color: theme.colors.textPrimary, marginBottom: '6px' }}>
                Earnings
              </h2>
              <p style={{ fontSize: '14px', color: theme.colors.textSecondary, margin: 0 }}>{monthLabel}</p>
            </div>
            <button
              onClick={onClose}
              aria-label="Close"
              style={{ background: 'rgba(0,0,0,0.05)', border: 'none', width: '32px', height: '32px', borderRadius: '50%', cursor: 'pointer', fontSize: '18px', color: theme.colors.textSecondary }}
            >
              ×
            </button>
          </div>

          <div style={{ marginBottom: '16px', padding: '14px 16px', background: `rgba(${theme.colors.successRgb}, 0.08)`, border: `1px solid ${theme.colors.success}30`, borderRadius: '12px' }}>
            <p style={{ fontSize: '13px', fontWeight: 700, color: theme.colors.textPrimary, margin: 0 }}>
              ₹{derived.amount.toLocaleString('en-IN')} earned this month
            </p>
            <p style={{ fontSize: '12px', color: theme.colors.textSecondary, margin: '4px 0 0 0' }}>
              Counted as this month's earnings — every imported credit this month (salary, interest, Razorpay/Payload settlements, etc.), excluding refunds and transfers. To change it, edit the transactions in the Account Statement, or override this month's total.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px', maxHeight: '180px', overflowY: 'auto' }}>
            {derived.countedEntries.map((entry) => (
              <div key={entry.id} style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', fontSize: '12px', padding: '8px 10px', background: `rgba(${theme.colors.successRgb}, 0.06)`, borderRadius: '8px' }}>
                <span style={{ color: theme.colors.textSecondary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {format(entry.date, 'dd MMM')} · {entry.category} · {entry.description}
                </span>
                <span style={{ fontWeight: 600, color: theme.colors.textPrimary, flexShrink: 0 }}>₹{entry.amount.toLocaleString('en-IN')}</span>
              </div>
            ))}
          </div>

          {derived.otherEntries.length > 0 && (
            <div style={{ marginBottom: '20px' }}>
              <p style={{ fontSize: '11px', color: theme.colors.textTertiary, margin: '0 0 8px 0', textTransform: 'uppercase', fontWeight: 600 }}>
                Other credits this month (not counted as earnings)
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '140px', overflowY: 'auto' }}>
                {derived.otherEntries.map((entry) => (
                  <div key={entry.id} style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', fontSize: '12px', padding: '8px 10px', background: 'rgba(0,0,0,0.03)', borderRadius: '8px' }}>
                    <span style={{ color: theme.colors.textSecondary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {format(entry.date, 'dd MMM')} · {entry.category} · {entry.description}
                    </span>
                    <span style={{ fontWeight: 600, color: theme.colors.textSecondary, flexShrink: 0 }}>₹{entry.amount.toLocaleString('en-IN')}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: '12px' }}>
            <button onClick={onClose} className="btn btn-ghost" style={{ flex: 1, padding: '14px' }}>
              Close
            </button>
            <button
              onClick={() => {
                setOverrideFor(monthKey);
                setDraft({ monthKey, amount: String(derived.amount), status: 'confirmed' });
              }}
              className="btn btn-primary"
              style={{ flex: 1, padding: '14px' }}
            >
              Override total
            </button>
          </div>
        </div>
      </div>
    );
  }

  const handleRevert = async () => {
    setSaving(true);
    try {
      await revertEarningsOverride(year, month);
      setOverrideFor(null);
      onClose();
    } catch {
      // toast handled in context
    } finally {
      setSaving(false);
    }
  };

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
      // On a month with imported income, a manual amount is stored as an
      // override — otherwise the imported sum would keep winning.
      await setEarningsForMonth(year, month, parseFloat(amount), status, { override: !!derived });
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
              {derived ? 'Override Earnings' : 'Set Earnings'}
            </h2>
            <p style={{ fontSize: '14px', color: theme.colors.textSecondary, margin: 0 }}>
              {monthLabel} — only affects this month
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
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

        {derived && (
          <div style={{
            marginBottom: '16px',
            padding: '10px 12px',
            background: 'rgba(245, 158, 11, 0.1)',
            borderRadius: '10px',
            fontSize: '12px',
            color: theme.colors.textSecondary,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '10px',
          }}>
            <span style={{ display: 'inline-flex', alignItems: 'flex-start', gap: '6px' }}>
              <AlertIcon size={12} color={theme.colors.warning} style={{ flexShrink: 0, marginTop: '2px' }} />
              <span>
                {isOverridden ? 'Overriding' : 'This will override'} the imported total of{' '}
                <strong>₹{derived.amount.toLocaleString('en-IN')}</strong>. Net cash flow and balance use this amount; the
                Account Statement still lists the real transactions.
              </span>
            </span>
            {isOverridden && (
              <button
                type="button"
                onClick={handleRevert}
                disabled={saving}
                className="btn btn-ghost"
                style={{ padding: '6px 10px', fontSize: '11px', flexShrink: 0 }}
              >
                ↺ Revert
              </button>
            )}
          </div>
        )}

        {!derived && existingRecord && (
          <div style={{
            marginBottom: '16px',
            padding: '10px 12px',
            background: existingRecord.status === 'estimated'
              ? 'rgba(245, 158, 11, 0.1)'
              : `rgba(${theme.colors.successRgb}, 0.1)`,
            borderRadius: '10px',
            fontSize: '12px',
            color: theme.colors.textSecondary,
          }}>
            {existingRecord.status === 'estimated' ? (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}><AlertIcon size={12} color={theme.colors.warning} style={{ flexShrink: 0 }} /><span>Currently <strong>estimated</strong> (migrated from default). Confirm to lock in this value.</span></span>
            ) : (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}><CheckIcon size={12} color={theme.colors.success} strokeWidth={2.5} style={{ flexShrink: 0 }} /><span>Currently <strong>confirmed</strong>. Editing will update this month only.</span></span>
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
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}><AlertIcon size={12} color={theme.colors.danger} style={{ flexShrink: 0 }} /> {saveError}</span>
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
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', justifyContent: 'center' }}><CheckIcon size={12} color={status === 'confirmed' ? 'white' : theme.colors.textSecondary} strokeWidth={2.5} /> Confirmed</span>
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
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', justifyContent: 'center' }}><AlertIcon size={12} color={status === 'estimated' ? 'white' : theme.colors.textSecondary} strokeWidth={2.5} /> Estimated</span>
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