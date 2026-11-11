import React from 'react';
import { theme as design } from '../../styles/theme';
import { useProfileLogic } from '../../hooks/useProfileLogic';

interface Props {
  onBack: () => void;
}

const ProfilePageMobile: React.FC<Props> = ({ onBack }) => {
  const {
    user, theme, toggleTheme, stats, totalSavings, initials,
    displayName, setDisplayName, savingName, handleSaveName,
    uploadingPhoto, fileInputRef, handlePhotoUpload,
    handleChangePassword, handleLogout, handleDeleteData, deletingData, handleDeleteAccount,
  } = useProfileLogic();

  return (
    <div className="glass-page" style={{ padding: '10px' }}>
      <div style={{ maxWidth: '600px', margin: '0 auto' }}>

        {/* Header */}
        <div className="glass-card animate-in" style={{ padding: '16px', marginBottom: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div>
            <h1 className="text-gradient" style={{ fontSize: '20px', fontWeight: 700, margin: 0 }}>My Profile</h1>
            <p style={{ fontSize: '12px', color: design.colors.textSecondary, margin: '2px 0 0 0' }}>Manage your account</p>
          </div>
          <button onClick={onBack} className="btn btn-ghost" style={{ padding: '8px', fontSize: '12px', width: '100%' }}>← Back to Dashboard</button>
        </div>

        {/* Hero Card - Stacked for Mobile */}
        <div className="glass-card animate-in animate-in-delay-1" style={{
          padding: '20px', marginBottom: '12px',
          display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '12px',
          background: 'linear-gradient(135deg, rgba(30, 64, 175, 0.08) 0%, rgba(45, 212, 191, 0.08) 100%)',
          border: `1px solid ${design.colors.primary}20`,
        }}>
          <div style={{ position: 'relative' }}>
            <div style={{
              width: '90px', height: '90px', borderRadius: '50%',
              background: user?.photoURL ? `url(${user.photoURL}) center/cover` : 'linear-gradient(135deg, #1e3a8a 0%, #14b8a6 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '32px', fontWeight: 700, color: 'white', overflow: 'hidden',
              boxShadow: '0 8px 24px rgba(30, 64, 175, 0.35)',
            }}>
              {!user?.photoURL && initials}
            </div>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingPhoto}
              aria-label="Change profile picture"
              style={{
                position: 'absolute', bottom: 0, right: 0, width: '30px', height: '30px', borderRadius: '50%',
                background: design.colors.primary, color: 'white', border: '3px solid white',
                cursor: uploadingPhoto ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px',
              }}
            >
              {uploadingPhoto ? '...' : '📷'}
            </button>
            <input type="file" ref={fileInputRef} onChange={handlePhotoUpload} accept="image/*" style={{ display: 'none' }} />
          </div>

          <div>
            <h2 style={{ fontSize: '20px', fontWeight: 700, color: design.colors.textPrimary, margin: '0 0 2px 0' }}>{displayName}</h2>
            <p style={{ fontSize: '12px', color: design.colors.textSecondary, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' }}>{user?.email}</p>
            <div style={{ display: 'flex', gap: '6px', marginTop: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '11px', padding: '3px 8px', background: 'rgba(20, 184, 166, 0.1)', color: design.colors.success, borderRadius: '20px', fontWeight: 600 }}>✓ Verified</span>
              <span style={{ fontSize: '11px', padding: '3px 8px', background: 'rgba(30, 64, 175, 0.1)', color: design.colors.primary, borderRadius: '20px', fontWeight: 600 }}>📅 {stats.memberSince}</span>
            </div>
          </div>
        </div>

        {/* Stats - 2x2 Grid for Mobile */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '8px', marginBottom: '12px' }}>
          <div className="glass-card" style={{ padding: '14px', textAlign: 'center' }}>
            <div style={{ fontSize: '22px', marginBottom: '4px' }}>💰</div>
            <p style={{ fontSize: '11px', color: design.colors.textSecondary, margin: 0, textTransform: 'uppercase', fontWeight: 600 }}>Total</p>
            <p style={{ fontSize: '16px', fontWeight: 700, color: design.colors.primary, margin: '4px 0 0 0' }}>₹{stats.totalExpenses.toLocaleString('en-IN')}</p>
          </div>
          <div className="glass-card" style={{ padding: '14px', textAlign: 'center' }}>
            <div style={{ fontSize: '22px', marginBottom: '4px' }}>📊</div>
            <p style={{ fontSize: '11px', color: design.colors.textSecondary, margin: 0, textTransform: 'uppercase', fontWeight: 600 }}>Transactions</p>
            <p style={{ fontSize: '16px', fontWeight: 700, color: design.colors.textPrimary, margin: '4px 0 0 0' }}>{stats.transactionCount}</p>
          </div>
          <div className="glass-card" style={{ padding: '14px', textAlign: 'center' }}>
            <div style={{ fontSize: '22px', marginBottom: '4px' }}>🗓️</div>
            <p style={{ fontSize: '11px', color: design.colors.textSecondary, margin: 0, textTransform: 'uppercase', fontWeight: 600 }}>Months</p>
            <p style={{ fontSize: '16px', fontWeight: 700, color: design.colors.textPrimary, margin: '4px 0 0 0' }}>{stats.monthsTracked}</p>
          </div>
          <div className="glass-card" style={{ padding: '14px', textAlign: 'center' }}>
            <div style={{ fontSize: '22px', marginBottom: '4px' }}>⚡</div>
            <p style={{ fontSize: '11px', color: design.colors.textSecondary, margin: 0, textTransform: 'uppercase', fontWeight: 600 }}>Savings</p>
            <p style={{ fontSize: '16px', fontWeight: 700, color: design.colors.success, margin: '4px 0 0 0' }}>₹{totalSavings.toLocaleString('en-IN')}</p>
          </div>
        </div>

        {/* Personal Information */}
        <div className="glass-card" style={{ padding: '16px', marginBottom: '12px' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 700, color: design.colors.textPrimary, margin: '0 0 14px 0' }}>👤 Personal Info</h3>
          <div style={{ marginBottom: '12px' }}>
            <label className="input-label">Display Name</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <input type="text" className="input" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
              <button onClick={handleSaveName} disabled={savingName || displayName === (user?.displayName || user?.email?.split('@')[0])} className="btn btn-primary" style={{ padding: '10px', width: '100%' }}>
                {savingName ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
          <div>
            <label className="input-label">Email</label>
            <input type="email" className="input" value={user?.email || ''} disabled style={{ opacity: 0.6 }} />
          </div>
        </div>

        {/* Preferences */}
        <div className="glass-card" style={{ padding: '16px', marginBottom: '12px' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 700, color: design.colors.textPrimary, margin: '0 0 14px 0' }}>⚙️ Preferences</h3>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: `1px solid ${design.colors.textTertiary}20` }}>
            <div><p style={{ fontSize: '13px', fontWeight: 600, color: design.colors.textPrimary, margin: 0 }}>Appearance</p><p style={{ fontSize: '11px', color: design.colors.textSecondary, margin: 0 }}>{theme} mode</p></div>
            <button onClick={toggleTheme} className="btn btn-ghost" style={{ padding: '6px 12px', fontSize: '11px' }}>Toggle</button>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0' }}>
            <div><p style={{ fontSize: '13px', fontWeight: 600, color: design.colors.textPrimary, margin: 0 }}>Last Sign In</p><p style={{ fontSize: '11px', color: design.colors.textSecondary, margin: 0 }}>{stats.lastSignIn}</p></div>
          </div>
        </div>

        {/* Security */}
        <div className="glass-card" style={{ padding: '16px', marginBottom: '12px' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 700, color: design.colors.textPrimary, margin: '0 0 14px 0' }}>🔒 Security</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <button onClick={handleChangePassword} className="btn btn-ghost" style={{ padding: '10px', width: '100%' }}>Send Password Reset Link</button>
            <button onClick={handleLogout} className="btn btn-ghost" style={{ padding: '10px', width: '100%' }}>Sign Out</button>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="glass-card" style={{ padding: '16px', border: `1px solid ${design.colors.danger}30`, background: 'rgba(239, 68, 68, 0.03)' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 700, color: design.colors.danger, margin: '0 0 14px 0' }}>⚠️ Danger Zone</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <button onClick={handleDeleteData} disabled={deletingData} className="btn" style={{ padding: '10px', width: '100%', background: design.colors.danger, color: 'white', opacity: deletingData ? 0.6 : 1 }}>
              {deletingData ? 'Deleting...' : 'Delete All Data'}
            </button>
            <button onClick={handleDeleteAccount} className="btn" style={{ padding: '10px', width: '100%', background: design.colors.danger, color: 'white' }}>Delete Account</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePageMobile;
