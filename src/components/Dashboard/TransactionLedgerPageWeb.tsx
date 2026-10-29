import React, { useState, useMemo, useEffect } from 'react';
import { useExpenses } from '../../hooks/useExpenses';
import { useEarnings } from '../../context/EarningsContext';
import { format, startOfMonth, endOfMonth, isWithinInterval, isAfter } from 'date-fns';
import { theme as design } from '../../styles/theme';

interface TransactionLedgerPageProps {
  onBack: () => void;
}

const TransactionLedgerPage: React.FC<TransactionLedgerPageProps> = ({ onBack }) => {
  const { expenses } = useExpenses();
  const { getEarningsForMonth, earnings: defaultEarnings } = useEarnings();
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());

  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const monthName = format(new Date(selectedYear, selectedMonth), 'MMMM yyyy');
  const isFutureMonth = isAfter(new Date(selectedYear, selectedMonth, 1), startOfMonth(new Date()));

  const goToPreviousMonth = () => {
    if (selectedMonth === 0) { setSelectedMonth(11); setSelectedYear(selectedYear - 1); }
    else { setSelectedMonth(selectedMonth - 1); }
  };
  const goToNextMonth = () => {
    if (selectedMonth === 11) { setSelectedMonth(0); setSelectedYear(selectedYear + 1); }
    else { setSelectedMonth(selectedMonth + 1); }
  };

  const ledger = useMemo(() => {
    const entries = [];
    if (!isFutureMonth) {
      const record = getEarningsForMonth(selectedYear, selectedMonth);
      const amt = record ? record.amount : defaultEarnings;
      if (amt > 0) entries.push({ id: `e-${selectedYear}-${selectedMonth}`, date: new Date(selectedYear, selectedMonth, 1), description: 'Monthly Salary / Earnings', category: 'Income', type: 'credit', amount: amt, runningBalance: 0 });
    }
    const monthExp = expenses.filter(e => isWithinInterval(new Date(e.date), { start: startOfMonth(new Date(selectedYear, selectedMonth)), end: endOfMonth(new Date(selectedYear, selectedMonth)) }));
    monthExp.forEach(e => entries.push({ id: e.id, date: new Date(e.date), description: e.description, category: e.category, type: 'debit', amount: e.amount, runningBalance: 0 }));
    entries.sort((a, b) => a.date.getTime() - b.date.getTime());
    let bal = 0;
    entries.forEach(e => { if (e.type === 'credit') bal += e.amount; else bal -= e.amount; e.runningBalance = bal; });
    return entries;
  }, [expenses, getEarningsForMonth, defaultEarnings, selectedYear, selectedMonth, isFutureMonth]);

  const totalCredit = ledger.filter(e => e.type === 'credit').reduce((s, e) => s + e.amount, 0);
  const totalDebit = ledger.filter(e => e.type === 'debit').reduce((s, e) => s + e.amount, 0);
  const closingBalance = totalCredit - totalDebit;

  return (
    <div style={{ minHeight: '100vh', padding: '10px' }}>
      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
        
        <div className="glass-card" style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', alignItems: isMobile ? 'flex-start' : 'center', gap: isMobile ? '12px' : '0', padding: '16px', marginBottom: '16px' }}>
          <div>
            <h1 className="text-gradient" style={{ fontSize: isMobile ? '20px' : '24px', fontWeight: 700, margin: 0 }}>Account Statement</h1>
            <p style={{ fontSize: '12px', color: design.colors.textSecondary, margin: '4px 0 0 0' }}>Ledger with running balance.</p>
          </div>
          <button onClick={onBack} className="btn btn-ghost" style={{ padding: '8px 16px', fontSize: '12px', width: isMobile ? '100%' : 'auto' }}>← Back to Dashboard</button>
        </div>

        <div className="glass-card" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '12px', marginBottom: '16px', gap: '16px' }}>
          <button onClick={goToPreviousMonth} className="btn btn-ghost">◀</button>
          <span style={{ fontSize: '16px', fontWeight: 700, color: design.colors.textPrimary, minWidth: '120px', textAlign: 'center' }}>{monthName}</span>
          <button onClick={goToNextMonth} className="btn btn-ghost">▶</button>
        </div>

        {isFutureMonth && (
          <div className="glass-card" style={{ padding: '12px', marginBottom: '16px', background: 'rgba(245, 158, 11, 0.1)', border: `1px solid ${design.colors.warning}30` }}>
            <p style={{ fontSize: '12px', fontWeight: 700, margin: 0, color: design.colors.textPrimary }}>🔮 Future Month</p>
            <p style={{ fontSize: '11px', margin: '2px 0 0 0', color: design.colors.textSecondary }}>Salary credits are not predicted.</p>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: '8px', marginBottom: '16px' }}>
          <div className="glass-card" style={{ padding: '12px', borderLeft: `3px solid ${design.colors.success}` }}>
            <p style={{ fontSize: '10px', color: design.colors.textSecondary, margin: 0, fontWeight: 600, textTransform: 'uppercase' }}>Total Credits</p>
            <h2 style={{ fontSize: '18px', color: design.colors.success, margin: '4px 0 0 0' }}>{isFutureMonth ? '—' : `+₹${totalCredit.toLocaleString('en-IN')}`}</h2>
          </div>
          <div className="glass-card" style={{ padding: '12px', borderLeft: `3px solid ${design.colors.danger}` }}>
            <p style={{ fontSize: '10px', color: design.colors.textSecondary, margin: 0, fontWeight: 600, textTransform: 'uppercase' }}>Total Debits</p>
            <h2 style={{ fontSize: '18px', color: design.colors.danger, margin: '4px 0 0 0' }}>-₹{totalDebit.toLocaleString('en-IN')}</h2>
          </div>
          <div className="glass-card" style={{ padding: '12px', background: design.colors.primaryGradient }}>
            <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.8)', margin: 0, fontWeight: 600, textTransform: 'uppercase' }}>Balance</p>
            <h2 style={{ fontSize: '18px', color: 'white', margin: '4px 0 0 0' }}>₹{isFutureMonth ? totalDebit : closingBalance.toLocaleString('en-IN')}</h2>
          </div>
        </div>

        {ledger.length === 0 ? (
          <div className="glass-card" style={{ padding: '40px', textAlign: 'center', color: design.colors.textSecondary }}>No transactions for {monthName}.</div>
        ) : isMobile ? (
          /* MOBILE CARD VIEW */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {ledger.map(entry => (
              <div key={entry.id} className="glass-card" style={{ padding: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ fontSize: '11px', color: design.colors.textSecondary }}>{format(entry.date, 'dd MMM')}</span>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: entry.type === 'credit' ? design.colors.success : design.colors.danger }}>
                    {entry.type === 'credit' ? '+' : '-'}₹{entry.amount.toLocaleString('en-IN')}
                  </span>
                </div>
                <p style={{ fontSize: '13px', fontWeight: 600, color: design.colors.textPrimary, margin: 0 }}>{entry.description}</p>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px' }}>
                  <span style={{ fontSize: '10px', color: design.colors.textTertiary }}>{entry.category}</span>
                  <span style={{ fontSize: '11px', fontWeight: 600, color: design.colors.textSecondary }}>Bal: ₹{entry.runningBalance.toLocaleString('en-IN')}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* DESKTOP TABLE VIEW */
          <div className="glass-card" style={{ padding: '0', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
              <thead>
                <tr style={{ background: 'rgba(0,0,0,0.02)', borderBottom: `2px solid ${design.colors.primary}20` }}>
                  <th style={{ padding: '16px 24px', textAlign: 'left', fontSize: '11px', color: design.colors.textSecondary, textTransform: 'uppercase' }}>Date</th>
                  <th style={{ padding: '16px 24px', textAlign: 'left', fontSize: '11px', color: design.colors.textSecondary, textTransform: 'uppercase' }}>Description</th>
                  <th style={{ padding: '16px 24px', textAlign: 'right', fontSize: '11px', color: design.colors.textSecondary, textTransform: 'uppercase' }}>Debit</th>
                  <th style={{ padding: '16px 24px', textAlign: 'right', fontSize: '11px', color: design.colors.textSecondary, textTransform: 'uppercase' }}>Credit</th>
                  <th style={{ padding: '16px 24px', textAlign: 'right', fontSize: '11px', color: design.colors.textSecondary, textTransform: 'uppercase' }}>Balance</th>
                </tr>
              </thead>
              <tbody>
                {ledger.map(entry => (
                  <tr key={entry.id} style={{ borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
                    <td style={{ padding: '16px 24px', color: design.colors.textSecondary }}>{format(entry.date, 'dd MMM yyyy')}</td>
                    <td style={{ padding: '16px 24px' }}>
                      <p style={{ margin: 0, fontWeight: 600, color: design.colors.textPrimary }}>{entry.description}</p>
                      <p style={{ margin: 0, fontSize: '11px', color: design.colors.textTertiary }}>{entry.category}</p>
                    </td>
                    <td style={{ padding: '16px 24px', textAlign: 'right', fontWeight: 600, color: design.colors.danger }}>{entry.type === 'debit' ? `-₹${entry.amount.toLocaleString('en-IN')}` : ''}</td>
                    <td style={{ padding: '16px 24px', textAlign: 'right', fontWeight: 600, color: design.colors.success }}>{entry.type === 'credit' ? `+₹${entry.amount.toLocaleString('en-IN')}` : ''}</td>
                    <td style={{ padding: '16px 24px', textAlign: 'right', fontWeight: 700 }}>₹{entry.runningBalance.toLocaleString('en-IN')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default TransactionLedgerPage;