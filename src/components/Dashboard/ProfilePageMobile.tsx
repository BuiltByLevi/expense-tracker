import React from 'react';
import { theme as design } from '../../styles/theme';
import { useProfileLogic } from '../../hooks/useProfileLogic';
import { WalletIcon, ChartLineIcon, CalendarIcon, SavingsIcon, UserIcon, GearIcon, LockIcon, AlertIcon, CameraIcon, CheckIcon, ShieldCheckIcon } from '../common/FinanceIcons';

interface Props {
  /** Unused: the mobile shell's menu handles navigation. Kept for API parity with the Web page. */
  onBack?: () => void;
}

const ProfilePageMobile: React.FC<Props> = () => {
  const {
    user, theme, toggleTheme, colorTheme, setColorTheme, stats, totalSavings, initials,
    displayName, setDisplayName, savingName, handleSaveName,
    uploadingPhoto, fileInputRef, handlePhotoUpload,
    handleChangePassword, handleLogout, handleDeleteData, deletingData, handleDeleteAccount,
  } = useProfileLogic();

  return (
    <div style={{ padding: '12px' }}>
      <div style={{ maxWidth: '600px', margin: '0 auto' }}>

        {/* Title and navigation live in the mobile shell's top bar. */}
        <p style={{ fontSize: '12px', color: design.colors.textSecondary, margin: '0 4px 10px' }}>Manage your account</p>

        {/* Hero Card - Stacked for Mobile */}
        <div className="glass-card animate-in animate-in-delay-1" style={{
          padding: '20px', marginBottom: '12px',
          display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '12px',
          background: `linear-gradient(135deg, rgba(${design.colors.primaryRgb}, 0.08) 0%, rgba(${design.colors.accentBrightRgb}, 0.08) 100%)`,
          border: `1px solid ${design.colors.primary}20`,
        }}>
          <div style={{ position: 'relative' }}>
            <div style={{
              width: '90px', height: '90px', borderRadius: '50%',
              background: user?.photoURL ? `url(${user.photoURL}) center/cover` : design.colors.primaryGradient,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '32px', fontWeight: 700, color: 'white', overflow: 'hidden',
              boxShadow: `0 8px 24px rgba(${design.colors.primaryRgb}, 0.35)`,
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
              {uploadingPhoto ? '...' : <CameraIcon size={14} color="white" />}
            </button>
            <input type="file" ref={fileInputRef} onChange={handlePhotoUpload} accept="image/*" style={{ display: 'none' }} />
          </div>

          <div>
            <h2 style={{ fontSize: '20px', fontWeight: 700, color: design.colors.textPrimary, margin: '0 0 2px 0' }}>{displayName}</h2>
            <p style={{ fontSize: '12px', color: design.colors.textSecondary, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' }}>{user?.email}</p>
            <div style={{ display: 'flex', gap: '6px', marginTop: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px', padding: '3px 8px', background: `rgba(${design.colors.successRgb}, 0.1)`, color: design.colors.success, borderRadius: '20px', fontWeight: 600 }}><ShieldCheckIcon size={10} color={design.colors.success} /> Verified</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px', padding: '3px 8px', background: `rgba(${design.colors.primaryRgb}, 0.1)`, color: design.colors.primary, borderRadius: '20px', fontWeight: 600 }}><CalendarIcon size={10} color={design.colors.primary} /> {stats.memberSince}</span>
            </div>
          </div>
        </div>

        {/* Stats - 2x2 Grid for Mobile */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '8px', marginBottom: '12px' }}>
          <div className="glass-card" style={{ padding: '14px', textAlign: 'center' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '6px' }}><WalletIcon size={20} color={design.colors.primary} /></div>
            <p style={{ fontSize: '11px', color: design.colors.textSecondary, margin: 0, textTransform: 'uppercase', fontWeight: 600 }}>Total</p>
            <p style={{ fontSize: '16px', fontWeight: 700, color: design.colors.primary, margin: '4px 0 0 0' }}>₹{stats.totalExpenses.toLocaleString('en-IN')}</p>
          </div>
          <div className="glass-card" style={{ padding: '14px', textAlign: 'center' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '6px' }}><ChartLineIcon size={20} color={design.colors.primary} /></div>
            <p style={{ fontSize: '11px', color: design.colors.textSecondary, margin: 0, textTransform: 'uppercase', fontWeight: 600 }}>Transactions</p>
            <p style={{ fontSize: '16px', fontWeight: 700, color: design.colors.textPrimary, margin: '4px 0 0 0' }}>{stats.transactionCount}</p>
          </div>
          <div className="glass-card" style={{ padding: '14px', textAlign: 'center' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '6px' }}><CalendarIcon size={20} color={design.colors.primary} /></div>
            <p style={{ fontSize: '11px', color: design.colors.textSecondary, margin: 0, textTransform: 'uppercase', fontWeight: 600 }}>Months</p>
            <p style={{ fontSize: '16px', fontWeight: 700, color: design.colors.textPrimary, margin: '4px 0 0 0' }}>{stats.monthsTracked}</p>
          </div>
          <div className="glass-card" style={{ padding: '14px', textAlign: 'center' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '6px' }}><SavingsIcon size={20} color={design.colors.success} /></div>
            <p style={{ fontSize: '11px', color: design.colors.textSecondary, margin: 0, textTransform: 'uppercase', fontWeight: 600 }}>Savings</p>
            <p style={{ fontSize: '16px', fontWeight: 700, color: design.colors.success, margin: '4px 0 0 0' }}>₹{totalSavings.toLocaleString('en-IN')}</p>
          </div>
        </div>

        {/* Personal Information */}
        <div className="glass-card" style={{ padding: '16px', marginBottom: '12px' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 700, color: design.colors.textPrimary, margin: '0 0 14px 0', display: 'flex', alignItems: 'center', gap: '7px' }}><UserIcon size={15} color={design.colors.primary} /> Personal Info</h3>
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
          <h3 style={{ fontSize: '14px', fontWeight: 700, color: design.colors.textPrimary, margin: '0 0 14px 0', display: 'flex', alignItems: 'center', gap: '7px' }}><GearIcon size={15} color={design.colors.primary} /> Preferences</h3>
          <div style={{ padding: '10px 0', borderBottom: `1px solid ${design.colors.textTertiary}20` }}>
            <p style={{ fontSize: '13px', fontWeight: 600, color: design.colors.textPrimary, margin: '0 0 8px 0' }}>Theme</p>
            <div style={{ display: 'flex', gap: '8px' }}>
              {([
                { id: 'midnight', label: 'Midnight Teal', swatch: 'linear-gradient(135deg, #1e3a8a 0%, #14b8a6 100%)' },
                { id: 'original', label: 'Original Indigo', swatch: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)' },
              ] as const).map(opt => (
                <button
                  key={opt.id}
                  onClick={() => setColorTheme(opt.id)}
                  className="btn btn-ghost"
                  style={{
                    flex: 1,
                    padding: '8px 10px',
                    fontSize: '11px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    border: colorTheme === opt.id ? `2px solid ${design.colors.primary}` : '2px solid transparent',
                    fontWeight: colorTheme === opt.id ? 700 : 500,
                  }}
                >
                  <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: opt.swatch, flexShrink: 0 }} />
                  {opt.label}
                  {colorTheme === opt.id && <CheckIcon size={10} color={design.colors.primary} strokeWidth={2.5} />}
                </button>
              ))}
            </div>
          </div>
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
          <h3 style={{ fontSize: '14px', fontWeight: 700, color: design.colors.textPrimary, margin: '0 0 14px 0', display: 'flex', alignItems: 'center', gap: '7px' }}><LockIcon size={15} color={design.colors.primary} /> Security</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <button onClick={handleChangePassword} className="btn btn-ghost" style={{ padding: '10px', width: '100%' }}>Send Password Reset Link</button>
            <button onClick={handleLogout} className="btn btn-ghost" style={{ padding: '10px', width: '100%' }}>Sign Out</button>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="glass-card" style={{ padding: '16px', border: `1px solid ${design.colors.danger}30`, background: 'rgba(239, 68, 68, 0.03)' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 700, color: design.colors.danger, margin: '0 0 14px 0', display: 'flex', alignItems: 'center', gap: '7px' }}><AlertIcon size={15} color={design.colors.danger} /> Danger Zone</h3>
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
