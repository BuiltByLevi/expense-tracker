import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useExpenses } from '../../hooks/useExpenses';
import { useEarnings } from '../../context/EarningsContext';
import ExpenseForm from '../ExpenseForm/ExpenseForm';
import ExpenseList from '../ExpenseList/ExpenseList';
import CategoryPieChart from '../Charts/CategoryPieChart';
import EditExpenseModal from '../ExpenseList/EditExpenseModal';
import EarningsModal from './EarningsModal';
import type { Expense } from '../../types';

const DashboardWeb: React.FC = () => {
  const { user, logout } = useAuth();
  const { earnings, setEarnings } = useEarnings();
  const { expenses, loading, addExpense, updateExpense, deleteExpense, getCategoryAnalysis, getYearlyTotal } = useExpenses();
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [showEarningsModal, setShowEarningsModal] = useState(false);
  
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth();
  
  const slogans = [
    "💸 Save Money, Live Better!",
    "🎯 Track Every Rupee!",
    "📊 Smart Spending = Smart Living",
    "💰 Your Wealth, Your Way!",
    "📈 Watch Your Savings Grow!",
    "🎉 Financial Freedom Starts Here!"
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
      height: '100vh',
      overflow: 'hidden',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      position: 'relative'
    }}>
      {/* Animated Background Elements */}
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        overflow: 'hidden',
        zIndex: 0
      }}>
        <div style={{
          position: 'absolute',
          width: '300px',
          height: '300px',
          background: 'rgba(255,255,255,0.1)',
          borderRadius: '50%',
          top: '10%',
          left: '-100px',
          animation: 'float 20s infinite ease-in-out'
        }} />
        <div style={{
          position: 'absolute',
          width: '200px',
          height: '200px',
          background: 'rgba(255,255,255,0.1)',
          borderRadius: '50%',
          bottom: '20%',
          right: '-50px',
          animation: 'float 15s infinite ease-in-out reverse'
        }} />
        <div style={{
          position: 'absolute',
          width: '150px',
          height: '150px',
          background: 'rgba(255,255,255,0.08)',
          borderRadius: '50%',
          top: '50%',
          left: '20%',
          animation: 'float 25s infinite ease-in-out'
        }} />
        <style>{`
          @keyframes float {
            0%, 100% { transform: translate(0, 0) rotate(0deg); }
            25% { transform: translate(10px, -20px) rotate(5deg); }
            50% { transform: translate(-15px, 10px) rotate(-5deg); }
            75% { transform: translate(5px, 15px) rotate(3deg); }
          }
          @keyframes slideIn {
            from { opacity: 0; transform: translateX(-30px); }
            to { opacity: 1; transform: translateX(0); }
          }
          @keyframes fadeInUp {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
          }
          .card-animate { animation: fadeInUp 0.5s ease-out; }
          .slogan-fade { animation: fadeInUp 0.5s ease-out; }
        `}</style>
      </div>

      {/* Main Content */}
      <div style={{ 
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        padding: '16px 20px',
        position: 'relative',
        zIndex: 1,
        overflow: 'hidden'
      }}>
        
        {/* Header */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: '16px',
          background: 'rgba(255,255,255,0.95)',
          backdropFilter: 'blur(10px)',
          padding: '12px 20px',
          borderRadius: '16px',
          boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
          animation: 'slideIn 0.5s ease-out',
          flexShrink: 0
        }}>
          <div>
            <h1 style={{ 
              fontSize: '20px', 
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              fontWeight: 'bold', 
              margin: 0 
            }}>
              💰 Expense Tracker
            </h1>
            <p style={{ color: '#7f8c8d', marginTop: '2px', marginBottom: 0, fontSize: '11px' }}>
              Welcome back, {user?.email?.split('@')[0]}
            </p>
          </div>
          
          <div style={{
            textAlign: 'center',
            padding: '6px 16px',
            background: 'linear-gradient(135deg, #667eea20 0%, #764ba220 100%)',
            borderRadius: '40px',
            border: '1px solid rgba(102,126,234,0.3)'
          }}>
            <p className="slogan-fade" style={{ margin: 0, fontSize: '12px', fontWeight: '500' }}>
              {currentSlogan}
            </p>
          </div>
          
          <button
            onClick={logout}
            style={{
              padding: '6px 16px',
              background: '#e74c3c',
              color: 'white',
              border: 'none',
              borderRadius: '30px',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: '500',
              transition: 'all 0.3s ease'
            }}
          >
            🚪 Logout
          </button>
        </div>

        {/* Top Row - 3 Cards */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(3, 1fr)', 
          gap: '16px',
          marginBottom: '16px',
          flexShrink: 0
        }}>
          <div 
            className="card-animate"
            style={{ 
              background: 'rgba(255,255,255,0.95)',
              padding: '12px 16px', 
              borderRadius: '16px',
              cursor: 'pointer',
              transition: 'all 0.3s ease'
            }}
            onClick={() => setShowEarningsModal(true)}>
            <p style={{ color: '#7f8c8d', fontSize: '11px', margin: 0 }}>📊 Monthly Earnings</p>
            <h2 style={{ fontSize: '22px', fontWeight: 'bold', color: '#2c3e50', margin: '4px 0' }}>
              ₹{earnings.toLocaleString('en-IN')}
            </h2>
            <p style={{ color: '#27ae60', fontSize: '10px', margin: '4px 0 0 0' }}>
              ✅ Saved ₹{Math.abs(savings).toLocaleString('en-IN')}
            </p>
          </div>

          <div className="card-animate" style={{ background: 'rgba(255,255,255,0.95)', padding: '12px 16px', borderRadius: '16px' }}>
            <p style={{ color: '#7f8c8d', fontSize: '11px', margin: 0 }}>💰 This Month's Spending</p>
            <h2 style={{ fontSize: '22px', fontWeight: 'bold', color: '#2c3e50', margin: '4px 0' }}>
              ₹{currentMonthTotal.toLocaleString('en-IN')}
            </h2>
            <p style={{ color: monthlyChange > 0 ? '#e74c3c' : '#27ae60', fontSize: '10px', margin: '4px 0 0 0' }}>
              {monthlyChange > 0 ? '+' : ''}{monthlyChange.toFixed(1)}% vs last month
            </p>
          </div>

          <div className="card-animate" style={{ 
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            padding: '12px 16px', 
            borderRadius: '16px',
            color: 'white'
          }}>
            <p style={{ fontSize: '11px', margin: '0', opacity: 0.9 }}>💎 Balance Remains</p>
            <h2 style={{ fontSize: '22px', fontWeight: 'bold', margin: '4px 0' }}>
              ₹{savings.toLocaleString('en-IN')}
            </h2>
            <p style={{ fontSize: '10px', margin: '4px 0 0 0', opacity: 0.9 }}>
              {savingsPercentage.toFixed(1)}% saved
            </p>
          </div>
        </div>

        {/* Main Content - 2 Columns */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: '1fr 1fr', 
          gap: '16px',
          flex: 1,
          minHeight: 0,
          overflow: 'hidden'
        }}>
          
          {/* LEFT COLUMN */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', height: '100%', minHeight: 0 }}>
            <div className="card-animate" style={{ 
              background: 'rgba(255,255,255,0.95)',
              padding: '12px 16px', 
              borderRadius: '16px',
              flexShrink: 0
            }}>
              <h3 style={{ fontSize: '15px', fontWeight: 'bold', margin: '0 0 12px 0' }}>⚡ Quick Transaction</h3>
              <ExpenseForm onAddExpense={handleAddExpense} />
            </div>

            <div className="card-animate" style={{ 
              background: 'rgba(255,255,255,0.95)',
              padding: '12px 16px', 
              borderRadius: '16px',
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden'
            }}>
              <h3 style={{ fontSize: '15px', fontWeight: 'bold', margin: '0 0 12px 0' }}>📋 Transaction History</h3>
              <div style={{ flex: 1, overflowY: 'auto' }}>
                {loading ? <div>Loading...</div> : <ExpenseList expenses={expenses} onDelete={handleDeleteExpense} onEdit={handleEdit} />}
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', height: '100%', minHeight: 0 }}>
            <div className="card-animate" style={{ 
              background: 'rgba(255,255,255,0.95)',
              padding: '12px 16px', 
              borderRadius: '16px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h3 style={{ fontSize: '15px', fontWeight: 'bold', margin: 0 }}>📊 Category Breakdown ({selectedYear})</h3>
                <select value={selectedYear} onChange={(e) => setSelectedYear(parseInt(e.target.value))} style={{ padding: '4px 8px', borderRadius: '30px', fontSize: '11px' }}>
                  {[2023, 2024, 2025, 2026].map(year => <option key={year} value={year}>{year}</option>)}
                </select>
              </div>
              <CategoryPieChart data={categoryAnalysis} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
              <div style={{ background: 'rgba(255,255,255,0.95)', padding: '10px', borderRadius: '16px', textAlign: 'center' }}>
                <p style={{ fontSize: '10px', margin: 0 }}>📅 Yearly Total</p>
                <h4 style={{ fontSize: '16px', margin: '4px 0 0 0' }}>₹{currentYearTotal.toLocaleString('en-IN')}</h4>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.95)', padding: '10px', borderRadius: '16px', textAlign: 'center' }}>
                <p style={{ fontSize: '10px', margin: 0 }}>🏆 Highest Category</p>
                <h4 style={{ fontSize: '13px', margin: '4px 0 0 0' }}>{highestCategory?.category || 'N/A'}</h4>
                <p style={{ fontSize: '12px', fontWeight: 'bold', color: '#667eea' }}>₹{highestCategory?.amount.toLocaleString('en-IN') || '0'}</p>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.95)', padding: '10px', borderRadius: '16px', textAlign: 'center' }}>
                <p style={{ fontSize: '10px', margin: 0 }}>📊 Monthly Avg</p>
                <h4 style={{ fontSize: '16px', margin: '4px 0 0 0' }}>₹{(currentYearTotal / 12).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</h4>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.95)', padding: '10px', borderRadius: '16px', textAlign: 'center' }}>
                <p style={{ fontSize: '10px', margin: 0 }}>🔄 Transactions</p>
                <h4 style={{ fontSize: '16px', margin: '4px 0 0 0' }}>{expenses.length}</h4>
              </div>
            </div>
          </div>
        </div>
      </div>

      <EarningsModal isOpen={showEarningsModal} onClose={() => setShowEarningsModal(false)} currentEarnings={earnings} onSave={setEarnings} />
      <EditExpenseModal expense={editingExpense} isOpen={!!editingExpense} onClose={() => setEditingExpense(null)} onUpdate={updateExpense} />
    </div>
  );
};

export default DashboardWeb;