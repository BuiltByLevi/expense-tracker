import React, { useEffect, useRef, useState } from 'react';
import { theme as design } from '../../styles/theme';
import { UserIcon, MoonIcon, LogoutIcon, ChevronDownIcon } from '../common/FinanceIcons';

interface ProfileMenuProps {
  name: string;
  email?: string | null;
  photoURL?: string | null;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  onViewProfile: () => void;
  onLogout: () => void;
}

/**
 * Avatar-triggered dropdown replacing the separate Profile/Logout buttons —
 * click-outside closes it since it isn't a modal overlay.
 */
const ProfileMenu: React.FC<ProfileMenuProps> = ({ name, email, photoURL, theme, onToggleTheme, onViewProfile, onLogout }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const initial = name.charAt(0).toUpperCase();

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Profile menu"
        aria-expanded={open}
        style={{
          display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 12px 6px 6px',
          background: design.colors.glassBg, border: `1px solid ${design.colors.primary}20`,
          borderRadius: '999px', cursor: 'pointer', fontFamily: 'inherit',
        }}
      >
        {photoURL ? (
          <img src={photoURL} alt="" style={{ width: '30px', height: '30px', borderRadius: '50%', objectFit: 'cover' }} />
        ) : (
          <div className="icon-box" style={{ width: '30px', height: '30px', fontSize: '13px', fontWeight: 700, borderRadius: '50%' }}>
            {initial}
          </div>
        )}
        <span style={{ fontSize: '13px', fontWeight: 600, color: design.colors.textPrimary }}>Profile</span>
        <ChevronDownIcon size={12} color={design.colors.textTertiary} style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s ease' }} />
      </button>

      {open && (
        <div className="dropdown-menu">
          <div className="dropdown-header">
            <p style={{ fontSize: '13px', fontWeight: 700, color: design.colors.textPrimary, margin: 0 }}>{name}</p>
            {email && <p style={{ fontSize: '12px', color: design.colors.textSecondary, margin: '2px 0 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{email}</p>}
          </div>

          <button className="dropdown-item" onClick={() => { setOpen(false); onViewProfile(); }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><UserIcon size={14} /> View Profile</span>
          </button>

          <div className="dropdown-item" style={{ cursor: 'default' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><MoonIcon size={14} /> Dark Mode</span>
            <label className="switch">
              <input type="checkbox" checked={theme === 'dark'} onChange={onToggleTheme} aria-label="Toggle dark mode" />
              <span className="switch-track" />
            </label>
          </div>

          <button className="dropdown-item danger" onClick={() => { setOpen(false); onLogout(); }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><LogoutIcon size={14} /> Logout</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default ProfileMenu;
