import React, { useState } from 'react';
import { theme as design } from '../../styles/theme';
import { TrashIcon } from '../common/FinanceIcons';

interface Props {
  open: boolean;
  email?: string | null;
  onCancel: () => void;
  /** Returns an error message to show, or null when the account was deleted. */
  onConfirm: (password: string) => Promise<string | null>;
}

/** Asks for the password and a typed confirmation before closing the account for good. */
const DeleteAccountDialog: React.FC<Props> = ({ open, email, onCancel, onConfirm }) => {
  const [password, setPassword] = useState('');
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const close = () => { setPassword(''); setTyped(''); setError(null); onCancel(); };
  const ready = password.length > 0 && typed === 'DELETE ACCOUNT' && !busy;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ready) return;
    setBusy(true);
    setError(null);
    const message = await onConfirm(password);
    setBusy(false);
    if (message) setError(message);
  };

  return (
    <div className="modal-overlay" onClick={busy ? undefined : close}>
      <form
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        onSubmit={submit}
        role="alertdialog"
        aria-modal="true"
        aria-label="Delete account"
        style={{ maxWidth: '420px' }}
      >
        <div style={{ width: '52px', height: '52px', borderRadius: '16px', margin: '0 auto 14px', background: 'rgba(239, 68, 68, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <TrashIcon size={24} color={design.colors.danger} strokeWidth={1.8} />
        </div>
        <h2 style={{ fontSize: '18px', fontWeight: 700, color: design.colors.textPrimary, margin: '0 0 8px', textAlign: 'center' }}>Delete your account?</h2>
        <p style={{ fontSize: '13px', color: design.colors.textSecondary, margin: '0 0 16px', lineHeight: 1.5, textAlign: 'center' }}>
          This permanently deletes your login <strong>{email}</strong> and everything in it — transactions, earnings,
          budgets, recurring rules and settings. It cannot be undone.
        </p>
        <label className="au-field" style={{ marginBottom: '12px' }}>
          <span>Your password</span>
          <input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>
        <label className="au-field" style={{ marginBottom: '14px' }}>
          <span>Type <strong style={{ color: design.colors.textPrimary }}>DELETE ACCOUNT</strong> to confirm</span>
          <input value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" autoCapitalize="characters" />
        </label>
        {error && <p role="alert" style={{ margin: '0 0 12px', fontSize: '13px', fontWeight: 600, color: 'var(--c-red)' }}>{error}</p>}
        <div style={{ display: 'flex', gap: '10px' }}>
          <button type="button" onClick={close} disabled={busy} className="btn btn-ghost" style={{ flex: 1, padding: '12px' }}>Cancel</button>
          <button type="submit" disabled={!ready} className="btn btn-danger" style={{ flex: 1, padding: '12px', opacity: ready || busy ? 1 : 0.5 }}>
            {busy ? 'Deleting…' : 'Delete account'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default DeleteAccountDialog;
