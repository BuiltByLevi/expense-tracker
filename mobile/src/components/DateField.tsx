import React, { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import RNDateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { format } from 'date-fns';
import { AppModal } from '@/components/AppModal';
import { Btn, Input } from '@/components/controls';
import { CalendarIcon } from '@/components/FinanceIcons';
import { useTheme } from '@/context/ThemeContext';
import { parseLocalDateInput } from '@shared/dateInput';

const ISO = /^\d{4}-\d{2}-\d{2}$/;
const toIso = (d: Date) => format(d, 'yyyy-MM-dd');

/** The field's current value as a Date, falling back to today if unparseable. */
function toDate(value: string): Date {
  if (ISO.test(value)) {
    const d = parseLocalDateInput(value);
    if (!Number.isNaN(d.getTime())) return d;
  }
  return new Date();
}

/**
 * Mobile counterpart of the web's <input type="date" class="input">: an
 * .input-styled field that opens the platform's native calendar.
 *
 * The value stays a 'yyyy-MM-dd' string — the same shape the web input
 * produces — so every form keeps validating and parsing it exactly as
 * before (parseLocalDateInput builds the Date from local y/m/d parts, never
 * as UTC midnight).
 *
 * Android: the system date dialog. iOS: the inline calendar in a sheet
 * with Done. Web (react-native-web has no native picker): a text field.
 */
export const DateField: React.FC<{
  value: string;
  onChange: (value: string) => void;
  error?: boolean;
  minimumDate?: Date;
  maximumDate?: Date;
  compact?: boolean;
  label?: string;
  style?: StyleProp<ViewStyle>;
}> = ({ value, onChange, error, minimumDate, maximumDate, compact, label = 'Choose date', style }) => {
  const { palette, mode } = useTheme();
  const [iosOpen, setIosOpen] = useState(false);
  const [iosDraft, setIosDraft] = useState<Date>(() => toDate(value));

  if (Platform.OS === 'web') {
    return (
      <Input
        value={value}
        onChangeText={onChange}
        placeholder="YYYY-MM-DD"
        maxLength={10}
        error={error}
        style={compact ? styles.compactInput : undefined}
        containerStyle={style}
      />
    );
  }

  const open = () => {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: toDate(value),
        mode: 'date',
        minimumDate,
        maximumDate,
        onValueChange: (_e, date) => onChange(toIso(date)),
      });
    } else {
      setIosDraft(toDate(value));
      setIosOpen(true);
    }
  };

  const shown = ISO.test(value) ? format(toDate(value), 'dd MMM yyyy') : 'Select date';

  return (
    <>
      <Pressable
        onPress={open}
        accessibilityRole="button"
        accessibilityLabel={`${label}, ${shown}`}
        style={[
          styles.field,
          compact && styles.compactField,
          {
            backgroundColor: error ? 'rgba(239, 68, 68, 0.05)' : palette.inputBg,
            borderColor: error ? palette.danger : palette.inputBorder,
          },
          style,
        ]}
      >
        <Text
          style={[styles.text, compact && styles.compactText, { color: ISO.test(value) ? palette.textPrimary : palette.textTertiary }]}
          numberOfLines={1}
        >
          {shown}
        </Text>
        <CalendarIcon size={compact ? 14 : 16} color={palette.textSecondary} />
      </Pressable>

      {Platform.OS === 'ios' ? (
        <AppModal visible={iosOpen} onClose={() => setIosOpen(false)} maxWidth={380} contentStyle={styles.sheet}>
          <RNDateTimePicker
            value={iosDraft}
            mode="date"
            display="inline"
            minimumDate={minimumDate}
            maximumDate={maximumDate}
            themeVariant={mode}
            accentColor={palette.primary}
            onValueChange={(_e, date) => setIosDraft(date)}
          />
          <View style={styles.actions}>
            <Btn variant="ghost" size="md" label="Cancel" onPress={() => setIosOpen(false)} style={styles.flex} />
            <Btn
              size="md"
              label="Done"
              onPress={() => {
                onChange(toIso(iosDraft));
                setIosOpen(false);
              }}
              style={styles.flex}
            />
          </View>
        </AppModal>
      ) : null}
    </>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    borderWidth: 1.5,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    minHeight: 46,
  },
  compactField: { paddingVertical: 8, paddingHorizontal: 12, minHeight: 40 },
  text: { fontSize: 14, fontWeight: '500', flexShrink: 1 },
  compactText: { fontSize: 13 },
  compactInput: { paddingVertical: 8, paddingHorizontal: 12, fontSize: 13, minHeight: 40 },
  sheet: { padding: 16 },
  actions: { flexDirection: 'row', gap: 12, marginTop: 12 },
});
