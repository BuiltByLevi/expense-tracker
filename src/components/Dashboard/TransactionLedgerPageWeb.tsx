import React from 'react';
import { theme as design } from '../../styles/theme';
import LedgerView from './LedgerView';

interface TransactionLedgerPageProps {
  onBack: () => void;
}

/** Desktop Monthly Ledger: page header + the same banking-style ledger as the phone. */
const TransactionLedgerPage: React.FC<TransactionLedgerPageProps> = ({ onBack }) => (
  <div style={{ minHeight: '100vh', padding: '10px' }}>
    <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
      <div className="glass-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', marginBottom: '16px' }}>
        <div>
          <h1 className="text-gradient" style={{ fontSize: '24px', fontWeight: 700, margin: 0 }}>Monthly Ledger</h1>
          <p style={{ fontSize: '12px', color: design.colors.textSecondary, margin: '4px 0 0 0' }}>Every credit and debit for the month, with running balance.</p>
        </div>
        <button onClick={onBack} className="btn btn-ghost" style={{ padding: '8px 16px', fontSize: '12px' }}>← Back to Dashboard</button>
      </div>
      <div className="bank-ui lg-wide">
        <LedgerView />
      </div>
    </div>
  </div>
);

export default TransactionLedgerPage;
