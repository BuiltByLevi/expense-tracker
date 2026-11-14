import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { format } from 'date-fns';
import { AppModal, ModalHeader } from '@/components/AppModal';
import { Btn, FieldError, Input, Label } from '@/components/controls';
import { AlertIcon, CheckIcon } from '@/components/FinanceIcons';
import { useEarnings } from '@/context/EarningsContext';
import { useIncome } from '@/context/IncomeContext';
import { useTheme } from '@/context/ThemeContext';
import { useToast } from '@/context/ToastContext';
import { deriveMonthlyEarnings } from '@shared/earningsDerivation';

/**
 * Port of Dashboard/EarningsModal (opened by "✎ Edit" on the Monthly
 * Earnings card). Months with imported income show the derived breakdown
 * read-only; other months get the amount + Confirmed/Estimated editor.
 */
export const EarningsModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  year: number;
  month: number;
}> = ({ isOpen, onClose, year, month }) => {
  if (!isOpen) return null;
  // Keyed so the draft resets whenever the modal opens for a month.
  return <EarningsModalBody key={`${year}-${month}`} onClose={onClose} year={year} month={month} />;
};

const EarningsModalBody: React.FC<{ onClose: () => void; year: number; month: number }> = ({
  onClose,
  year,
  month,
}) => {
  const { palette } = useTheme();
  const toast = useToast();
  const { getEarningsForMonth, setEarningsForMonth, earnings: defaultEarnings } = useEarnings();
  const { getIncomeForMonth } = useIncome();

  const existing = getEarningsForMonth(year, month);
  const [amount, setAmount] = useState(String(existing ? existing.amount : defaultEarnings || 0));
  const [status, setStatus] = useState<'confirmed' | 'estimated'>(existing?.status ?? 'estimated');
  const [error, setError] = useState('');
  const [saveError, setSaveError] = useState('');
  const [saving, setSaving] = useState(false);

  const monthLabel = format(new Date(year, month), 'MMMM yyyy');
  const derived = deriveMonthlyEarnings(getIncomeForMonth(year, month).entries);

  if (derived) {
    const entryRow = (e: { id: string; date: Date; category: string; description: string; amount: number }, counted: boolean) => (
      <View
        key={e.id}
        style={[styles.entry, { backgroundColor: counted ? `${palette.success}0F` : 'rgba(0,0,0,0.03)' }]}
      >
        <Text style={[styles.entryText, { color: palette.textSecondary }]} numberOfLines={1}>
          {format(e.date, 'dd MMM')} · {e.category} · {e.description}
        </Text>
        <Text style={[styles.entryAmt, { color: counted ? palette.textPrimary : palette.textSecondary }]}>
          ₹{e.amount.toLocaleString('en-IN')}
        </Text>
      </View>
    );
    return (
      <AppModal visible onClose={onClose}>
        <ModalHeader title="Earnings" subtitle={monthLabel} onClose={onClose} />
        <View style={[styles.note, { backgroundColor: `${palette.success}14`, borderColor: `${palette.success}4D` }]}>
          <Text style={[styles.noteTitle, { color: palette.textPrimary }]}>
            ₹{derived.amount.toLocaleString('en-IN')} earned this month
          </Text>
          <Text style={[styles.noteBody, { color: palette.textSecondary }]}>
            Counted as this month's earnings — every imported credit this month (salary, interest,
            Razorpay/Payload settlements, etc.), excluding refunds and transfers. Can't be manually
            overridden here; delete or edit the source transaction to change it.
          </Text>
        </View>
        <View style={styles.entries}>{derived.countedEntries.map((e) => entryRow(e, true))}</View>
        {derived.otherEntries.length > 0 ? (
          <View style={styles.other}>
            <Text style={[styles.otherLabel, { color: palette.textTertiary }]}>
              OTHER CREDITS THIS MONTH (NOT COUNTED AS EARNINGS)
            </Text>
            <View style={styles.entries}>{derived.otherEntries.map((e) => entryRow(e, false))}</View>
          </View>
        ) : null}
        <Btn size="lg" label="Close" onPress={onClose} />
      </AppModal>
    );
  }

  const submit = async () => {
    const num = parseFloat(amount);
    if (amount === '' || isNaN(num)) return setError('Enter a valid amount');
    if (num < 0) return setError('Earnings cannot be negative');
    if (num > 100000000) return setError('Amount seems too large (max ₹10 crore)');
    setError('');
    setSaving(true);
    setSaveError('');
    try {
      await setEarningsForMonth(year, month, num, status);
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to save earnings';
      setSaveError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const statusBtn = (value: 'confirmed' | 'estimated') => {
    const on = status === value;
    const bg = on ? (value === 'confirmed' ? palette.primary : palette.warning) : 'rgba(0,0,0,0.05)';
    const fg = on ? '#ffffff' : palette.textSecondary;
    const Icon = value === 'confirmed' ? CheckIcon : AlertIcon;
    return (
      <Pressable onPress={() => setStatus(value)} style={[styles.statusBtn, { backgroundColor: bg }]}>
        <Icon size={12} color={fg} strokeWidth={2.5} />
        <Text style={[styles.statusText, { color: fg }]}>{value === 'confirmed' ? 'Confirmed' : 'Estimated'}</Text>
      </Pressable>
    );
  };

  return (
    <AppModal visible onClose={onClose}>
      <ModalHeader title="Set Earnings" subtitle={`${monthLabel} — only affects this month`} onClose={onClose} />

      {existing ? (
        <View
          style={[
            styles.current,
            { backgroundColor: existing.status === 'estimated' ? 'rgba(245, 158, 11, 0.1)' : `${palette.success}1A` },
          ]}
        >
          {existing.status === 'estimated' ? (
            <AlertIcon size={12} color={palette.warning} />
          ) : (
            <CheckIcon size={12} color={palette.success} strokeWidth={2.5} />
          )}
          <Text style={[styles.currentText, { color: palette.textSecondary }]}>
            {existing.status === 'estimated' ? (
              <>
                Currently <Text style={styles.bold}>estimated</Text> (migrated from default). Confirm to lock in this value.
              </>
            ) : (
              <>
                Currently <Text style={styles.bold}>confirmed</Text>. Editing will update this month only.
              </>
            )}
          </Text>
        </View>
      ) : null}

      {saveError ? (
        <View style={[styles.current, styles.saveError, { borderColor: `${palette.danger}66` }]}>
          <AlertIcon size={12} color={palette.danger} />
          <Text style={[styles.currentText, { color: palette.danger, fontWeight: '500' }]}>{saveError}</Text>
        </View>
      ) : null}

      <View style={styles.block}>
        <Label>Monthly Earnings (₹)</Label>
        <Input
          value={amount}
          onChangeText={(t) => {
            setAmount(t);
            if (error) setError('');
          }}
          keyboardType="decimal-pad"
          placeholder="0"
          autoFocus
          error={!!error}
          style={styles.bigInput}
        />
        <FieldError message={error} />
      </View>

      <View style={[styles.block, { marginBottom: 24 }]}>
        <Label>Status</Label>
        <View style={styles.statusRow}>
          {statusBtn('confirmed')}
          {statusBtn('estimated')}
        </View>
      </View>

      <View style={styles.actions}>
        <Btn variant="ghost" size="lg" label="Cancel" onPress={onClose} style={styles.flex} />
        <Btn
          size="lg"
          label={saving ? 'Saving...' : `Save for ${format(new Date(year, month), 'MMM yyyy')}`}
          onPress={submit}
          disabled={saving}
          style={styles.flex}
        />
      </View>
    </AppModal>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
  bold: { fontWeight: '700' },
  note: { marginBottom: 16, padding: 14, borderRadius: 12, borderWidth: 1 },
  noteTitle: { fontSize: 13, fontWeight: '700' },
  noteBody: { fontSize: 12, marginTop: 4, lineHeight: 17 },
  entries: { gap: 8, marginBottom: 12 },
  entry: { flexDirection: 'row', justifyContent: 'space-between', gap: 8, padding: 8, paddingHorizontal: 10, borderRadius: 8 },
  entryText: { fontSize: 12, flexShrink: 1 },
  entryAmt: { fontSize: 12, fontWeight: '600' },
  other: { marginBottom: 8 },
  otherLabel: { fontSize: 11, fontWeight: '600', marginBottom: 8 },
  current: { flexDirection: 'row', gap: 6, alignItems: 'flex-start', marginBottom: 16, padding: 10, paddingHorizontal: 12, borderRadius: 10 },
  currentText: { fontSize: 12, flexShrink: 1, lineHeight: 17 },
  saveError: { backgroundColor: 'rgba(239, 68, 68, 0.1)', borderWidth: 1 },
  block: { marginBottom: 16 },
  bigInput: { fontSize: 18, fontWeight: '600', paddingVertical: 16, paddingHorizontal: 16 },
  statusRow: { flexDirection: 'row', gap: 8 },
  statusBtn: { flex: 1, flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'center', padding: 10, borderRadius: 10 },
  statusText: { fontSize: 13, fontWeight: '600' },
  actions: { flexDirection: 'row', gap: 12 },
});
