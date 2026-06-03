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

const Dashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const { earnings, setEarnings } = useEarnings();
  const { expenses, loading, addExpense, updateExpense, deleteExpense, getCategoryAnalysis, getYearlyTotal } = useExpenses();
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [showEarningsModal, setShowEarningsModal] = useState(false);
  const [animateCard, setAnimateCard] = useState<string | null>(null);
  
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
    setAnimateCard('edit');
    setTimeout(() => setAnimateCard(null), 500);
  };

  const handleAddExpense = async (expense: any) => {
    await addExpense(expense);
    setAnimateCard('add');
    setTimeout(() => setAnimateCard(null), 500);
  };

  const handleDeleteExpense = async (id: string) => {
    await deleteExpense(id);
    setAnimateCard('delete');
    setTimeout(() => setAnimateCard(null), 500);
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
          @keyframes pulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.02); }
          }
          .card-animate { animation: fadeInUp 0.5s ease-out; }
          .click-animate { animation: pulse 0.3s ease-in-out; }
          .slogan-fade {
            animation: fadeInUp 0.5s ease-out;
          }
        `}</style>
      </div>

      {/* Main Content - Fixed height, no page scroll */}
      <div style={{ 
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        padding: '16px 20px',
        position: 'relative',
        zIndex: 1,
        overflow: 'hidden'
      }}>
        
        {/* Header with Slogan - Fixed */}
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
          
          {/* Animated Slogan */}
          <div style={{
            textAlign: 'center',
            padding: '6px 16px',
            background: 'linear-gradient(135deg, #667eea20 0%, #764ba220 100%)',
            borderRadius: '40px',
            border: '1px solid rgba(102,126,234,0.3)'
          }}>
            <p className="slogan-fade" style={{
              margin: 0,
              fontSize: '12px',
              fontWeight: '500',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}>
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
            onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
          >
            🚪 Logout
          </button>
        </div>

        {/* Top Row - 3 Horizontal Cards */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(3, 1fr)', 
          gap: '16px',
          marginBottom: '16px',
          flexShrink: 0
        }}>
          {/* Monthly Earnings Card */}
          <div 
            className="card-animate"
            style={{ 
              background: 'rgba(255,255,255,0.95)',
              backdropFilter: 'blur(10px)',
              padding: '12px 16px', 
              borderRadius: '16px',
              boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
              cursor: 'pointer',
              transition: 'all 0.3s ease'
            }}
            onClick={() => setShowEarningsModal(true)}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <p style={{ color: '#7f8c8d', fontSize: '11px', margin: 0 }}>📊 Monthly Earnings</p>
              <span style={{ fontSize: '14px', cursor: 'pointer' }}>✏️</span>
            </div>
            <h2 style={{ fontSize: '22px', fontWeight: 'bold', color: '#2c3e50', margin: '2px 0' }}>
              ₹{earnings.toLocaleString('en-IN')}
            </h2>
            <p style={{ color: savings >= 0 ? '#27ae60' : '#e74c3c', fontSize: '10px', margin: '2px 0 0 0' }}>
              {savings >= 0 ? '✅' : '⚠️'} Saved ₹{Math.abs(savings).toLocaleString('en-IN')}
            </p>
          </div>

          {/* This Month's Spending Card */}
          <div 
            className="card-animate"
            style={{ 
              background: 'rgba(255,255,255,0.95)',
              backdropFilter: 'blur(10px)',
              padding: '12px 16px', 
              borderRadius: '16px',
              boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
              transition: 'all 0.3s ease'
            }}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}>
            <p style={{ color: '#7f8c8d', fontSize: '11px', margin: '0 0 4px 0' }}>💰 This Month's Spending</p>
            <h2 style={{ fontSize: '22px', fontWeight: 'bold', color: '#2c3e50', margin: '2px 0' }}>
              ₹{currentMonthTotal.toLocaleString('en-IN')}
            </h2>
            <p style={{ color: monthlyChange > 0 ? '#e74c3c' : '#27ae60', fontSize: '10px', margin: '2px 0 0 0' }}>
              {monthlyChange > 0 ? '📈' : '📉'} {monthlyChange > 0 ? '+' : ''}{monthlyChange.toFixed(1)}% vs last month
            </p>
          </div>

          {/* Balance Remains (Savings) Card */}
          <div 
            className="card-animate"
            style={{ 
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              padding: '12px 16px', 
              borderRadius: '16px',
              boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
              color: 'white',
              transition: 'all 0.3s ease'
            }}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}>
            <p style={{ fontSize: '11px', margin: '0 0 4px 0', opacity: 0.9 }}>💎 Balance Remains</p>
            <h2 style={{ fontSize: '22px', fontWeight: 'bold', margin: '2px 0' }}>
              ₹{savings.toLocaleString('en-IN')}
            </h2>
            <p style={{ fontSize: '10px', margin: '2px 0 0 0', opacity: 0.9 }}>
              {savingsPercentage.toFixed(1)}% of earnings saved
            </p>
          </div>
        </div>

        {/* Main Content - 2 Columns */}
        <div className="dashboard-main-grid" style={{ 
          display: 'grid', 
          gridTemplateColumns: '1fr 1fr', 
          gap: '16px',
          flex: 1,
          minHeight: 0,
          overflow: 'hidden'
        }}>
          <style>{`
            @media (max-width: 860px) {
              .dashboard-main-grid { grid-template-columns: 1fr !important; }
            }
          `}</style>
          
          {/* LEFT COLUMN - Quick Transaction + Transaction History */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', height: '100%', minHeight: 0 }}>
            
            {/* Quick Transaction Card */}
            <div 
              className={`card-animate ${animateCard === 'add' ? 'click-animate' : ''}`}
              style={{ 
                background: 'rgba(255,255,255,0.95)',
                backdropFilter: 'blur(10px)',
                padding: '12px 16px', 
                borderRadius: '16px',
                boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
                flexShrink: 0
              }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h3 style={{ fontSize: '15px', fontWeight: 'bold', color: '#2c3e50', margin: 0 }}>⚡ Quick Transaction</h3>
                <span style={{ fontSize: '20px', color: '#667eea' }}>+</span>
              </div>
              <ExpenseForm onAddExpense={handleAddExpense} />
            </div>

            {/* Transaction History Card - Scrollable */}
            <div 
              className={`card-animate ${animateCard === 'edit' || animateCard === 'delete' ? 'click-animate' : ''}`}
              style={{ 
                background: 'rgba(255,255,255,0.95)',
                backdropFilter: 'blur(10px)',
                padding: '12px 16px', 
                borderRadius: '16px',
                boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                minHeight: 0,
                overflow: 'hidden'
              }}>
              <h3 style={{ fontSize: '15px', fontWeight: 'bold', color: '#2c3e50', margin: '0 0 12px 0', flexShrink: 0 }}>
                📋 Transaction History
              </h3>
              <div style={{ 
                flex: 1, 
                overflowY: 'auto',
                minHeight: 0,
                paddingRight: '4px'
              }}>
                {loading ? (
                  <div style={{ textAlign: 'center', padding: '20px', color: '#7f8c8d', fontSize: '12px' }}>
                    Loading transactions...
                  </div>
                ) : (
                  <ExpenseList 
                    expenses={expenses} 
                    onDelete={handleDeleteExpense} 
                    onEdit={handleEdit} 
                  />
                )}
              </div>
            </div>

          </div>

          {/* RIGHT COLUMN - Category Breakdown + Stats */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', height: '100%', minHeight: 0 }}>
            
            {/* Category Breakdown (Pie Chart) */}
            <div style={{ 
              background: 'rgba(255,255,255,0.95)',
              backdropFilter: 'blur(10px)',
              padding: '16px 16px', 
              borderRadius: '16px',
              boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
              flexShrink: 0
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h3 style={{ fontSize: '15px', fontWeight: 'bold', color: '#2c3e50', margin: 0 }}>
                  📊 Category Breakdown ({selectedYear})
                </h3>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                  style={{
                    padding: '4px 10px',
                    border: '1px solid #ddd',
                    borderRadius: '30px',
                    fontSize: '11px',
                    cursor: 'pointer',
                    background: 'white'
                  }}
                >
                  {[2023, 2024, 2025, 2026].map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </div>
              <div
                style={{
                  height: '225px',
                  padding: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxSizing: 'border-box'
                }}
              >
                <CategoryPieChart data={categoryAnalysis} />
              </div>
              
              {/* Expense breakdown list */}
              {categoryAnalysis.length > 0 && (
                <div style={{ marginTop: '12px', borderTop: '1px solid #eee', paddingTop: '10px' }}>
                  {categoryAnalysis.slice(0, 4).map(cat => (
                    <div key={cat.category} style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      marginBottom: '6px', 
                      fontSize: '11px',
                      alignItems: 'center'
                    }}>
                      <span style={{ color: '#555' }}>{cat.category}</span>
                      <div style={{ textAlign: 'right' }}>
                        <span style={{ fontWeight: '600', color: '#2c3e50' }}>₹{cat.amount.toLocaleString('en-IN')}</span>
                        <span style={{ color: '#95a5a6', marginLeft: '6px', fontSize: '10px' }}>({cat.percentage.toFixed(1)}%)</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Stats Cards - 2x2 Grid (Clean, no duplicates) */}
            <div className="dashboard-kpi-grid" style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(2, 1fr)', 
              gap: '12px',
              flexShrink: 0,
              marginTop: '6px'
            }}>
              <div style={{ 
                background: 'rgba(255,255,255,0.95)',
                backdropFilter: 'blur(10px)',
                padding: '14px 12px',
                borderRadius: '16px',
                boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
                textAlign: 'center',
                minHeight: '96px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center'
              }}>
                <p style={{ color: '#7f8c8d', fontSize: '11px', margin: 0 }}>📅 Yearly Total</p>
                <h4 style={{ fontSize: '18px', fontWeight: 800, color: '#2c3e50', margin: '4px 0 0 0' }}>
                  ₹{currentYearTotal.toLocaleString('en-IN')}
                </h4>
              </div>

              <div style={{ 
                background: 'rgba(255,255,255,0.95)',
                backdropFilter: 'blur(10px)',
                padding: '14px 12px',
                borderRadius: '16px',
                boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
                textAlign: 'center',
                minHeight: '96px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center'
              }}>
                <p style={{ color: '#7f8c8d', fontSize: '11px', margin: 0 }}>🏆 Highest Category</p>
                <h4 style={{ fontSize: '15px', fontWeight: 800, color: '#2c3e50', margin: '4px 0 0 0', lineHeight: 1.2 }}>
                  {highestCategory?.category || 'N/A'}
                </h4>
                <p style={{ fontSize: '14px', fontWeight: 800, color: '#667eea', margin: '6px 0 0 0' }}>
                  ₹{highestCategory?.amount.toLocaleString('en-IN') || '0'}
                </p>
              </div>

              <div style={{ 
                background: 'rgba(255,255,255,0.95)',
                backdropFilter: 'blur(10px)',
                padding: '14px 12px',
                borderRadius: '16px',
                boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
                textAlign: 'center',
                minHeight: '96px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center'
              }}>
                <p style={{ color: '#7f8c8d', fontSize: '11px', margin: 0 }}>📊 Monthly Average</p>
                <h4 style={{ fontSize: '18px', fontWeight: 800, color: '#2c3e50', margin: '4px 0 0 0' }}>
                  ₹{(currentYearTotal / 12).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                </h4>
              </div>

              <div style={{ 
                background: 'rgba(255,255,255,0.95)',
                backdropFilter: 'blur(10px)',
                padding: '14px 12px',
                borderRadius: '16px',
                boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
                textAlign: 'center',
                minHeight: '96px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center'
              }}>
                <p style={{ color: '#7f8c8d', fontSize: '11px', margin: 0 }}>🔄 Total Transactions</p>
                <h4 style={{ fontSize: '18px', fontWeight: 800, color: '#2c3e50', margin: '4px 0 0 0' }}>
                  {expenses.length}
                </h4>
              </div>
            </div>

          </div>
        </div>
      </div>

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

export default Dashboard;