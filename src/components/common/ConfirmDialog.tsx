import React, { useEffect, useState } from 'react';
import { theme as design } from '../../styles/theme';
import { TrashIcon, QuestionIcon } from './FinanceIcons';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Styles the confirm button red and the icon as a warning — for deletes. */
  danger?: boolean;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
  /** When set, the confirm button stays disabled until this exact text is typed. */
  requireText?: string;
}

/**
 * In-app replacement for window.confirm() — native browser dialogs look
 * dated, can't be styled to match the app, and block the whole tab. This
 * uses the same modal primitives as the rest of the app (overlay blur,
 * card, Escape-to-close) and shows a busy state while an async onConfirm
 * is in flight so double-clicks can't fire the action twice.
 */
const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  danger = false,
  onConfirm,
  onCancel,
  requireText,
}) => {
  const [busy, setBusy] = useState(false);
  const [typed, setTyped] = useState('');
  const textOk = !requireText || typed === requireText;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onCancel]);

  if (!open) return null;

  const cancel = () => { setTyped(''); onCancel(); };

  const handleConfirm = async () => {
    setBusy(true);
    try {
      await onConfirm();
    } finally {
      setBusy(false);
      setTyped('');
    }
  };

  return (
    <div className="modal-overlay" onClick={busy ? undefined : cancel}>
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        role="alertdialog"
        aria-modal="true"
        aria-label={title}
        style={{ maxWidth: '400px', textAlign: 'center' }}
      >
        <div
          style={{
            width: '52px', height: '52px', borderRadius: '16px', margin: '0 auto 16px auto',
            background: danger ? 'rgba(239, 68, 68, 0.12)' : `rgba(${design.colors.primaryRgb}, 0.12)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          {danger
            ? <TrashIcon size={24} color={design.colors.danger} strokeWidth={1.8} />
            : <QuestionIcon size={24} color={design.colors.primary} strokeWidth={1.8} />}
        </div>
        <h2 style={{ fontSize: '18px', fontWeight: 700, color: design.colors.textPrimary, margin: '0 0 8px 0' }}>
          {title}
        </h2>
        <p style={{ fontSize: '13px', color: design.colors.textSecondary, margin: requireText ? '0 0 14px 0' : '0 0 24px 0', lineHeight: 1.5 }}>
          {message}
        </p>
        {requireText && (
          <label style={{ display: 'block', textAlign: 'left', margin: '0 0 20px 0', fontSize: '12px', fontWeight: 600, color: design.colors.textSecondary }}>
            Type <strong style={{ color: design.colors.textPrimary }}>{requireText}</strong> to confirm
            <input
              className="input"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              autoComplete="off"
              autoCapitalize="characters"
              style={{ marginTop: '6px' }}
            />
          </label>
        )}
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={cancel} disabled={busy} className="btn btn-ghost" style={{ flex: 1, padding: '12px' }}>
            {cancelLabel}
          </button>
          <button
            onClick={handleConfirm}
            disabled={busy || !textOk}
            className={danger ? 'btn btn-danger' : 'btn btn-primary'}
            style={{ flex: 1, padding: '12px' }}
          >
            {busy ? 'Working…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;
