import toast from 'react-hot-toast';

/**
 * "Deleted · Undo" message shown after a delete. Tapping Undo runs
 * `onUndo` (which puts the item back) and closes the message.
 */
export function showUndoToast(message: string, onUndo: () => Promise<void>) {
  toast(
    (t) => (
      <span className="undo-toast">
        <span>{message}</span>
        <button
          type="button"
          onClick={async () => {
            toast.dismiss(t.id);
            try {
              await onUndo();
              toast.success('Restored');
            } catch {
              toast.error('Could not restore it. Please add it again.');
            }
          }}
        >
          Undo
        </button>
      </span>
    ),
    { duration: 6000, icon: '🗑️' },
  );
}
