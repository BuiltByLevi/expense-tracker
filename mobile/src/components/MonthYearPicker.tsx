import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type TextStyle } from 'react-native';
import { format } from 'date-fns';
import { LinearGradient } from 'expo-linear-gradient';
import { AppModal } from '@/components/AppModal';
import { Btn } from '@/components/controls';
import { useTheme } from '@/context/ThemeContext';

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * Port of common/MonthYearPicker: tap the month label to open a year
 * stepper plus a 12-month grid, instead of stepping ◀/▶ one month at a time.
 */
export const MonthYearPicker: React.FC<{
  year: number;
  month: number;
  currentYear: number;
  currentMonth: number;
  onSelect: (year: number, month: number) => void;
  labelStyle?: StyleProp<TextStyle>;
}> = ({ year, month, currentYear, currentMonth, onSelect, labelStyle }) => {
  const { palette } = useTheme();
  const [open, setOpen] = useState(false);
  const [browsingYear, setBrowsingYear] = useState(year);

  return (
    <>
      <Pressable
        onPress={() => {
          setBrowsingYear(year);
          setOpen(true);
        }}
        accessibilityRole="button"
        accessibilityLabel="Pick month"
      >
        <Text style={[styles.trigger, { color: palette.textPrimary }, labelStyle]}>
          {format(new Date(year, month), 'MMMM yyyy')}
        </Text>
      </Pressable>

      <AppModal visible={open} onClose={() => setOpen(false)} maxWidth={320} contentStyle={styles.content}>
        <View style={styles.yearRow}>
          <Btn variant="ghost" size="sm" label="◀" onPress={() => setBrowsingYear((y) => y - 1)} />
          <Text style={[styles.year, { color: palette.textPrimary }]}>{browsingYear}</Text>
          <Btn variant="ghost" size="sm" label="▶" onPress={() => setBrowsingYear((y) => y + 1)} />
        </View>

        <View style={styles.grid}>
          {MONTH_LABELS.map((label, idx) => {
            const isSelected = browsingYear === year && idx === month;
            const isCurrent = browsingYear === currentYear && idx === currentMonth;
            const cell = (
              <Text style={[styles.cellText, { color: isSelected ? '#ffffff' : palette.textPrimary }]}>{label}</Text>
            );
            return (
              <Pressable
                key={label}
                onPress={() => {
                  onSelect(browsingYear, idx);
                  setOpen(false);
                }}
                style={styles.cellWrap}
              >
                {isSelected ? (
                  <LinearGradient
                    colors={palette.primaryGradient as unknown as [string, string]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.cell}
                  >
                    {cell}
                  </LinearGradient>
                ) : (
                  <View
                    style={[
                      styles.cell,
                      { backgroundColor: 'rgba(0,0,0,0.04)' },
                      isCurrent && { borderWidth: 1, borderColor: palette.primary },
                    ]}
                  >
                    {cell}
                  </View>
                )}
              </Pressable>
            );
          })}
        </View>

        <Btn
          variant="ghost"
          size="md"
          label="Jump to this month"
          onPress={() => {
            onSelect(currentYear, currentMonth);
            setOpen(false);
          }}
        />
      </AppModal>
    </>
  );
};

const styles = StyleSheet.create({
  trigger: { fontSize: 13, fontWeight: '700', minWidth: 96, textAlign: 'center' },
  content: { padding: 20 },
  yearRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  year: { fontSize: 16, fontWeight: '700' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -4, marginBottom: 16 },
  cellWrap: { width: '25%', padding: 4 },
  cell: { paddingVertical: 10, borderRadius: 12, alignItems: 'center' },
  cellText: { fontSize: 13, fontWeight: '600' },
});
