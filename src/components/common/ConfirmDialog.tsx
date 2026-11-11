import React, { useEffect, useState } from 'react';
import { theme as design } from '../../styles/theme';

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
}) => {
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onCancel]);

  if (!open) return null;

  const handleConfirm = async () => {
    setBusy(true);
    try {
      await onConfirm();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={busy ? undefined : onCancel}>
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
            background: danger ? 'rgba(239, 68, 68, 0.12)' : 'rgba(30, 64, 175, 0.12)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px',
          }}
        >
          {danger ? '🗑️' : '❓'}
        </div>
        <h2 style={{ fontSize: '18px', fontWeight: 700, color: design.colors.textPrimary, margin: '0 0 8px 0' }}>
          {title}
        </h2>
        <p style={{ fontSize: '13px', color: design.colors.textSecondary, margin: '0 0 24px 0', lineHeight: 1.5 }}>
          {message}
        </p>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={onCancel} disabled={busy} className="btn btn-ghost" style={{ flex: 1, padding: '12px' }}>
            {cancelLabel}
          </button>
          <button
            onClick={handleConfirm}
            disabled={busy}
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
