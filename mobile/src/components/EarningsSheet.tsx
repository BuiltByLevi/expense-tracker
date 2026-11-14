import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { format } from 'date-fns';
import { useEarnings } from '@/context/EarningsContext';
import { useIncome } from '@/context/IncomeContext';
import { useTheme } from '@/context/ThemeContext';
import { deriveMonthlyEarnings } from '@shared/earningsDerivation';
import { fontSize, radius, spacing } from '@/theme';
import { formatCurrency } from '@/utils/format';

interface Props {
  visible: boolean;
  year: number;
  month: number;
  onClose: () => void;
}

/**
 * Bottom sheet for setting a month's earnings — the Android counterpart of
 * the web app's Earnings modal. For months with imported salary it offers
 * the same "use my number instead of the imported total" override, and a
 * way to go back to the imported total.
 */
export const EarningsSheet: React.FC<Props> = ({ visible, year, month, onClose }) => {
  const { palette } = useTheme();
  const { getEarningsForMonth, setEarningsForMonth, revertEarningsOverride } = useEarnings();
  const { getIncomeForMonth } = useIncome();

  const record = getEarningsForMonth(year, month);
  const imported = deriveMonthlyEarnings(getIncomeForMonth(year, month).entries);
  const isOverridden = !!record?.override && imported !== null;

  // The parent mounts this sheet only while it's open, so the form starts
  // fresh each time from whatever the month currently shows.
  const [amount, setAmount] = useState(() => {
    const shown = isOverridden || !imported ? record?.amount : imported.amount;
    return shown ? String(shown) : '';
  });
  const [estimated, setEstimated] = useState(record?.status === 'estimated');
  const [override, setOverride] = useState(isOverridden);
  const [saving, setSaving] = useState(false);

  const monthLabel = format(new Date(year, month), 'MMMM yyyy');
  const parsed = parseFloat(amount.replace(/,/g, ''));
  const valid = Number.isFinite(parsed) && parsed >= 0;
  // With imported salary and the override off, the imported total stays in charge.
  const locked = imported !== null && !override;

  const save = async () => {
    if (!valid && !locked) return;
    setSaving(true);
    try {
      if (locked) {
        if (isOverridden) await revertEarningsOverride(year, month);
      } else {
        await setEarningsForMonth(year, month, parsed, estimated ? 'estimated' : 'confirmed', {
          override: imported !== null,
        });
      }
      onClose();
    } catch {
      Alert.alert('Could not save', 'Please check your connection and try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.scrim} onPress={onClose} accessibilityLabel="Close" />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.sheetWrap}>
        <View style={[styles.sheet, { backgroundColor: palette.cardBg, borderColor: palette.cardBorder }]}>
          <View style={[styles.grabber, { backgroundColor: palette.textTertiary }]} />
          <Text style={[styles.title, { color: palette.textPrimary }]}>Earnings · {monthLabel}</Text>

          {imported && (
            <View style={[styles.note, { backgroundColor: palette.successLight }]}>
              <Text style={[styles.noteText, { color: palette.textPrimary }]}>
                Imported salary this month: <Text style={styles.bold}>{formatCurrency(imported.amount)}</Text>
              </Text>
            </View>
          )}

          {imported && (
            <View style={styles.row}>
              <View style={styles.flex}>
                <Text style={[styles.rowTitle, { color: palette.textPrimary }]}>Use my own amount</Text>
                <Text style={[styles.rowSub, { color: palette.textSecondary }]}>Replaces the imported total for this month</Text>
              </View>
              <Switch value={override} onValueChange={setOverride} trackColor={{ true: palette.primary }} />
            </View>
          )}

          <Text style={[styles.label, { color: palette.textSecondary }]}>AMOUNT (₹)</Text>
          <TextInput
            value={locked ? String(imported!.amount) : amount}
            onChangeText={setAmount}
            editable={!locked}
            keyboardType="decimal-pad"
            inputMode="decimal"
            placeholder="0"
            placeholderTextColor={palette.textTertiary}
            style={[
              styles.input,
              { color: palette.textPrimary, borderColor: palette.cardBorder, backgroundColor: palette.screenBg, opacity: locked ? 0.55 : 1 },
            ]}
          />

          {!locked && (
            <View style={styles.row}>
              <View style={styles.flex}>
                <Text style={[styles.rowTitle, { color: palette.textPrimary }]}>Estimated</Text>
                <Text style={[styles.rowSub, { color: palette.textSecondary }]}>Mark as a guess until the real figure is known</Text>
              </View>
              <Switch value={estimated} onValueChange={setEstimated} trackColor={{ true: palette.warning }} />
            </View>
          )}

          <View style={styles.actions}>
            <Pressable onPress={onClose} style={[styles.btn, { backgroundColor: palette.screenBg }]}>
              <Text style={[styles.btnText, { color: palette.textPrimary }]}>Cancel</Text>
            </Pressable>
            <Pressable
              onPress={save}
              disabled={saving || (!locked && !valid) || (locked && !isOverridden)}
              style={[styles.btn, styles.primary, { backgroundColor: palette.primary, opacity: saving || (!locked && !valid) || (locked && !isOverridden) ? 0.5 : 1 }]}
            >
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={[styles.btnText, { color: '#fff' }]}>
                  {locked ? (isOverridden ? 'Use imported total' : 'Using imported total') : 'Save'}
                </Text>
              )}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scrim: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.45)' },
  sheetWrap: { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    borderTopLeftRadius: radius.xxl, borderTopRightRadius: radius.xxl, borderWidth: 1,
    padding: spacing.xl, paddingBottom: spacing.xxxl, gap: spacing.md,
  },
  grabber: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, opacity: 0.5, marginBottom: spacing.xs },
  title: { fontSize: fontSize.xl, fontWeight: '700' },
  note: { borderRadius: radius.md, padding: spacing.md },
  noteText: { fontSize: fontSize.sm },
  bold: { fontWeight: '700' },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  rowTitle: { fontSize: fontSize.md, fontWeight: '600' },
  rowSub: { fontSize: fontSize.xs, marginTop: 2 },
  label: { fontSize: fontSize.xs, fontWeight: '700', letterSpacing: 0.6, marginTop: spacing.xs },
  input: { borderWidth: 1, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.md, fontSize: fontSize.xl, fontWeight: '700' },
  actions: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.sm },
  btn: { flex: 1, height: 50, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center' },
  primary: { flex: 2 },
  btnText: { fontSize: fontSize.md, fontWeight: '700' },
});
