import React, { useState } from 'react';
import type { ExpenseCategory } from '../../types';
import toast from 'react-hot-toast';

interface ExpenseFormProps {
  onAddExpense: (expense: any) => Promise<void>;
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!amount || parseFloat(amount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    setSubmitting(true);
    try {
      await onAddExpense({
        amount: parseFloat(amount),
        category,
        description: description || 'No description',
        date: new Date(date)
      });
      setAmount('');
      setDescription('');
      toast.success('Expense added successfully!');
    } catch (error) {
      toast.error('Failed to add expense');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{
      background: 'white',
      padding: '1.5rem',
      borderRadius: '10px',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      marginBottom: '2rem'
    }}>
      <h3 style={{ marginBottom: '1rem', color: '#333' }}>Add New Expense</h3>
      <form onSubmit={handleSubmit}>
        <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: '1fr 1fr' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: '#666' }}>Amount (₹)</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              step="1"
              required
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #ddd',
                borderRadius: '5px'
              }}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: '#666' }}>Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #ddd',
                borderRadius: '5px'
              }}
            >
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: '#666' }}>Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #ddd',
                borderRadius: '5px'
              }}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: '#666' }}>Description</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What did you spend on?"
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #ddd',
                borderRadius: '5px'
              }}
            />
          </div>
        </div>
        <button
          type="submit"
          disabled={submitting}
          style={{
            marginTop: '1rem',
            padding: '0.5rem 1rem',
            background: '#667eea',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: submitting ? 'not-allowed' : 'pointer',
            width: '100%'
          }}
        >
          {submitting ? 'Adding...' : 'Add Expense'}
        </button>
      </form>
    </div>
  );
};

export default ExpenseForm;