import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AlertIcon, CheckCircleIcon } from '@/components/FinanceIcons';

/**
 * Minimal stand-in for react-hot-toast, which the web app uses for every
 * save/delete confirmation. Same API shape (toast.success / toast.error) so
 * ported logic reads the same as its web original.
 */
type ToastKind = 'success' | 'error';
interface ToastApi {
  success: (msg: string, opts?: { duration?: number }) => void;
  error: (msg: string, opts?: { duration?: number }) => void;
}

const ToastContext = createContext<ToastApi | undefined>(undefined);

// eslint-disable-next-line react-refresh/only-export-components
export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within a ToastProvider');
  return ctx;
}

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const insets = useSafeAreaInsets();
  const [toast, setToast] = useState<{ kind: ToastKind; msg: string } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback((kind: ToastKind, msg: string, duration = 3000) => {
    if (timer.current) clearTimeout(timer.current);
    setToast({ kind, msg });
    timer.current = setTimeout(() => setToast(null), duration);
  }, []);

  const api = useMemo<ToastApi>(
    () => ({
      success: (m, o) => show('success', m, o?.duration),
      error: (m, o) => show('error', m, o?.duration),
    }),
    [show]
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      {toast ? (
        <View pointerEvents="none" style={[styles.wrap, { top: insets.top + 8 }]}>
          <View style={styles.toast}>
            {toast.kind === 'success' ? (
              <CheckCircleIcon size={18} color="#10b981" />
            ) : (
              <AlertIcon size={18} color="#ef4444" />
            )}
            <Text style={styles.text}>{toast.msg}</Text>
          </View>
        </View>
      ) : null}
    </ToastContext.Provider>
  );
};

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 16, right: 16, alignItems: 'center', zIndex: 9999 },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    maxWidth: 420,
    backgroundColor: '#ffffff',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  text: { color: '#363636', fontSize: 14, flexShrink: 1 },
});
