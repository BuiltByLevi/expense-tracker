import React, { useState, useEffect } from 'react';
import type { Expense } from '../../types';
import { format } from 'date-fns';

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
    if (window.confirm('Are you sure you want to delete this expense?')) {
      await onDelete(id);
    }
  };

  if (expenses.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '40px', color: '#95a5a6', fontSize: '14px' }}>
        📭 No expenses yet. Add your first expense above!
      </div>
    );
  }

  // Mobile view - Card layout
  if (isMobile) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {expenses.map(expense => (
          <div key={expense.id} style={{
            background: '#f8f9fa',
            borderRadius: '12px',
            padding: '12px',
            border: '1px solid #e0e0e0'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
              <div>
                <span style={{ 
                  background: '#e8f5e9',
                  color: '#2d6a4f',
                  padding: '4px 8px',
                  borderRadius: '20px',
                  fontSize: '11px',
                  fontWeight: '600',
                  display: 'inline-block'
                }}>
                  {expense.category}
                </span>
              </div>
              <span style={{ fontWeight: 'bold', fontSize: '16px', color: '#2c3e50' }}>
                ₹{expense.amount.toLocaleString('en-IN')}
              </span>
            </div>
            <div style={{ fontSize: '13px', color: '#555', marginBottom: '6px' }}>
              {expense.description}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '11px', color: '#7f8c8d' }}>
                📅 {format(new Date(expense.date), 'dd MMM yyyy')}
              </span>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => onEdit(expense)}
                  style={{
                    background: '#3498db',
                    color: 'white',
                    border: 'none',
                    borderRadius: '20px',
                    padding: '4px 12px',
                    cursor: 'pointer',
                    fontSize: '11px',
                    fontWeight: '500'
                  }}
                >
                  ✏️ Edit
                </button>
                <button
                  onClick={() => handleDelete(expense.id)}
                  style={{
                    background: '#e74c3c',
                    color: 'white',
                    border: 'none',
                    borderRadius: '20px',
                    padding: '4px 12px',
                    cursor: 'pointer',
                    fontSize: '11px',
                    fontWeight: '500'
                  }}
                >
                  🗑️ Delete
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Desktop view - Table layout
  return (
    <div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white', borderRadius: '12px' }}>
              <th style={{ padding: '12px', textAlign: 'left' }}>Date</th>
              <th style={{ padding: '12px', textAlign: 'left' }}>Category</th>
              <th style={{ padding: '12px', textAlign: 'left' }}>Description</th>
              <th style={{ padding: '12px', textAlign: 'right' }}>Amount</th>
              <th style={{ padding: '12px', textAlign: 'center' }}>Actions</th>
             </tr>
          </thead>
          <tbody>
            {expenses.map(expense => (
              <tr key={expense.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                <td style={{ padding: '12px', fontSize: '13px', color: '#2c3e50' }}>
                  {format(new Date(expense.date), 'dd MMM yyyy')}
                 </td>
                <td style={{ padding: '12px' }}>
                  <span style={{
                    background: '#e8f5e9',
                    color: '#2d6a4f',
                    padding: '4px 10px',
                    borderRadius: '20px',
                    fontSize: '11px',
                    fontWeight: '600',
                    display: 'inline-block'
                  }}>
                    {expense.category}
                  </span>
                 </td>
                <td style={{ padding: '12px', fontSize: '13px', color: '#555' }}>
                  {expense.description}
                 </td>
                <td style={{ padding: '12px', textAlign: 'right', fontWeight: 'bold', color: '#2c3e50', fontSize: '14px' }}>
                  ₹{expense.amount.toLocaleString('en-IN')}
                 </td>
                <td style={{ padding: '12px', textAlign: 'center' }}>
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                    <button
                      onClick={() => onEdit(expense)}
                      style={{
                        background: '#3498db',
                        color: 'white',
                        border: 'none',
                        borderRadius: '20px',
                        padding: '4px 12px',
                        cursor: 'pointer',
                        fontSize: '11px',
                        fontWeight: '500'
                      }}
                    >
                      ✏️ Edit
                    </button>
                    <button
                      onClick={() => handleDelete(expense.id)}
                      style={{
                        background: '#e74c3c',
                        color: 'white',
                        border: 'none',
                        borderRadius: '20px',
                        padding: '4px 12px',
                        cursor: 'pointer',
                        fontSize: '11px',
                        fontWeight: '500'
                      }}
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