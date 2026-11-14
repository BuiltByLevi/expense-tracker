import React, { useState } from 'react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { INCOME_CATEGORIES, type Income, type IncomeCategory } from '../../types';
import { theme } from '../../styles/theme';
import { parseLocalDateInput } from '../../utils/dateInput';

interface EditIncomeModalProps {
  income: Income | null;
  onClose: () => void;
  onUpdate: (id: string, data: Partial<Pick<Income, 'amount' | 'category' | 'description' | 'date'>>) => Promise<void>;
}

/**
 * Edit a credit — including one saved from an uploaded bank statement.
 * Same layout as EditExpenseModal. Monthly Earnings for an imported month
 * is derived from these entries, so an edit here flows straight into the
 * KPI cards (unless that month has a manual override).
 */
const EditIncomeModal: React.FC<EditIncomeModalProps> = ({ income, onClose, onUpdate }) => {
  if (!income) return null;
  // Keyed so the form re-initialises for each entry opened.
  return <EditIncomeForm key={income.id} income={income} onClose={onClose} onUpdate={onUpdate} />;
};

const EditIncomeForm: React.FC<{ income: Income } & Omit<EditIncomeModalProps, 'income'>> = ({ income, onClose, onUpdate }) => {
  const [amount, setAmount] = useState(income.amount.toString());
  const [category, setCategory] = useState<IncomeCategory>(income.category);
  const [description, setDescription] = useState(income.description);
  // format() reads local date parts (see EditExpenseModal for why not toISOString).
  const [date, setDate] = useState(format(new Date(income.date), 'yyyy-MM-dd'));
  const [submitting, setSubmitting] = useState(false);
  const fromImport = income.source === 'import';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseFloat(amount);
    if (!amount || isNaN(num) || num <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }
    if (!date) {
      toast.error('Please select a date');
      return;
    }
    setSubmitting(true);
    try {
      await onUpdate(income.id, {
        amount: num,
        category,
        description: description.trim() || 'No description',
        date: parseLocalDateInput(date),
      });
      toast.success('Income updated!');
      onClose();
    } catch {
      toast.error('Failed to update');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
          <div>
            <h2 style={{ fontSize: '22px', fontWeight: 700, color: theme.colors.textPrimary, marginBottom: '6px' }}>
              Edit Income
            </h2>
            <p style={{ fontSize: '14px', color: theme.colors.textSecondary, margin: 0 }}>
              Update the credit details
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{ background: 'rgba(0,0,0,0.05)', border: 'none', width: '32px', height: '32px', borderRadius: '50%', cursor: 'pointer', fontSize: '18px', color: theme.colors.textSecondary }}
          >
            ×
          </button>
        </div>

        {fromImport && (
          <div style={{
            marginBottom: '16px', padding: '10px 12px', borderRadius: '10px', fontSize: '12px',
            background: `rgba(${theme.colors.successRgb}, 0.08)`, color: theme.colors.textSecondary,
          }}>
            Imported from a bank statement
            {income.originalNarration ? (
              <>: <span style={{ fontStyle: 'italic' }}>{income.originalNarration}</span></>
            ) : '.'}
            {' '}The original narration is kept for reference.
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gap: '16px' }}>
            <div>
              <label className="input-label">Amount (₹)</label>
              <input type="number" className="input" value={amount} onChange={(e) => setAmount(e.target.value)} step="1" required />
            </div>
            <div>
              <label className="input-label">Category</label>
              <select className="input" value={category} onChange={(e) => setCategory(e.target.value as IncomeCategory)}>
                {INCOME_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
              {(category === 'Refund' || category === 'Transfer') && (
                <p style={{ fontSize: '11px', color: theme.colors.textTertiary, margin: '6px 0 0 0' }}>
                  Refunds and transfers count toward cash flow but not toward Monthly Earnings.
                </p>
              )}
            </div>
            <div>
              <label className="input-label">Date</label>
              <input type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} required />
            </div>
            <div>
              <label className="input-label">Description</label>
              <input type="text" className="input" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={100} />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
            <button type="button" onClick={onClose} className="btn btn-ghost" style={{ flex: 1, padding: '14px' }}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting} style={{ flex: 1, padding: '14px' }}>
              {submitting ? 'Updating...' : 'Update'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditIncomeModal;
