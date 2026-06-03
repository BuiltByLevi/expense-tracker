import React from 'react';
import type { Expense } from '../../types';
import { format } from 'date-fns';

interface ExpenseListProps {
  expenses: Expense[];
  onDelete: (id: string) => Promise<void>;
  onEdit: (expense: Expense) => void;
}

const ExpenseList: React.FC<ExpenseListProps> = ({ expenses, onDelete, onEdit }) => {
  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this expense?')) {
      await onDelete(id);
    }
  };

  if (expenses.length === 0) {
    return (
      <div style={{ 
        textAlign: 'center', 
        padding: '60px', 
        color: '#95a5a6',
        fontSize: '16px'
      }}>
        📭 No expenses yet. Add your first expense above!
      </div>
    );
  }

  return (
    <div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ 
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              borderRadius: '12px'
            }}>
              <th style={{ padding: '14px 12px', textAlign: 'left', borderRadius: '12px 0 0 0' }}>Date</th>
              <th style={{ padding: '14px 12px', textAlign: 'left' }}>Category</th>
              <th style={{ padding: '14px 12px', textAlign: 'left' }}>Description</th>
              <th style={{ padding: '14px 12px', textAlign: 'right' }}>Amount</th>
              <th style={{ padding: '14px 12px', textAlign: 'center', borderRadius: '0 12px 0 0' }}>Actions</th>
             </tr>
          </thead>
          <tbody>
            {expenses.map(expense => (
              <tr key={expense.id} style={{ borderBottom: '1px solid #f0f0f0', transition: 'background 0.3s ease' }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#f8f9fa'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'white'}>
                <td style={{ padding: '14px 12px', fontSize: '14px', color: '#2c3e50' }}>
                  {format(new Date(expense.date), 'dd MMM yyyy')}
                 </td>
                <td style={{ padding: '14px 12px' }}>
                  <span style={{
                    background: '#e8f5e9',
                    color: '#2d6a4f',
                    padding: '6px 12px',
                    borderRadius: '30px',
                    fontSize: '12px',
                    fontWeight: '600',
                    display: 'inline-block'
                  }}>
                    {expense.category}
                  </span>
                 </td>
                <td style={{ padding: '14px 12px', fontSize: '14px', color: '#555' }}>
                  {expense.description}
                 </td>
                <td style={{ padding: '14px 12px', textAlign: 'right', fontWeight: 'bold', color: '#2c3e50', fontSize: '15px' }}>
                  ₹{expense.amount.toLocaleString('en-IN')}
                 </td>
                <td style={{ padding: '14px 12px', textAlign: 'center' }}>
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                    <button
                      onClick={() => onEdit(expense)}
                      style={{
                        background: '#3498db',
                        color: 'white',
                        border: 'none',
                        borderRadius: '30px',
                        padding: '6px 16px',
                        cursor: 'pointer',
                        fontSize: '13px',
                        fontWeight: '500',
                        transition: 'all 0.3s ease'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = '#2980b9'}
                      onMouseLeave={(e) => e.currentTarget.style.background = '#3498db'}
                    >
                      ✏️ Edit
                    </button>
                    <button
                      onClick={() => handleDelete(expense.id)}
                      style={{
                        background: '#e74c3c',
                        color: 'white',
                        border: 'none',
                        borderRadius: '30px',
                        padding: '6px 16px',
                        cursor: 'pointer',
                        fontSize: '13px',
                        fontWeight: '500',
                        transition: 'all 0.3s ease'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = '#c0392b'}
                      onMouseLeave={(e) => e.currentTarget.style.background = '#e74c3c'}
                    >
                      🗑️ Delete
                    </button>
                  </div>
                 </td>
               </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ExpenseList;