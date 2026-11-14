import React, { useState } from 'react';
import { theme as design } from '../../styles/theme';
import { useProfileLogic } from '../../hooks/useProfileLogic';
import ConfirmDialog from '../common/ConfirmDialog';
import {
  WalletIcon, ChartLineIcon, CalendarIcon, SavingsIcon, UserIcon, LockIcon, LogoutIcon,
  CameraIcon, CheckIcon, ShieldCheckIcon, MoonIcon, ClockIcon, TrashIcon, RupeeIcon,
} from '../common/FinanceIcons';

/**
 * Profile & settings, styled like a banking app's account screen:
 * gradient profile card, four stat tiles, then grouped setting rows
 * (Account, Appearance, Security, Danger zone). Shared by the phone and
 * desktop profile pages.
 */

const inr = (n: number) => `${n < 0 ? '−' : ''}₹${Math.round(Math.abs(n)).toLocaleString('en-IN')}`;

const Chevron = () => <span className="pf-chev" aria-hidden="true">›</span>;

const ProfileView: React.FC<{ onOpenEarnings?: () => void }> = ({ onOpenEarnings }) => {
  const {
    user, theme, toggleTheme, colorTheme, setColorTheme, defaultEarnings, stats, totalSavings, initials,
    displayName, setDisplayName, savingName, handleSaveName,
    uploadingPhoto, fileInputRef, handlePhotoUpload,
    handleChangePassword, handleLogout, handleDeleteData, deletingData,
  } = useProfileLogic();

  const [editingName, setEditingName] = useState(false);
  const [confirm, setConfirm] = useState<'reset' | 'data' | 'account' | null>(null);
  const savedName = user?.displayName || user?.email?.split('@')[0] || '';

  const tiles = [
    { label: 'Total spent', value: inr(stats.totalExpenses), icon: <WalletIcon size={16} />, tone: 'blue' },
    { label: 'Transactions', value: stats.transactionCount.toLocaleString('en-IN'), icon: <ChartLineIcon size={16} />, tone: 'violet' },
    { label: 'Months tracked', value: String(stats.monthsTracked), icon: <CalendarIcon size={16} />, tone: 'orange' },
    { label: 'Net savings', value: inr(totalSavings), icon: <SavingsIcon size={16} />, tone: totalSavings >= 0 ? 'green' : 'red' },
  ];

  return (
    <div className="pf-wrap">
      <section className="pf-hero" style={{ background: design.colors.primaryGradient }}>
        <div className="pf-avatar-wrap">
          <div className="pf-avatar" style={user?.photoURL ? { backgroundImage: `url(${user.photoURL})` } : undefined}>
            {!user?.photoURL && initials}
          </div>
          <button
            type="button"
            className="pf-camera"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadingPhoto}
            aria-label="Change profile picture"
          >
            {uploadingPhoto ? '…' : <CameraIcon size={14} color="currentColor" />}
          </button>
          <input type="file" ref={fileInputRef} onChange={handlePhotoUpload} accept="image/*" style={{ display: 'none' }} />
        </div>
        <div className="pf-who">
          <h2>{savedName}</h2>
          <p>{user?.email}</p>
          <div className="pf-chips">
            <span><ShieldCheckIcon size={11} color="currentColor" /> Verified</span>
            <span><CalendarIcon size={11} color="currentColor" /> Since {stats.memberSince}</span>
          </div>
        </div>
      </section>

      <div className="pf-tiles">
        {tiles.map((t) => (
          <div key={t.label} className="pf-tile">
            <span className={`pf-tile-ico t-${t.tone}`}>{t.icon}</span>
            <small>{t.label}</small>
            <strong>{t.value}</strong>
          </div>
        ))}
      </div>

      <div className="m-section-head"><h2>Account</h2></div>
      <div className="glass-card pf-group">
        {editingName ? (
          <div className="pf-row pf-edit">
            <span className="pf-ico t-blue"><UserIcon size={16} /></span>
            <label className="pf-edit-field">
              <small>Display name</small>
              <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} autoFocus maxLength={60} />
            </label>
            <button
              type="button"
              className="pf-save"
              disabled={savingName || !displayName.trim() || displayName === savedName}
              onClick={async () => { await handleSaveName(); setEditingName(false); }}
            >
              {savingName ? 'Saving…' : 'Save'}
            </button>
            <button type="button" className="pf-cancel" onClick={() => { setDisplayName(savedName); setEditingName(false); }}>Cancel</button>
          </div>
        ) : (
          <button type="button" className="pf-row" onClick={() => setEditingName(true)}>
            <span className="pf-ico t-blue"><UserIcon size={16} /></span>
            <span className="pf-text"><strong>Display name</strong><small>{savedName}</small></span>
            <span className="pf-action">Edit</span>
          </button>
        )}
        <div className="pf-row">
          <span className="pf-ico t-violet">@</span>
          <span className="pf-text"><strong>Email</strong><small>{user?.email}</small></span>
        </div>
        <button type="button" className="pf-row" onClick={onOpenEarnings} disabled={!onOpenEarnings}>
          <span className="pf-ico t-green"><RupeeIcon size={16} /></span>
          <span className="pf-text"><strong>Default monthly earnings</strong><small>{inr(defaultEarnings)} · used for months without a figure</small></span>
          {onOpenEarnings && <Chevron />}
        </button>
        <div className="pf-row">
          <span className="pf-ico t-orange"><ClockIcon size={16} /></span>
          <span className="pf-text"><strong>Last sign-in</strong><small>{stats.lastSignIn}</small></span>
        </div>
      </div>

      <div className="m-section-head"><h2>Appearance</h2></div>
      <div className="glass-card pf-group">
        <div className="pf-row">
          <span className="pf-ico t-violet"><MoonIcon size={16} /></span>
          <span className="pf-text"><strong>Dark mode</strong><small>{theme === 'dark' ? 'On' : 'Off'}</small></span>
          <button
            type="button"
            role="switch"
            aria-checked={theme === 'dark'}
            aria-label="Dark mode"
            className={`pf-switch ${theme === 'dark' ? 'on' : ''}`}
            onClick={toggleTheme}
          >
            <i />
          </button>
        </div>
        <div className="pf-row pf-themes">
          {([
            { id: 'midnight', label: 'Midnight Teal', swatch: 'linear-gradient(135deg, #1e3a8a 0%, #14b8a6 100%)' },
            { id: 'original', label: 'Original Indigo', swatch: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)' },
          ] as const).map((opt) => (
            <button
              key={opt.id}
              type="button"
              className={`pf-theme ${colorTheme === opt.id ? 'on' : ''}`}
              aria-pressed={colorTheme === opt.id}
              onClick={() => setColorTheme(opt.id)}
            >
              <span className="pf-swatch" style={{ background: opt.swatch }}>
                {colorTheme === opt.id && <CheckIcon size={14} color="#fff" strokeWidth={3} />}
              </span>
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="m-section-head"><h2>Security</h2></div>
      <div className="glass-card pf-group">
        <button type="button" className="pf-row" onClick={() => setConfirm('reset')}>
          <span className="pf-ico t-blue"><LockIcon size={16} /></span>
          <span className="pf-text"><strong>Change password</strong><small>We'll email you a secure reset link</small></span>
          <Chevron />
        </button>
        <button type="button" className="pf-row" onClick={handleLogout}>
          <span className="pf-ico t-orange"><LogoutIcon size={16} /></span>
          <span className="pf-text"><strong>Sign out</strong><small>Sign out of this device</small></span>
          <Chevron />
        </button>
      </div>

      <div className="m-section-head"><h2 className="pf-danger-title">Danger zone</h2></div>
      <div className="glass-card pf-group pf-danger">
        <button type="button" className="pf-row" onClick={() => setConfirm('data')} disabled={deletingData}>
          <span className="pf-ico t-red"><TrashIcon size={16} /></span>
          <span className="pf-text"><strong>{deletingData ? 'Deleting…' : 'Delete all data'}</strong><small>Expenses, income, earnings, recurring rules and imports</small></span>
          <Chevron />
        </button>
        <button type="button" className="pf-row" onClick={() => setConfirm('account')}>
          <span className="pf-ico t-red"><UserIcon size={16} /></span>
          <span className="pf-text"><strong>Delete account</strong><small>Close your PRATIQ account</small></span>
          <Chevron />
        </button>
      </div>

      <ConfirmDialog
        open={confirm === 'reset'}
        title="Change password?"
        message={`We'll send a password reset link to ${user?.email}. Open it on any device to choose a new password.`}
        confirmLabel="Send link"
        onConfirm={async () => { await handleChangePassword(); setConfirm(null); }}
        onCancel={() => setConfirm(null)}
      />
      <ConfirmDialog
        open={confirm === 'data'}
        danger
        title="Delete all your data?"
        message="This permanently deletes every expense, income entry, earnings record, recurring rule and import history. Your account and budgets stay. This cannot be undone."
        confirmLabel="Delete everything"
        requireText="DELETE"
        onConfirm={async () => { setConfirm(null); await handleDeleteData(); }}
        onCancel={() => setConfirm(null)}
      />
      <ConfirmDialog
        open={confirm === 'account'}
        title="Delete account"
        message="Closing an account isn't available inside the app yet. You can delete all your data from the option above, then stop using the account."
        confirmLabel="OK"
        onConfirm={() => setConfirm(null)}
        onCancel={() => setConfirm(null)}
      />
    </div>
  );
};

export default ProfileView;
