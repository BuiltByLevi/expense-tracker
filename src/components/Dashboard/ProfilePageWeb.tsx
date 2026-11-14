import React from 'react';
import { theme as design } from '../../styles/theme';
import ProfileView from './ProfileView';

interface Props {
  onBack: () => void;
  onOpenEarnings?: () => void;
}

/** Desktop profile: page header + the same banking-style settings as the phone. */
const ProfilePage: React.FC<Props> = ({ onBack, onOpenEarnings }) => (
  <div style={{ minHeight: '100vh', padding: '10px' }}>
    <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
      <div className="glass-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', marginBottom: '16px' }}>
        <div>
          <h1 className="text-gradient" style={{ fontSize: '24px', fontWeight: 700, margin: 0 }}>My Profile</h1>
          <p style={{ fontSize: '12px', color: design.colors.textSecondary, margin: '4px 0 0 0' }}>Your account, appearance and security settings.</p>
        </div>
        <button onClick={onBack} className="btn btn-ghost" style={{ padding: '8px 16px', fontSize: '12px' }}>← Back to Dashboard</button>
      </div>
      <div className="bank-ui pf-desktop">
        <ProfileView onOpenEarnings={onOpenEarnings} />
      </div>
    </div>
  </div>
);

export default ProfilePage;
