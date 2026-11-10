import React, { useState } from 'react';
import { EXPENSE_CATEGORIES, type Expense, type Income } from '../../types';
import { format } from 'date-fns';
import { theme, categoryColors, incomeCategoryColors } from '../../styles/theme';
import { useIsMobile } from '../../hooks/useIsMobile';

interface ExpenseListProps {
  expenses: Expense[];
  onDelete: (id: string) => Promise<void>;
  onEdit: (expense: Expense) => void;
  /** Credit transactions for the same period — shown merged with expenses so
   *  imported income isn't invisible in the main transaction list. Read-only
   *  (editing isn't supported yet) but deletable via onDeleteIncome. */
  income?: Income[];
  onDeleteIncome?: (id: string) => Promise<void>;
}

const categories = EXPENSE_CATEGORIES;

interface Row {
  id: string;
  date: Date;
  description: string;
  category: string;
  amount: number;
  kind: 'expense' | 'income';
  source: Expense | Income;
}

const ExpenseList: React.FC<ExpenseListProps> = ({ expenses, onDelete, onEdit, income = [], onDeleteIncome }) => {
  const isMobile = useIsMobile();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('All');

  const handleDelete = async (id: string) => {
    if (window.confirm('Delete this expense?')) {
      await onDelete(id);
    }
  };

  const handleDeleteIncome = async (id: string) => {
    if (onDeleteIncome && window.confirm('Delete this income entry?')) {
      await onDeleteIncome(id);
    }
  };

  const getCategoryColor = (category: string) => {
    const idx = (categories as readonly string[]).indexOf(category);
    return categoryColors[idx % categoryColors.length];
  };

  // Merge expenses and income into one chronological list — the main
  // transaction history should show every transaction, not just debits.
  const rows: Row[] = [
    ...expenses.map((e): Row => ({ id: e.id, date: new Date(e.date), description: e.description, category: e.category, amount: e.amount, kind: 'expense', source: e })),
    ...income.map((i): Row => ({ id: i.id, date: new Date(i.date), description: i.description, category: i.category, amount: i.amount, kind: 'income', source: i })),
  ].sort((a, b) => b.date.getTime() - a.date.getTime());

  // Filtering Logic
  const filteredRows = rows.filter(row => {
    const matchesSearch =
      row.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      row.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      row.amount.toString().includes(searchTerm);

    const matchesCategory = filterCategory === 'All' || row.category === filterCategory;

    return matchesSearch && matchesCategory;
  });

  // Reset filters if list is empty
  if (rows.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px', color: theme.colors.textTertiary }}>
        <div style={{ fontSize: '48px', marginBottom: '12px' }}>📭</div>
        <p style={{ fontSize: '14px', fontWeight: 500, margin: 0 }}>No transactions yet for this month</p>
      </div>
    );
  }

  return (
    <div>
      {/* Search and Filter Bar */}
      <div style={{
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        gap: '10px',
        marginBottom: '16px'
      }}>
        <input
          type="text"
          className="input"
          placeholder="Search description, amount..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ flex: '1 1 0%', minWidth: 0, padding: '8px 12px', fontSize: '13px' }}
        />
        <select
          className="input"
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          style={{ flex: isMobile ? '1 1 0%' : `0 0 170px`, width: isMobile ? '100%' : '170px', padding: '8px 12px', fontSize: '13px' }}
        >
          <option value="All">All Categories</option>
          {categories.map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
      </div>

      {/* List */}
      {filteredRows.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', color: theme.colors.textSecondary, fontSize: '13px' }}>
          No transactions found matching your search.
        </div>
      ) : isMobile ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {filteredRows.map(row => {
            const isIncome = row.kind === 'income';
            const color = isIncome ? (incomeCategoryColors[row.category] ?? theme.colors.success) : getCategoryColor(row.category);
            return (
              <div key={`${row.kind}-${row.id}`} style={{
                background: isIncome ? 'rgba(16, 185, 129, 0.06)' : 'rgba(255,255,255,0.6)', borderRadius: '14px', padding: '14px', border: '1px solid rgba(0,0,0,0.04)',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                  <span style={{ background: `${color}20`, color, padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 600 }}>
                    {row.category}
                  </span>
                  <span style={{ fontWeight: 700, fontSize: '16px', color: isIncome ? theme.colors.success : theme.colors.textPrimary }}>
                    {isIncome ? '+' : ''}₹{row.amount.toLocaleString('en-IN')}
                  </span>
                </div>
                <p style={{ fontSize: '13px', color: theme.colors.textSecondary, margin: '0 0 10px 0' }}>
                  {row.description}
                </p>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '11px', color: theme.colors.textTertiary }}>
                    {format(row.date, 'dd MMM yyyy')}
                  </span>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    {isIncome ? (
                      onDeleteIncome && <button onClick={() => handleDeleteIncome(row.id)} className="btn btn-danger" style={{ padding: '6px 12px', fontSize: '11px' }}>Delete</button>
                    ) : (
                      <>
                        <button onClick={() => onEdit(row.source as Expense)} className="btn btn-ghost" style={{ padding: '6px 12px', fontSize: '11px' }}>Edit</button>
                        <button onClick={() => handleDelete(row.id)} className="btn btn-danger" style={{ padding: '6px 12px', fontSize: '11px' }}>Delete</button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div>
          <div style={{
            display: 'grid', gridTemplateColumns: '100px minmax(0, 1fr) minmax(0, 1fr) auto auto', gap: '16px', padding: '0 0 10px 0',
            borderBottom: `2px solid ${theme.colors.primary}20`,
          }}>
            <span style={{ fontSize: '10px', fontWeight: 700, color: theme.colors.textSecondary, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Date</span>
            <span style={{ fontSize: '10px', fontWeight: 700, color: theme.colors.textSecondary, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Category</span>
            <span style={{ fontSize: '10px', fontWeight: 700, color: theme.colors.textSecondary, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Description</span>
            <span style={{ fontSize: '10px', fontWeight: 700, color: theme.colors.textSecondary, textTransform: 'uppercase', letterSpacing: '0.06em', textAlign: 'right' }}>Amount</span>
            <span style={{ fontSize: '10px', fontWeight: 700, color: theme.colors.textSecondary, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Actions</span>
          </div>
          {filteredRows.map((row, idx) => {
            const isIncome = row.kind === 'income';
            const color = isIncome ? (incomeCategoryColors[row.category] ?? theme.colors.success) : getCategoryColor(row.category);
            return (
              <div key={`${row.kind}-${row.id}`} style={{
                display: 'grid', gridTemplateColumns: '100px minmax(0, 1fr) minmax(0, 1fr) auto auto', gap: '16px', alignItems: 'center', padding: '14px 0',
                borderBottom: idx < filteredRows.length - 1 ? '1px solid rgba(0,0,0,0.04)' : 'none',
                background: isIncome ? 'rgba(16, 185, 129, 0.04)' : 'transparent',
              }}>
                <span style={{ fontSize: '13px', color: theme.colors.textSecondary, fontWeight: 500 }}>
                  {format(row.date, 'dd MMM')}
                </span>
                <span style={{ background: `${color}20`, color, padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 600, display: 'inline-block', width: 'fit-content' }}>
                  {row.category}
                </span>
                <span
                  title={row.description}
                  style={{
                    fontSize: '13px', color: theme.colors.textPrimary, fontWeight: 500, minWidth: 0,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}
                >
                  {row.description}
                </span>
                <span style={{ fontSize: '15px', fontWeight: 700, color: isIncome ? theme.colors.success : theme.colors.textPrimary, textAlign: 'right' }}>
                  {isIncome ? '+' : ''}₹{row.amount.toLocaleString('en-IN')}
                </span>
                <div style={{ display: 'flex', gap: '6px' }}>
                  {isIncome ? (
                    onDeleteIncome && <button onClick={() => handleDeleteIncome(row.id)} className="btn btn-danger" style={{ padding: '6px 10px', fontSize: '11px' }}>Delete</button>
                  ) : (
                    <>
                      <button onClick={() => onEdit(row.source as Expense)} className="btn btn-ghost" style={{ padding: '6px 10px', fontSize: '11px' }}>Edit</button>
                      <button onClick={() => handleDelete(row.id)} className="btn btn-danger" style={{ padding: '6px 10px', fontSize: '11px' }}>Delete</button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ExpenseList;
