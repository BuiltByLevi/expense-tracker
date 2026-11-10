import React from 'react';
import { theme as design } from '../../styles/theme';
import { useProfileLogic } from '../../hooks/useProfileLogic';

interface Props {
  onBack: () => void;
}

const ProfilePage: React.FC<Props> = ({ onBack }) => {
  const {
    user, theme, toggleTheme, defaultEarnings, stats, totalSavings, initials,
    displayName, setDisplayName, savingName, handleSaveName,
    uploadingPhoto, fileInputRef, handlePhotoUpload,
    handleChangePassword, handleLogout, handleDeleteData, deletingData, handleDeleteAccount,
  } = useProfileLogic();

  return (
    <div className="glass-page">
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>

        {/* Header */}
        <div className="glass-card animate-in" style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '20px 28px', marginBottom: '20px',
        }}>
          <div>
            <h1 className="text-gradient" style={{ fontSize: '24px', fontWeight: 700, margin: 0 }}>
              My Profile
            </h1>
            <p style={{ fontSize: '13px', color: design.colors.textSecondary, margin: '4px 0 0 0' }}>
              Manage your account and preferences
            </p>
          </div>
          <button onClick={onBack} className="btn btn-ghost" style={{ padding: '10px 20px' }}>
            ← Back to Dashboard
          </button>
        </div>

        {/* Profile Hero Card */}
        <div className="glass-card animate-in animate-in-delay-1" style={{
          display: 'flex', alignItems: 'center', gap: '24px',
          padding: '32px', marginBottom: '20px',
          background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.08) 0%, rgba(139, 92, 246, 0.08) 100%)',
          border: `1px solid ${design.colors.primary}20`,
        }}>

          {/* Avatar with Upload */}
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <div style={{
              width: '100px', height: '100px', borderRadius: '50%',
              background: user?.photoURL ? `url(${user.photoURL}) center/cover` : 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '36px', fontWeight: 700, color: 'white',
              boxShadow: '0 8px 24px rgba(99, 102, 241, 0.35)',
              overflow: 'hidden',
            }}>
              {!user?.photoURL && initials}
            </div>

            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingPhoto}
              aria-label="Change profile picture"
              style={{
                position: 'absolute', bottom: 0, right: 0,
                width: '32px', height: '32px', borderRadius: '50%',
                background: design.colors.primary, color: 'white',
                border: '3px solid white', cursor: uploadingPhoto ? 'wait' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '14px', boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
              }}
              title="Change profile picture"
            >
              {uploadingPhoto ? '...' : '📷'}
            </button>

            <input
              type="file"
              ref={fileInputRef}
              onChange={handlePhotoUpload}
              accept="image/*"
              style={{ display: 'none' }}
            />
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 style={{ fontSize: '24px', fontWeight: 700, color: design.colors.textPrimary, margin: '0 0 4px 0' }}>
              {displayName}
            </h2>
            <p style={{ fontSize: '14px', color: design.colors.textSecondary, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user?.email}
            </p>
            <div style={{ display: 'flex', gap: '12px', marginTop: '8px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '11px', padding: '4px 10px', background: 'rgba(16, 185, 129, 0.1)', color: design.colors.success, borderRadius: '20px', fontWeight: 600 }}>
                ✓ Verified Account
              </span>
              <span style={{ fontSize: '11px', padding: '4px 10px', background: 'rgba(99, 102, 241, 0.1)', color: design.colors.primary, borderRadius: '20px', fontWeight: 600 }}>
                📅 Member since {stats.memberSince}
              </span>
            </div>
          </div>
        </div>

        {/* Profile Statistics */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '20px' }}>
          <div className="glass-card animate-in animate-in-delay-1" style={{ padding: '20px', textAlign: 'center' }}>
            <div style={{ fontSize: '28px', marginBottom: '8px' }}>💰</div>
            <p style={{ fontSize: '11px', color: design.colors.textSecondary, margin: 0, textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.05em' }}>
              Total Tracked
            </p>
            <p style={{ fontSize: '22px', fontWeight: 700, color: design.colors.primary, margin: '6px 0 0 0' }}>
              ₹{stats.totalExpenses.toLocaleString('en-IN')}
            </p>
          </div>

          <div className="glass-card animate-in animate-in-delay-2" style={{ padding: '20px', textAlign: 'center' }}>
            <div style={{ fontSize: '28px', marginBottom: '8px' }}>📊</div>
            <p style={{ fontSize: '11px', color: design.colors.textSecondary, margin: 0, textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.05em' }}>
              Transactions
            </p>
            <p style={{ fontSize: '22px', fontWeight: 700, color: design.colors.textPrimary, margin: '6px 0 0 0' }}>
              {stats.transactionCount}
            </p>
          </div>

          <div className="glass-card animate-in animate-in-delay-3" style={{ padding: '20px', textAlign: 'center' }}>
            <div style={{ fontSize: '28px', marginBottom: '8px' }}>🗓️</div>
            <p style={{ fontSize: '11px', color: design.colors.textSecondary, margin: 0, textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.05em' }}>
              Months Tracked
            </p>
            <p style={{ fontSize: '22px', fontWeight: 700, color: design.colors.textPrimary, margin: '6px 0 0 0' }}>
              {stats.monthsTracked}
            </p>
          </div>

          <div className="glass-card animate-in animate-in-delay-4" style={{ padding: '20px', textAlign: 'center' }}>
            <div style={{ fontSize: '28px', marginBottom: '8px' }}>⚡</div>
            <p style={{ fontSize: '11px', color: design.colors.textSecondary, margin: 0, textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.05em' }}>
              Total Savings
            </p>
            <p style={{ fontSize: '22px', fontWeight: 700, color: design.colors.success, margin: '6px 0 0 0' }}>
              ₹{totalSavings.toLocaleString('en-IN')}
            </p>
          </div>
        </div>

        {/* Personal Information */}
        <div className="glass-card animate-in animate-in-delay-2" style={{ padding: '24px', marginBottom: '20px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 700, color: design.colors.textPrimary, margin: '0 0 20px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>👤</span> Personal Information
          </h3>

          <div style={{ marginBottom: '16px' }}>
            <label className="input-label">Display Name</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                className="input"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Enter your name"
              />
              <button
                onClick={handleSaveName}
                disabled={savingName || displayName === (user?.displayName || user?.email?.split('@')[0])}
                className="btn btn-primary"
                style={{ padding: '0 24px', whiteSpace: 'nowrap' }}
              >
                {savingName ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>

          <div>
            <label className="input-label">Email Address</label>
            <input
              type="email"
              className="input"
              value={user?.email || ''}
              disabled
              style={{ opacity: 0.6, cursor: 'not-allowed' }}
            />
            <p style={{ fontSize: '11px', color: design.colors.textTertiary, margin: '6px 0 0 0' }}>
              Email cannot be changed. Contact support if needed.
            </p>
          </div>
        </div>

        {/* Preferences */}
        <div className="glass-card animate-in animate-in-delay-3" style={{ padding: '24px', marginBottom: '20px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 700, color: design.colors.textPrimary, margin: '0 0 20px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>⚙️</span> Preferences
          </h3>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: `1px solid ${design.colors.textTertiary}20` }}>
            <div>
              <p style={{ fontSize: '14px', fontWeight: 600, color: design.colors.textPrimary, margin: 0 }}>
                Appearance
              </p>
              <p style={{ fontSize: '12px', color: design.colors.textSecondary, margin: '2px 0 0 0' }}>
                Currently using {theme} mode
              </p>
            </div>
            <button onClick={toggleTheme} className="btn btn-ghost" style={{ padding: '8px 16px' }}>
              {theme === 'light' ? '🌙 Switch to Dark' : '☀️ Switch to Light'}
            </button>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: `1px solid ${design.colors.textTertiary}20` }}>
            <div>
              <p style={{ fontSize: '14px', fontWeight: 600, color: design.colors.textPrimary, margin: 0 }}>
                Default Monthly Earnings
              </p>
              <p style={{ fontSize: '12px', color: design.colors.textSecondary, margin: '2px 0 0 0' }}>
                ₹{defaultEarnings.toLocaleString('en-IN')} (used for new months)
              </p>
            </div>
            <span style={{ fontSize: '12px', color: design.colors.textTertiary }}>
              Change in Earnings History →
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0' }}>
            <div>
              <p style={{ fontSize: '14px', fontWeight: 600, color: design.colors.textPrimary, margin: 0 }}>
                Last Sign In
              </p>
              <p style={{ fontSize: '12px', color: design.colors.textSecondary, margin: '2px 0 0 0' }}>
                {stats.lastSignIn}
              </p>
            </div>
          </div>
        </div>

        {/* Security */}
        <div className="glass-card animate-in animate-in-delay-4" style={{ padding: '24px', marginBottom: '20px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 700, color: design.colors.textPrimary, margin: '0 0 20px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>🔒</span> Security
          </h3>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: `1px solid ${design.colors.textTertiary}20` }}>
            <div>
              <p style={{ fontSize: '14px', fontWeight: 600, color: design.colors.textPrimary, margin: 0 }}>
                Change Password
              </p>
              <p style={{ fontSize: '12px', color: design.colors.textSecondary, margin: '2px 0 0 0' }}>
                Send a password reset link to your email
              </p>
            </div>
            <button onClick={handleChangePassword} className="btn btn-ghost" style={{ padding: '8px 16px' }}>
              Send Reset Link
            </button>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0' }}>
            <div>
              <p style={{ fontSize: '14px', fontWeight: 600, color: design.colors.textPrimary, margin: 0 }}>
                Sign Out
              </p>
              <p style={{ fontSize: '12px', color: design.colors.textSecondary, margin: '2px 0 0 0' }}>
                Sign out from your current session
              </p>
            </div>
            <button onClick={handleLogout} className="btn btn-ghost" style={{ padding: '8px 16px' }}>
              Sign Out
            </button>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="glass-card animate-in" style={{ padding: '24px', border: `1px solid ${design.colors.danger}30`, background: 'rgba(239, 68, 68, 0.03)' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 700, color: design.colors.danger, margin: '0 0 20px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>⚠️</span> Danger Zone
          </h3>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: `1px solid ${design.colors.danger}20` }}>
            <div>
              <p style={{ fontSize: '14px', fontWeight: 600, color: design.colors.textPrimary, margin: 0 }}>
                Delete All Expense Data
              </p>
              <p style={{ fontSize: '12px', color: design.colors.textSecondary, margin: '2px 0 0 0' }}>
                Permanently delete all your expenses, income, and earnings history. Account stays active.
              </p>
            </div>
            <button onClick={handleDeleteData} disabled={deletingData} className="btn" style={{ padding: '8px 16px', background: design.colors.danger, color: 'white', opacity: deletingData ? 0.6 : 1 }}>
              {deletingData ? 'Deleting...' : 'Delete Data'}
            </button>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0' }}>
            <div>
              <p style={{ fontSize: '14px', fontWeight: 600, color: design.colors.textPrimary, margin: 0 }}>
                Delete Account
              </p>
              <p style={{ fontSize: '12px', color: design.colors.textSecondary, margin: '2px 0 0 0' }}>
                Permanently delete your account and all associated data.
              </p>
            </div>
            <button onClick={handleDeleteAccount} className="btn" style={{ padding: '8px 16px', background: design.colors.danger, color: 'white' }}>
              Delete Account
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
