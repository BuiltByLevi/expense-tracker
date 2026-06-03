import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useExpenses } from '../../hooks/useExpenses';
import { useEarnings } from '../../context/EarningsContext';
import ExpenseForm from '../ExpenseForm/ExpenseForm';
import ExpenseList from '../ExpenseList/ExpenseList';
import CategoryPieChartMobile from '../Charts/CategoryPieChart';
import EditExpenseModal from '../ExpenseList/EditExpenseModal';
import EarningsModal from './EarningsModal';
import type { Expense } from '../../types';

const DashboardMobile: React.FC = () => {
  const { user, logout } = useAuth();
  const { earnings, setEarnings } = useEarnings();
  const { expenses, loading, addExpense, updateExpense, deleteExpense, getCategoryAnalysis, getYearlyTotal } = useExpenses();
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [showEarningsModal, setShowEarningsModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'expenses' | 'stats'>('expenses');
  
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth();
  
  const slogans = [
    "💸 Save Money, Live Better!",
    "🎯 Track Every Rupee!",
    "📊 Smart Spending = Smart Living"
  ];
  const [currentSlogan, setCurrentSlogan] = useState(slogans[0]);
  
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlogan(prev => {
        const currentIndex = slogans.indexOf(prev);
        const nextIndex = (currentIndex + 1) % slogans.length;
        return slogans[nextIndex];
      });
    }, 5000);
    return () => clearInterval(interval);
  }, []);
  
  const currentMonthTotal = expenses.filter(expense => {
    const date = new Date(expense.date);
    return date.getFullYear() === currentYear && date.getMonth() === currentMonth;
  }).reduce((sum, e) => sum + e.amount, 0);
  
  const previousMonthTotal = expenses.filter(expense => {
    const date = new Date(expense.date);
    return date.getFullYear() === currentYear && date.getMonth() === currentMonth - 1;
  }).reduce((sum, e) => sum + e.amount, 0);
  
  const monthlyChange = previousMonthTotal > 0 ? ((currentMonthTotal - previousMonthTotal) / previousMonthTotal) * 100 : 0;
  
  const currentYearTotal = getYearlyTotal(selectedYear);
  const categoryAnalysis = getCategoryAnalysis();
  const highestCategory = categoryAnalysis[0];
  const savings = earnings - currentMonthTotal;
  const savingsPercentage = earnings > 0 ? (savings / earnings) * 100 : 0;

  const handleEdit = (expense: Expense) => {
    setEditingExpense(expense);
  };

  const handleAddExpense = async (expense: any) => {
    await addExpense(expense);
  };

  const handleDeleteExpense = async (id: string) => {
    await deleteExpense(id);
  };

  return (
    <div style={{ 
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '12px'
    }}>
      {/* Header */}
      <div style={{ 
        background: 'rgba(255,255,255,0.95)',
        borderRadius: '16px',
        padding: '12px',
        marginBottom: '12px',
        textAlign: 'center'
      }}>
        <h1 style={{ fontSize: '18px', margin: 0, fontWeight: 'bold' }}>💰 Expense Tracker</h1>
        <p style={{ fontSize: '11px', color: '#7f8c8d', margin: '4px 0' }}>Welcome, {user?.email?.split('@')[0]}</p>
        <p style={{ fontSize: '10px', margin: '4px 0 0 0', color: '#667eea' }}>{currentSlogan}</p>
        <button 
          onClick={logout} 
          style={{ 
            marginTop: '8px', 
            padding: '8px 12px', 
            background: '#e74c3c', 
            color: 'white', 
            border: 'none', 
            borderRadius: '25px', 
            fontSize: '12px', 
            width: '100%',
            fontWeight: '500'
          }}
        >
          🚪 Logout
        </button>
      </div>

      {/* Stats Cards - Scroll horizontally */}
      <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', marginBottom: '12px', paddingBottom: '4px' }}>
        <div style={{ background: 'rgba(255,255,255,0.95)', padding: '12px', borderRadius: '12px', minWidth: '140px', flex: 1 }}>
          <p style={{ fontSize: '10px', margin: 0 }}>📊 Monthly Earnings</p>
          <h3 style={{ fontSize: '18px', margin: '4px 0' }}>₹{earnings.toLocaleString('en-IN')}</h3>
          <p style={{ fontSize: '9px', color: '#27ae60' }}>Saved ₹{Math.abs(savings).toLocaleString('en-IN')}</p>
          <button 
            onClick={() => setShowEarningsModal(true)} 
            style={{ 
              fontSize: '10px', 
              padding: '4px 10px', 
              background: '#667eea', 
              border: 'none', 
              borderRadius: '20px', 
              color: 'white', 
              marginTop: '6px',
              cursor: 'pointer'
            }}
          >
            Edit
          </button>
        </div>
        <div style={{ background: 'rgba(255,255,255,0.95)', padding: '12px', borderRadius: '12px', minWidth: '140px', flex: 1 }}>
          <p style={{ fontSize: '10px', margin: 0 }}>💰 Monthly Spending</p>
          <h3 style={{ fontSize: '18px', margin: '4px 0' }}>₹{currentMonthTotal.toLocaleString('en-IN')}</h3>
          <p style={{ fontSize: '9px', color: monthlyChange > 0 ? '#e74c3c' : '#27ae60' }}>
            {monthlyChange > 0 ? '+' : ''}{monthlyChange.toFixed(1)}% vs last month
          </p>
        </div>
        <div style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', padding: '12px', borderRadius: '12px', minWidth: '140px', flex: 1, color: 'white' }}>
          <p style={{ fontSize: '10px', margin: 0, opacity: 0.9 }}>💎 Balance Remains</p>
          <h3 style={{ fontSize: '18px', margin: '4px 0' }}>₹{savings.toLocaleString('en-IN')}</h3>
          <p style={{ fontSize: '9px', opacity: 0.9 }}>{savingsPercentage.toFixed(1)}% saved</p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
        <button 
          onClick={() => setActiveTab('expenses')} 
          style={{ 
            flex: 1, 
            padding: '10px', 
            background: activeTab === 'expenses' ? '#667eea' : 'rgba(255,255,255,0.8)', 
            border: 'none', 
            borderRadius: '12px', 
            fontWeight: 'bold', 
            color: activeTab === 'expenses' ? 'white' : '#333',
            cursor: 'pointer',
            transition: 'all 0.3s ease'
          }}
        >
          📝 Expenses
        </button>
        <button 
          onClick={() => setActiveTab('stats')} 
          style={{ 
            flex: 1, 
            padding: '10px', 
            background: activeTab === 'stats' ? '#667eea' : 'rgba(255,255,255,0.8)', 
            border: 'none', 
            borderRadius: '12px', 
            fontWeight: 'bold', 
            color: activeTab === 'stats' ? 'white' : '#333',
            cursor: 'pointer',
            transition: 'all 0.3s ease'
          }}
        >
          📊 Statistics
        </button>
      </div>

      {/* Tab Content - Expenses Tab */}
      {activeTab === 'expenses' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ background: 'rgba(255,255,255,0.95)', padding: '16px', borderRadius: '16px' }}>
            <h3 style={{ fontSize: '16px', margin: '0 0 12px 0', fontWeight: 'bold' }}>⚡ Quick Transaction</h3>
            <ExpenseForm onAddExpense={handleAddExpense} />
          </div>
          
          <div style={{ background: 'rgba(255,255,255,0.95)', padding: '16px', borderRadius: '16px', maxHeight: '450px', overflowY: 'auto' }}>
            <h3 style={{ fontSize: '16px', margin: '0 0 12px 0', fontWeight: 'bold' }}>📋 Transaction History</h3>
            {loading ? (
              <div style={{ textAlign: 'center', padding: '20px' }}>Loading...</div>
            ) : (
              <ExpenseList expenses={expenses} onDelete={handleDeleteExpense} onEdit={handleEdit} />
            )}
          </div>
        </div>
      )}

      {/* Tab Content - Statistics Tab */}
      {activeTab === 'stats' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ background: 'rgba(255,255,255,0.95)', padding: '16px', borderRadius: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
              <h3 style={{ fontSize: '16px', margin: 0, fontWeight: 'bold' }}>📊 Category Breakdown</h3>
              <select 
                value={selectedYear} 
                onChange={(e) => setSelectedYear(parseInt(e.target.value))} 
                style={{ 
                  padding: '6px 12px', 
                  borderRadius: '25px', 
                  fontSize: '12px',
                  border: '1px solid #ddd',
                  background: 'white'
                }}
              >
                {[2023, 2024, 2025, 2026].map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>
            {/* Mobile optimized donut chart */}
            <CategoryPieChartMobile data={categoryAnalysis} />
          </div>

          {/* Stats Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
            <div style={{ background: 'rgba(255,255,255,0.95)', padding: '14px', borderRadius: '12px', textAlign: 'center' }}>
              <p style={{ fontSize: '11px', margin: 0, color: '#7f8c8d' }}>📅 Yearly Total</p>
              <h4 style={{ fontSize: '18px', margin: '6px 0 0 0', fontWeight: 'bold', color: '#2c3e50' }}>
                ₹{currentYearTotal.toLocaleString('en-IN')}
              </h4>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.95)', padding: '14px', borderRadius: '12px', textAlign: 'center' }}>
              <p style={{ fontSize: '11px', margin: 0, color: '#7f8c8d' }}>🏆 Highest Category</p>
              <h4 style={{ fontSize: '14px', margin: '6px 0 4px 0', fontWeight: 'bold', color: '#2c3e50' }}>
                {highestCategory?.category || 'N/A'}
              </h4>
              <p style={{ fontSize: '14px', fontWeight: 'bold', color: '#667eea', margin: 0 }}>
                ₹{highestCategory?.amount.toLocaleString('en-IN') || '0'}
              </p>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.95)', padding: '14px', borderRadius: '12px', textAlign: 'center' }}>
              <p style={{ fontSize: '11px', margin: 0, color: '#7f8c8d' }}>📊 Monthly Avg</p>
              <h4 style={{ fontSize: '18px', margin: '6px 0 0 0', fontWeight: 'bold', color: '#2c3e50' }}>
                ₹{(currentYearTotal / 12).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </h4>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.95)', padding: '14px', borderRadius: '12px', textAlign: 'center' }}>
              <p style={{ fontSize: '11px', margin: 0, color: '#7f8c8d' }}>🔄 Transactions</p>
              <h4 style={{ fontSize: '18px', margin: '6px 0 0 0', fontWeight: 'bold', color: '#2c3e50' }}>
                {expenses.length}
              </h4>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      <EarningsModal
        isOpen={showEarningsModal}
        onClose={() => setShowEarningsModal(false)}
        currentEarnings={earnings}
        onSave={setEarnings}
      />
      
      <EditExpenseModal
        expense={editingExpense}
        isOpen={!!editingExpense}
        onClose={() => setEditingExpense(null)}
        onUpdate={updateExpense}
      />
    </div>
  );
};

export default DashboardMobile;