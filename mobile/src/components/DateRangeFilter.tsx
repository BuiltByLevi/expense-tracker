import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { endOfDay, format, startOfDay } from 'date-fns';
import { LinearGradient } from 'expo-linear-gradient';
import { Btn, Label } from '@/components/controls';
import { DateField } from '@/components/DateField';
import { useTheme } from '@/context/ThemeContext';
import { parseLocalDateInput } from '@shared/dateInput';
import { QUICK_RANGE_OPTIONS, sameDateRange, type DateRange } from '@shared/dateRangePresets';

const ISO = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Port of Dashboard/DateRangeFilter — banking-style quick ranges, a Custom
 * Range with start/end fields, and Clear. Filters only the Account Statement
 * below; the KPI cards stay on the selected month.
 */
export const DateRangeFilter: React.FC<{
  value: DateRange | null;
  onApply: (range: DateRange) => void;
  onClear: () => void;
}> = ({ value, onApply, onClear }) => {
  const { palette } = useTheme();
  const [showCustom, setShowCustom] = useState(false);
  const [draftStart, setDraftStart] = useState(() => format(value?.start ?? new Date(), 'yyyy-MM-dd'));
  const [draftEnd, setDraftEnd] = useState(() => format(value?.end ?? new Date(), 'yyyy-MM-dd'));
  const [error, setError] = useState('');

  const activeQuickKey = value
    ? (QUICK_RANGE_OPTIONS.find((o) => sameDateRange(o.range(new Date()), value))?.key ?? null)
    : null;
  const isCustomActive = !!value && !activeQuickKey;

  const applyCustom = () => {
    if (!ISO.test(draftStart) || !ISO.test(draftEnd)) {
      setError('Pick both a start and end date');
      return;
    }
    const start = startOfDay(parseLocalDateInput(draftStart));
    const end = endOfDay(parseLocalDateInput(draftEnd));
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      setError('Pick both a start and end date (YYYY-MM-DD)');
      return;
    }
    if (start.getTime() > end.getTime()) {
      setError('Start date must be before the end date');
      return;
    }
    setError('');
    onApply({ start, end });
  };

  const pill = (key: string, label: string, active: boolean, onPress: () => void) => (
    <Pressable key={key} onPress={onPress} accessibilityRole="button" accessibilityState={{ selected: active }}>
      {active ? (
        <LinearGradient
          colors={palette.primaryGradient as unknown as [string, string]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.pill}
        >
          <Text style={[styles.pillText, { color: '#ffffff' }]}>{label}</Text>
        </LinearGradient>
      ) : (
        <View style={[styles.pill, { borderWidth: 1, borderColor: `${palette.primary}4D` }]}>
          <Text style={[styles.pillText, { color: palette.textSecondary }]}>{label}</Text>
        </View>
      )}
    </Pressable>
  );

  return (
    <View>
      <View style={styles.pills}>
        {QUICK_RANGE_OPTIONS.map((opt) =>
          pill(opt.key, opt.label, activeQuickKey === opt.key, () => {
            setShowCustom(false);
            setError('');
            const range = opt.range(new Date());
            setDraftStart(format(range.start, 'yyyy-MM-dd'));
            setDraftEnd(format(range.end, 'yyyy-MM-dd'));
            onApply(range);
          })
        )}
        {pill('custom', 'Custom Range', isCustomActive || showCustom, () => setShowCustom((s) => !s))}
        {value ? (
          <Btn
            variant="ghost"
            size="xs"
            label="✕ Clear"
            onPress={() => {
              setError('');
              setShowCustom(false);
              onClear();
            }}
          />
        ) : null}
      </View>

      {showCustom ? (
        <View style={styles.custom}>
          <View style={styles.field}>
            <Label>Start Date</Label>
            <DateField
              compact
              label="Start date"
              value={draftStart}
              // Mirrors the web input's max={draftEnd}.
              maximumDate={ISO.test(draftEnd) ? parseLocalDateInput(draftEnd) : undefined}
              onChange={(v) => {
                setDraftStart(v);
                setError('');
              }}
            />
          </View>
          <View style={styles.field}>
            <Label>End Date</Label>
            <DateField
              compact
              label="End date"
              value={draftEnd}
              // Mirrors the web input's min={draftStart}.
              minimumDate={ISO.test(draftStart) ? parseLocalDateInput(draftStart) : undefined}
              onChange={(v) => {
                setDraftEnd(v);
                setError('');
              }}
            />
          </View>
          <Btn label="Apply Filter" size="md" onPress={applyCustom} />
        </View>
      ) : null}

      {error ? <Text style={[styles.error, { color: palette.danger }]}>{error}</Text> : null}

      {value ? (
        <Text style={[styles.note, { color: palette.textSecondary }]}>
          Showing{' '}
          <Text style={{ fontWeight: '700', color: palette.textPrimary }}>
            {format(value.start, 'dd MMM yyyy')} – {format(value.end, 'dd MMM yyyy')}
          </Text>{' '}
          in Transaction History below. KPI cards above still reflect the selected month.
        </Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' },
  pill: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 999 },
  pillText: { fontSize: 12, fontWeight: '600' },
  custom: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, alignItems: 'flex-end', marginTop: 12 },
  field: { minWidth: 130, flexGrow: 1 },
  error: { fontSize: 12, fontWeight: '500', marginTop: 8 },
  note: { fontSize: 12, marginTop: 10, lineHeight: 18 },
});
