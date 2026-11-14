import React from 'react';
import { theme as design } from '../../styles/theme';
import EarningsView from './EarningsView';

interface Props {
  onBack: () => void;
}

/** Desktop Manage Earnings: page header + the same banking-style view as the phone. */
const EarningsHistoryPage: React.FC<Props> = ({ onBack }) => (
  <div style={{ minHeight: '100vh', padding: '10px' }}>
    <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
      <div className="glass-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', marginBottom: '16px' }}>
        <div>
          <h1 className="text-gradient" style={{ fontSize: '24px', fontWeight: 700, margin: 0 }}>Manage Earnings</h1>
          <p style={{ fontSize: '12px', color: design.colors.textSecondary, margin: '4px 0 0 0' }}>Your earnings for each month. Tap a month to change it.</p>
        </div>
        <button onClick={onBack} className="btn btn-ghost" style={{ padding: '8px 16px', fontSize: '12px' }}>← Back to Dashboard</button>
      </div>
      <div className="bank-ui lg-wide">
        <EarningsView />
      </div>
    </div>
  </div>
);

export default EarningsHistoryPage;
