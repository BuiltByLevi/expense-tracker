import React, { useState } from 'react';
import type { ExpenseCategory } from '../../types';
import toast from 'react-hot-toast';
import { theme } from '../../styles/theme';

interface ExpenseFormProps {
  onAddExpense: (expense: {
    amount: number;
    category: ExpenseCategory;
    description: string;
    date: Date;
  }) => Promise<void>;
}

const categories: ExpenseCategory[] = [
  'Food & Dining',
  'Transportation',
  'Shopping',
  'Entertainment',
  'Bills & Utilities',
  'Healthcare',
  'Education',
  'Rent',
  'Other'
];

const ExpenseForm: React.FC<ExpenseFormProps> = ({ onAddExpense }) => {
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<ExpenseCategory>(categories[0]);
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [submitting, setSubmitting] = useState(false);

  const [errors, setErrors] = useState<{
    amount?: string;
    description?: string;
    date?: string;
  }>({});

  const validate = (): boolean => {
    const newErrors: typeof errors = {};

    // Amount validation
    const numAmount = parseFloat(amount);
    if (!amount || isNaN(numAmount)) {
      newErrors.amount = 'Enter a valid amount';
    } else if (numAmount <= 0) {
      newErrors.amount = 'Amount must be greater than 0';
    } else if (numAmount > 100000000) {
      newErrors.amount = 'Amount seems too large (max ₹10 crore)';
    }

    // Description validation
    const trimmedDesc = description.trim();
    if (trimmedDesc.length > 0 && trimmedDesc.length < 2) {
      newErrors.description = 'Description must be at least 2 characters';
    } else if (trimmedDesc.length > 100) {
      newErrors.description = 'Description must be under 100 characters';
    }

    // Date validation
    if (!date) {
      newErrors.date = 'Please select a date';
    } else {
      const selectedDate = new Date(date);
      const today = new Date();
      const oneYearFromNow = new Date();
      oneYearFromNow.setFullYear(today.getFullYear() + 1);
      if (selectedDate > oneYearFromNow) {
        newErrors.date = 'Date cannot be more than 1 year in the future';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      toast.error('Please fix the errors');
      return;
    }

    setSubmitting(true);
    try {
      await onAddExpense({
        amount: parseFloat(amount),
        category,
        description: description.trim() || 'No description',
        date: new Date(date)
      });
      setAmount('');
      setDescription('');
      setErrors({});
      toast.success('Expense added!');
    } catch {
      toast.error('Failed to add expense');
    } finally {
      setSubmitting(false);
    }
  };

  const inputErrorStyle = {
    borderColor: theme.colors.danger,
    background: 'rgba(239, 68, 68, 0.05)',
  };

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div style={{ display: 'grid', gap: '14px', gridTemplateColumns: '1fr 1fr' }}>
        <div>
          <label className="input-label">Amount</label>
          <div style={{ position: 'relative' }}>
            <span style={{
              position: 'absolute',
              left: '14px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: errors.amount ? theme.colors.danger : theme.colors.textSecondary,
              fontWeight: 600,
              fontSize: '14px',
            }}>₹</span>
            <input
              type="number"
              className="input"
              style={{
                paddingLeft: '32px',
                ...(errors.amount ? inputErrorStyle : {})
              }}
              placeholder="0.00"
              step="1"
              value={amount}
              onChange={(e) => {
                setAmount(e.target.value);
                if (errors.amount) setErrors(prev => ({ ...prev, amount: undefined }));
              }}
            />
          </div>
          {errors.amount && (
            <p style={{ fontSize: '11px', color: theme.colors.danger, margin: '4px 0 0 0', fontWeight: 500 }}>
              {errors.amount}
            </p>
          )}
        </div>

        <div>
          <label className="input-label">Category</label>
          <select
            className="input"
            value={category}
            onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
          >
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="input-label">Date</label>
          <input
            type="date"
            className="input"
            style={errors.date ? inputErrorStyle : {}}
            value={date}
            onChange={(e) => {
              setDate(e.target.value);
              if (errors.date) setErrors(prev => ({ ...prev, date: undefined }));
            }}
          />
          {errors.date && (
            <p style={{ fontSize: '11px', color: theme.colors.danger, margin: '4px 0 0 0', fontWeight: 500 }}>
              {errors.date}
            </p>
          )}
        </div>

        <div>
          <label className="input-label">Description</label>
          <input
            type="text"
            className="input"
            style={errors.description ? inputErrorStyle : {}}
            placeholder="What was it for?"
            maxLength={100}
            value={description}
            onChange={(e) => {
              setDescription(e.target.value);
              if (errors.description) setErrors(prev => ({ ...prev, description: undefined }));
            }}
          />
          {errors.description && (
            <p style={{ fontSize: '11px', color: theme.colors.danger, margin: '4px 0 0 0', fontWeight: 500 }}>
              {errors.description}
            </p>
          )}
        </div>
      </div>

      <button
        type="submit"
        className="btn btn-primary"
        disabled={submitting}
        style={{ width: '100%', marginTop: '20px', padding: '14px' }}
      >
        {submitting ? 'Adding...' : '+ Add Expense'}
      </button>
    </form>
  );
};

export default ExpenseForm;