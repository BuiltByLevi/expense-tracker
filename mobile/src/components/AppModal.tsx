import React from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { Btn } from '@/components/controls';

/** .modal-overlay + .modal-content: centered card over a dimmed backdrop. */
export const AppModal: React.FC<{
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  maxWidth?: number;
  contentStyle?: StyleProp<ViewStyle>;
}> = ({ visible, onClose, children, maxWidth = 480, contentStyle }) => {
  const { palette } = useTheme();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable style={[styles.overlay, { backgroundColor: palette.modalOverlay }]} onPress={onClose}>
          <Pressable
            onPress={() => {}}
            style={[
              styles.content,
              { maxWidth, backgroundColor: palette.modalBg, borderColor: palette.modalBorder },
              contentStyle,
            ]}
          >
            <ScrollView keyboardShouldPersistTaps="handled" bounces={false}>
              {children}
            </ScrollView>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
};

/** Title + subtitle on the left, round × close button on the right. */
export const ModalHeader: React.FC<{ title: string; subtitle?: string; onClose: () => void }> = ({
  title,
  subtitle,
  onClose,
}) => {
  const { palette } = useTheme();
  return (
    <View style={styles.header}>
      <View style={styles.flexShrink}>
        <Text style={[styles.title, { color: palette.textPrimary }]}>{title}</Text>
        {subtitle ? <Text style={[styles.subtitle, { color: palette.textSecondary }]}>{subtitle}</Text> : null}
      </View>
      <Pressable onPress={onClose} accessibilityLabel="Close" hitSlop={8} style={styles.close}>
        <Text style={[styles.closeText, { color: palette.textSecondary }]}>×</Text>
      </Pressable>
    </View>
  );
};

/** Port of common/ConfirmDialog. */
export const ConfirmDialog: React.FC<{
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}> = ({ open, title, message, confirmLabel = 'Confirm', danger, busy, onConfirm, onCancel }) => {
  const { palette } = useTheme();
  return (
    <AppModal visible={open} onClose={onCancel} maxWidth={420}>
      <Text style={[styles.title, { color: palette.textPrimary, fontSize: 18 }]}>{title}</Text>
      <Text style={[styles.message, { color: palette.textSecondary }]}>{message}</Text>
      <View style={styles.actions}>
        <Btn variant="ghost" size="lg" label="Cancel" onPress={onCancel} style={styles.flex} />
        <Btn
          variant={danger ? 'danger' : 'primary'}
          size="lg"
          label={confirmLabel}
          onPress={onConfirm}
          busy={busy}
          style={styles.flex}
        />
      </View>
    </AppModal>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
  flexShrink: { flexShrink: 1 },
  overlay: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
  content: {
    width: '100%',
    maxHeight: '88%',
    borderRadius: 24,
    borderWidth: 1,
    padding: 24,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 32,
    shadowOffset: { width: 0, height: 24 },
    elevation: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 20,
  },
  title: { fontSize: 22, fontWeight: '700', marginBottom: 6 },
  subtitle: { fontSize: 14 },
  close: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: { fontSize: 20, lineHeight: 22 },
  message: { fontSize: 14, lineHeight: 20, marginTop: 4 },
  actions: { flexDirection: 'row', gap: 12, marginTop: 24 },
});
