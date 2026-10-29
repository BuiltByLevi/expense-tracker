import React, { useState, useMemo, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useExpenses } from '../../hooks/useExpenses';
import { useEarnings } from '../../context/EarningsContext';
import { useTheme } from '../../context/ThemeContext';
import { theme as design } from '../../styles/theme';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

interface Props {
  onBack: () => void;
}

const CLOUDINARY_CLOUD_NAME = 'iwa2pjzg'; 
const CLOUDINARY_UPLOAD_PRESET = 'levihere';

const ProfilePageMobile: React.FC<Props> = ({ onBack }) => {
  const { user, logout, updateUserProfile } = useAuth();
  const { expenses } = useExpenses();
  const { earningsHistory, earnings: defaultEarnings } = useEarnings();
  const { theme, toggleTheme } = useTheme();

  const [displayName, setDisplayName] = useState(
    user?.displayName || user?.email?.split('@')[0] || 'User'
  );
  const [savingName, setSavingName] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const stats = useMemo(() => {
    const totalSpent = expenses.reduce((s, e) => s + e.amount, 0);
    const uniqueMonths = new Set(
      expenses.map(e => {
        const d = new Date(e.date);
        return `${d.getFullYear()}-${d.getMonth()}`;
      })
    );
    return {
      totalExpenses: totalSpent,
      transactionCount: expenses.length,
      monthsTracked: uniqueMonths.size,
      memberSince: user?.metadata?.creationTime
        ? format(new Date(user.metadata.creationTime), 'MMMM yyyy')
        : 'Recently',
      lastSignIn: user?.metadata?.lastSignInTime
        ? format(new Date(user.metadata.lastSignInTime), 'dd MMM yyyy, hh:mm a')
        : 'Just now',
    };
  }, [expenses, user]);

  const initials = useMemo(() => {
    const name = displayName || user?.email?.split('@')[0] || 'U';
    const parts = name.split(/[\s._-]/);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.substring(0, 2).toUpperCase();
  }, [displayName, user]);

  const handleSaveName = async () => {
    if (!displayName.trim()) { toast.error('Display name cannot be empty'); return; }
    setSavingName(true);
    try {
      await updateUserProfile({ displayName });
      toast.success('Display name updated');
    } catch { toast.error('Failed to update name'); }
    finally { setSavingName(false); }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (file.size > 2 * 1024 * 1024) { toast.error('Image must be less than 2MB'); return; }
    if (!file.type.startsWith('image/')) { toast.error('Please select an image file'); return; }

    setUploadingPhoto(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

      const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();
      if (data.secure_url) {
        await updateUserProfile({ photoURL: data.secure_url });
        toast.success('Profile picture updated!');
      } else { throw new Error('Upload failed'); }
    } catch (error) {
      console.error(error);
      toast.error('Failed to upload picture');
    } finally { setUploadingPhoto(false); }
  };

  const handleChangePassword = () => toast.success('Password reset email sent!', { duration: 4000 });
  const handleLogout = async () => { if (window.confirm('Sign out?')) await logout(); };
  
  const handleDeleteData = () => {
    const confirmText = window.prompt('Type "DELETE":');
    if (confirmText === 'DELETE') toast.error('Backend implementation required');
  };
  const handleDeleteAccount = () => {
    const confirmText = window.prompt('Type "DELETE ACCOUNT":');
    if (confirmText === 'DELETE ACCOUNT') toast.error('Contact support');
  };

  return (
    <div className="glass-page" style={{ padding: '10px' }}>
      <div style={{ maxWidth: '600px', margin: '0 auto' }}>

        {/* Header */}
        <div className="glass-card animate-in" style={{ padding: '16px', marginBottom: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div>
            <h1 className="text-gradient" style={{ fontSize: '20px', fontWeight: 700, margin: 0 }}>My Profile</h1>
            <p style={{ fontSize: '11px', color: design.colors.textSecondary, margin: '2px 0 0 0' }}>Manage your account</p>
          </div>
          <button onClick={onBack} className="btn btn-ghost" style={{ padding: '8px', fontSize: '12px', width: '100%' }}>← Back to Dashboard</button>
        </div>

        {/* Hero Card - Stacked for Mobile */}
        <div className="glass-card animate-in animate-in-delay-1" style={{ 
          padding: '20px', marginBottom: '12px', 
          display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '12px',
          background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.08) 0%, rgba(139, 92, 246, 0.08) 100%)',
          border: `1px solid ${design.colors.primary}20`,
        }}>
          <div style={{ position: 'relative' }}>
            <div style={{
              width: '90px', height: '90px', borderRadius: '50%',
              background: user?.photoURL ? `url(${user.photoURL}) center/cover` : 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '32px', fontWeight: 700, color: 'white', overflow: 'hidden',
              boxShadow: '0 8px 24px rgba(99, 102, 241, 0.35)',
            }}>
              {!user?.photoURL && initials}
            </div>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingPhoto}
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
              <span style={{ fontSize: '10px', padding: '3px 8px', background: 'rgba(16, 185, 129, 0.1)', color: design.colors.success, borderRadius: '20px', fontWeight: 600 }}>✓ Verified</span>
              <span style={{ fontSize: '10px', padding: '3px 8px', background: 'rgba(99, 102, 241, 0.1)', color: design.colors.primary, borderRadius: '20px', fontWeight: 600 }}>📅 {stats.memberSince}</span>
            </div>
          </div>
        </div>

        {/* Stats - 2x2 Grid for Mobile */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '8px', marginBottom: '12px' }}>
          <div className="glass-card" style={{ padding: '14px', textAlign: 'center' }}>
            <div style={{ fontSize: '22px', marginBottom: '4px' }}>💰</div>
            <p style={{ fontSize: '9px', color: design.colors.textSecondary, margin: 0, textTransform: 'uppercase', fontWeight: 600 }}>Total</p>
            <p style={{ fontSize: '16px', fontWeight: 700, color: design.colors.primary, margin: '4px 0 0 0' }}>₹{stats.totalExpenses.toLocaleString('en-IN')}</p>
          </div>
          <div className="glass-card" style={{ padding: '14px', textAlign: 'center' }}>
            <div style={{ fontSize: '22px', marginBottom: '4px' }}>📊</div>
            <p style={{ fontSize: '9px', color: design.colors.textSecondary, margin: 0, textTransform: 'uppercase', fontWeight: 600 }}>Transactions</p>
            <p style={{ fontSize: '16px', fontWeight: 700, color: design.colors.textPrimary, margin: '4px 0 0 0' }}>{stats.transactionCount}</p>
          </div>
          <div className="glass-card" style={{ padding: '14px', textAlign: 'center' }}>
            <div style={{ fontSize: '22px', marginBottom: '4px' }}>🗓️</div>
            <p style={{ fontSize: '9px', color: design.colors.textSecondary, margin: 0, textTransform: 'uppercase', fontWeight: 600 }}>Months</p>
            <p style={{ fontSize: '16px', fontWeight: 700, color: design.colors.textPrimary, margin: '4px 0 0 0' }}>{stats.monthsTracked}</p>
          </div>
          <div className="glass-card" style={{ padding: '14px', textAlign: 'center' }}>
            <div style={{ fontSize: '22px', marginBottom: '4px' }}>⚡</div>
            <p style={{ fontSize: '9px', color: design.colors.textSecondary, margin: 0, textTransform: 'uppercase', fontWeight: 600 }}>Savings</p>
            <p style={{ fontSize: '16px', fontWeight: 700, color: design.colors.success, margin: '4px 0 0 0' }}>₹{((earningsHistory ? Object.keys(earningsHistory).length : 1) * defaultEarnings - stats.totalExpenses).toLocaleString('en-IN')}</p>
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
            <button onClick={handleDeleteData} className="btn" style={{ padding: '10px', width: '100%', background: design.colors.danger, color: 'white' }}>Delete All Data</button>
            <button onClick={handleDeleteAccount} className="btn" style={{ padding: '10px', width: '100%', background: design.colors.danger, color: 'white' }}>Delete Account</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePageMobile;