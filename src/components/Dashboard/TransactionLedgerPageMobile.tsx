import React from 'react';
import { format } from 'date-fns';
import { theme as design, categoryColors } from '../../styles/theme';
import { useTransactionLedgerLogic } from '../../hooks/useTransactionLedgerLogic';
import { EXPENSE_CATEGORIES } from '../../types';
import MonthYearPicker from '../common/MonthYearPicker';

interface Props {
  onBack: () => void;
}

function getCategoryColor(category: string): string | null {
  const idx = (EXPENSE_CATEGORIES as readonly string[]).indexOf(category);
  return idx === -1 ? null : categoryColors[idx % categoryColors.length];
}

const TransactionLedgerPageMobile: React.FC<Props> = ({ onBack }) => {
  const {
    selectedYear, selectedMonth, currentYear, currentMonth, isFutureMonth,
    goToPreviousMonth, goToNextMonth, goToCurrentMonth, goToMonth,
    ledger, totalCredit, totalDebit, closingBalance,
  } = useTransactionLedgerLogic();

  const monthName = format(new Date(selectedYear, selectedMonth), 'MMMM yyyy');

  return (
    <div style={{ minHeight: '100vh', padding: '10px' }}>
      <div style={{ maxWidth: '600px', margin: '0 auto' }}>

        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '16px', marginBottom: '16px' }}>
          <div>
            <h1 className="text-gradient" style={{ fontSize: '20px', fontWeight: 700, margin: 0 }}>Account Statement</h1>
            <p style={{ fontSize: '12px', color: design.colors.textSecondary, margin: '4px 0 0 0' }}>Ledger with running balance.</p>
          </div>
          <button onClick={onBack} className="btn btn-ghost" style={{ padding: '8px', fontSize: '12px', width: '100%' }}>← Back to Dashboard</button>
        </div>

        <div className="glass-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', marginBottom: '10px', gap: '6px', flexWrap: 'wrap' }}>
          <button onClick={goToPreviousMonth} className="btn btn-ghost" aria-label="Previous month" style={{ padding: '8px 12px', fontSize: '16px', flexShrink: 0 }}>◀</button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <MonthYearPicker
              year={selectedYear}
              month={selectedMonth}
              currentYear={currentYear}
              currentMonth={currentMonth}
              onSelect={goToMonth}
              trigger={
                <span style={{ fontSize: '15px', fontWeight: 700, color: design.colors.textPrimary, textAlign: 'center', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{monthName}</span>
              }
            />
          </div>
          <button onClick={goToNextMonth} className="btn btn-ghost" aria-label="Next month" style={{ padding: '8px 12px', fontSize: '16px', flexShrink: 0 }}>▶</button>
        </div>
        <div style={{ marginBottom: '16px' }}>
          <button onClick={goToCurrentMonth} className="btn btn-primary" style={{ padding: '8px', fontSize: '12px', width: '100%' }}>Today</button>
        </div>

        {isFutureMonth && (
          <div className="glass-card" style={{ padding: '12px', marginBottom: '16px', background: 'rgba(245, 158, 11, 0.1)', border: `1px solid ${design.colors.warning}30` }}>
            <p style={{ fontSize: '12px', fontWeight: 700, margin: 0, color: design.colors.textPrimary }}>🔮 Future Month</p>
            <p style={{ fontSize: '11px', margin: '2px 0 0 0', color: design.colors.textSecondary }}>Salary credits are not predicted.</p>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
          <div className="glass-card" style={{ padding: '12px', borderLeft: `4px solid ${design.colors.success}`, display: 'flex', justifyContent: 'space-between' }}>
            <p style={{ fontSize: '12px', color: design.colors.textSecondary, margin: 0, fontWeight: 600, textTransform: 'uppercase' }}>Total Credits</p>
            <h2 style={{ fontSize: '16px', color: design.colors.success, margin: 0 }}>{isFutureMonth ? '—' : `+₹${totalCredit.toLocaleString('en-IN')}`}</h2>
          </div>
          <div className="glass-card" style={{ padding: '12px', borderLeft: `4px solid ${design.colors.danger}`, display: 'flex', justifyContent: 'space-between' }}>
            <p style={{ fontSize: '12px', color: design.colors.textSecondary, margin: 0, fontWeight: 600, textTransform: 'uppercase' }}>Total Debits</p>
            <h2 style={{ fontSize: '16px', color: design.colors.danger, margin: 0 }}>-₹{totalDebit.toLocaleString('en-IN')}</h2>
          </div>
          <div className="glass-card" style={{ padding: '12px', background: design.colors.primaryGradient, display: 'flex', justifyContent: 'space-between' }}>
            <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.9)', margin: 0, fontWeight: 600, textTransform: 'uppercase' }}>Closing Balance</p>
            <h2 style={{ fontSize: '16px', color: 'white', margin: 0 }}>₹{isFutureMonth ? totalDebit : closingBalance.toLocaleString('en-IN')}</h2>
          </div>
        </div>

        {ledger.length === 0 ? (
          <div className="glass-card" style={{ padding: '40px', textAlign: 'center', color: design.colors.textSecondary }}>No transactions for {monthName}.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {ledger.map((entry) => {
              const categoryColor = getCategoryColor(entry.category);
              return (
                <div key={entry.id} className="glass-card" style={{ padding: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ fontSize: '11px', color: design.colors.textSecondary }}>{format(entry.date, 'dd MMM')}</span>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: entry.type === 'credit' ? design.colors.success : design.colors.danger }}>
                      {entry.type === 'credit' ? '+' : '-'}₹{entry.amount.toLocaleString('en-IN')}
                    </span>
                  </div>
                  <p style={{ fontSize: '13px', fontWeight: 600, color: design.colors.textPrimary, margin: 0 }}>{entry.description}</p>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
                    {categoryColor ? (
                      <span style={{
                        fontSize: '10px', fontWeight: 600, padding: '2px 8px', borderRadius: '20px',
                        background: `${categoryColor}20`, color: categoryColor,
                      }}>
                        {entry.category}
                      </span>
                    ) : (
                      <span style={{ fontSize: '10px', color: design.colors.textTertiary }}>{entry.category}</span>
                    )}
                    <span style={{ fontSize: '11px', fontWeight: 600, color: design.colors.textSecondary }}>Bal: ₹{entry.runningBalance.toLocaleString('en-IN')}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default TransactionLedgerPageMobile;
