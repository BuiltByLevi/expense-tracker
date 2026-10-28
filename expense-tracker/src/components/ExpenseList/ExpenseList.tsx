import React, { useState, useEffect } from 'react';
import type { Expense } from '../../types';
import { format } from 'date-fns';
import { theme, categoryColors } from '../../styles/theme';

interface ExpenseListProps {
  expenses: Expense[];
  onDelete: (id: string) => Promise<void>;
  onEdit: (expense: Expense) => void;
}

const ExpenseList: React.FC<ExpenseListProps> = ({ expenses, onDelete, onEdit }) => {
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleDelete = async (id: string) => {
    if (window.confirm('Delete this expense?')) {
      await onDelete(id);
    }
  };

  const getCategoryColor = (category: string) => {
    const categories = ['Food & Dining', 'Transportation', 'Shopping', 'Entertainment', 'Bills & Utilities', 'Healthcare', 'Education', 'Rent', 'Other'];
    const idx = categories.indexOf(category);
    return categoryColors[idx % categoryColors.length];
  };

  if (expenses.length === 0) {
    return (
      <div style={{
        textAlign: 'center',
        padding: '60px 20px',
        color: theme.colors.textTertiary,
      }}>
        <div style={{ fontSize: '48px', marginBottom: '12px' }}>📭</div>
        <p style={{ fontSize: '14px', fontWeight: 500, margin: 0 }}>
          No expenses yet for this month
        </p>
      </div>
    );
  }

  if (isMobile) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {expenses.map(expense => (
          <div key={expense.id} style={{
            background: 'rgba(255,255,255,0.6)',
            borderRadius: '14px',
            padding: '14px',
            border: '1px solid rgba(0,0,0,0.04)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
              <span style={{
                background: `${getCategoryColor(expense.category)}20`,
                color: getCategoryColor(expense.category),
                padding: '4px 10px',
                borderRadius: '20px',
                fontSize: '11px',
                fontWeight: 600,
              }}>
                {expense.category}
              </span>
              <span style={{ fontWeight: 700, fontSize: '16px', color: theme.colors.textPrimary }}>
                ₹{expense.amount.toLocaleString('en-IN')}
              </span>
            </div>
            <p style={{ fontSize: '13px', color: theme.colors.textSecondary, margin: '0 0 10px 0' }}>
              {expense.description}
            </p>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '11px', color: theme.colors.textTertiary }}>
                {format(new Date(expense.date), 'dd MMM yyyy')}
              </span>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  onClick={() => onEdit(expense)}
                  className="btn btn-ghost"
                  style={{ padding: '6px 12px', fontSize: '11px' }}
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(expense.id)}
                  className="btn btn-danger"
                  style={{ padding: '6px 12px', fontSize: '11px' }}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div>
      {expenses.map((expense, idx) => (
        <div
          key={expense.id}
          style={{
            display: 'grid',
            gridTemplateColumns: '100px 1fr 1fr auto auto',
            gap: '16px',
            alignItems: 'center',
            padding: '14px 0',
            borderBottom: idx < expenses.length - 1 ? '1px solid rgba(0,0,0,0.04)' : 'none',
            transition: 'background 0.2s ease',
          }}
        >
          <span style={{ fontSize: '13px', color: theme.colors.textSecondary, fontWeight: 500 }}>
            {format(new Date(expense.date), 'dd MMM')}
          </span>
          <span style={{
            background: `${getCategoryColor(expense.category)}20`,
            color: getCategoryColor(expense.category),
            padding: '4px 10px',
            borderRadius: '20px',
            fontSize: '11px',
            fontWeight: 600,
            display: 'inline-block',
            width: 'fit-content',
          }}>
            {expense.category}
          </span>
          <span style={{ fontSize: '13px', color: theme.colors.textPrimary, fontWeight: 500 }}>
            {expense.description}
          </span>
          <span style={{ fontSize: '15px', fontWeight: 700, color: theme.colors.textPrimary, textAlign: 'right' }}>
            ₹{expense.amount.toLocaleString('en-IN')}
          </span>
          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              onClick={() => onEdit(expense)}
              className="btn btn-ghost"
              style={{ padding: '6px 10px', fontSize: '11px' }}
            >
              Edit
            </button>
            <button
              onClick={() => handleDelete(expense.id)}
              className="btn btn-danger"
              style={{ padding: '6px 10px', fontSize: '11px' }}
            >
              Delete
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ExpenseList;