import React from 'react';
import { format } from 'date-fns';
import { theme as design } from '../../styles/theme';
import { useTransactionLedgerLogic } from '../../hooks/useTransactionLedgerLogic';
import MonthYearPicker from '../common/MonthYearPicker';

interface TransactionLedgerPageProps {
  onBack: () => void;
}

const TransactionLedgerPage: React.FC<TransactionLedgerPageProps> = ({ onBack }) => {
  const {
    selectedYear, selectedMonth, currentYear, currentMonth, isFutureMonth,
    goToPreviousMonth, goToNextMonth, goToCurrentMonth, goToMonth,
    ledger, totalCredit, totalDebit, closingBalance,
  } = useTransactionLedgerLogic();

  const monthName = format(new Date(selectedYear, selectedMonth), 'MMMM yyyy');

  return (
    <div style={{ minHeight: '100vh', padding: '10px' }}>
      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>

        <div className="glass-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', marginBottom: '16px' }}>
          <div>
            <h1 className="text-gradient" style={{ fontSize: '24px', fontWeight: 700, margin: 0 }}>Account Statement</h1>
            <p style={{ fontSize: '12px', color: design.colors.textSecondary, margin: '4px 0 0 0' }}>Ledger with running balance.</p>
          </div>
          <button onClick={onBack} className="btn btn-ghost" style={{ padding: '8px 16px', fontSize: '12px' }}>← Back to Dashboard</button>
        </div>

        <div className="glass-card" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '12px', marginBottom: '16px', gap: '16px' }}>
          <button onClick={goToPreviousMonth} className="btn btn-ghost" aria-label="Previous month">◀</button>
          <MonthYearPicker
            year={selectedYear}
            month={selectedMonth}
            currentYear={currentYear}
            currentMonth={currentMonth}
            onSelect={goToMonth}
            trigger={
              <span style={{ fontSize: '16px', fontWeight: 700, color: design.colors.textPrimary, minWidth: '120px', textAlign: 'center', display: 'inline-block' }}>{monthName}</span>
            }
          />
          <button onClick={goToNextMonth} className="btn btn-ghost" aria-label="Next month">▶</button>
          <button onClick={goToCurrentMonth} className="btn btn-primary" style={{ padding: '8px 16px', fontSize: '12px' }}>Today</button>
        </div>

        {isFutureMonth && (
          <div className="glass-card" style={{ padding: '12px', marginBottom: '16px', background: 'rgba(245, 158, 11, 0.1)', border: `1px solid ${design.colors.warning}30` }}>
            <p style={{ fontSize: '12px', fontWeight: 700, margin: 0, color: design.colors.textPrimary }}>🔮 Future Month</p>
            <p style={{ fontSize: '11px', margin: '2px 0 0 0', color: design.colors.textSecondary }}>Salary credits are not predicted.</p>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '16px' }}>
          <div className="glass-card" style={{ padding: '12px', borderLeft: `3px solid ${design.colors.success}` }}>
            <p style={{ fontSize: '11px', color: design.colors.textSecondary, margin: 0, fontWeight: 600, textTransform: 'uppercase' }}>Total Credits</p>
            <h2 style={{ fontSize: '18px', color: design.colors.success, margin: '4px 0 0 0' }}>{isFutureMonth ? '—' : `+₹${totalCredit.toLocaleString('en-IN')}`}</h2>
          </div>
          <div className="glass-card" style={{ padding: '12px', borderLeft: `3px solid ${design.colors.danger}` }}>
            <p style={{ fontSize: '11px', color: design.colors.textSecondary, margin: 0, fontWeight: 600, textTransform: 'uppercase' }}>Total Debits</p>
            <h2 style={{ fontSize: '18px', color: design.colors.danger, margin: '4px 0 0 0' }}>-₹{totalDebit.toLocaleString('en-IN')}</h2>
          </div>
          <div className="glass-card" style={{ padding: '12px', background: design.colors.primaryGradient }}>
            <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.8)', margin: 0, fontWeight: 600, textTransform: 'uppercase' }}>Balance</p>
            <h2 style={{ fontSize: '18px', color: 'white', margin: '4px 0 0 0' }}>₹{isFutureMonth ? totalDebit : closingBalance.toLocaleString('en-IN')}</h2>
          </div>
        </div>

        {ledger.length === 0 ? (
          <div className="glass-card" style={{ padding: '40px', textAlign: 'center', color: design.colors.textSecondary }}>No transactions for {monthName}.</div>
        ) : (
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
                {ledger.map((entry) => (
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
