import React, { useState, useEffect } from 'react';
import type { Expense, ExpenseCategory } from '../../types';
import toast from 'react-hot-toast';

interface EditExpenseModalProps {
  expense: Expense | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (id: string, data: any) => Promise<void>;
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

const EditExpenseModal: React.FC<EditExpenseModalProps> = ({ expense, isOpen, onClose, onUpdate }) => {
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<ExpenseCategory>(categories[0]);
  const [description, setDescription] = useState('');
  const [date, setDate] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (expense) {
      setAmount(expense.amount.toString());
      setCategory(expense.category as ExpenseCategory);
      setDescription(expense.description);
      setDate(new Date(expense.date).toISOString().split('T')[0]);
    }
  }, [expense]);

  if (!isOpen || !expense) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!amount || parseFloat(amount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    setSubmitting(true);
    try {
      await onUpdate(expense.id, {
        amount: parseFloat(amount),
        category,
        description: description || 'No description',
        date: new Date(date)
      });
      toast.success('Expense updated successfully!');
      onClose();
    } catch (error) {
      toast.error('Failed to update expense');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1000
    }} onClick={onClose}>
      <div style={{
        background: 'white',
        padding: '2rem',
        borderRadius: '20px',
        width: '90%',
        maxWidth: '500px',
        boxShadow: '0 10px 40px rgba(0,0,0,0.2)'
      }} onClick={(e) => e.stopPropagation()}>
        <h2 style={{ color: '#2d6a4f', marginBottom: '1.5rem' }}>✏️ Edit Expense</h2>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: '#2d6a4f', fontWeight: 'bold' }}>Amount (₹)</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              step="1"
              required
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '2px solid #e0e0e0',
                borderRadius: '10px',
                fontSize: '1rem'
              }}
            />
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: '#2d6a4f', fontWeight: 'bold' }}>Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '2px solid #e0e0e0',
                borderRadius: '10px',
                fontSize: '1rem'
              }}
            >
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: '#2d6a4f', fontWeight: 'bold' }}>Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '2px solid #e0e0e0',
                borderRadius: '10px',
                fontSize: '1rem'
              }}
            />
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: '#2d6a4f', fontWeight: 'bold' }}>Description</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What did you spend on?"
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '2px solid #e0e0e0',
                borderRadius: '10px',
                fontSize: '1rem'
              }}
            />
          </div>
          <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                flex: 1,
                padding: '0.75rem',
                background: '#6c757d',
                color: 'white',
                border: 'none',
                borderRadius: '10px',
                cursor: 'pointer',
                fontWeight: 'bold'
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              style={{
                flex: 1,
                padding: '0.75rem',
                background: '#2d6a4f',
                color: 'white',
                border: 'none',
                borderRadius: '10px',
                cursor: submitting ? 'not-allowed' : 'pointer',
                fontWeight: 'bold'
              }}
            >
              {submitting ? 'Updating...' : 'Update Expense'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditExpenseModal;