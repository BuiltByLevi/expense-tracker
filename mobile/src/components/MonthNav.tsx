import React from 'react';
import { StyleSheet, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';
import { Btn } from '@/components/controls';
import { MonthYearPicker } from '@/components/MonthYearPicker';

/** The desktop ◀ [Month Year] ▶ [Today] cluster. */
export const MonthNav: React.FC<{
  year: number;
  month: number;
  currentYear: number;
  currentMonth: number;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  onSelect: (year: number, month: number) => void;
  large?: boolean;
  style?: StyleProp<ViewStyle>;
  labelStyle?: StyleProp<TextStyle>;
}> = ({ year, month, currentYear, currentMonth, onPrev, onNext, onToday, onSelect, large, style, labelStyle }) => (
  <View style={[styles.row, large && styles.rowLarge, style]}>
    <Btn variant="ghost" size={large ? 'md' : 'xs'} label="◀" onPress={onPrev} />
    <MonthYearPicker
      year={year}
      month={month}
      currentYear={currentYear}
      currentMonth={currentMonth}
      onSelect={onSelect}
      labelStyle={[large && styles.labelLarge, labelStyle]}
    />
    <Btn variant="ghost" size={large ? 'md' : 'xs'} label="▶" onPress={onNext} />
    <Btn size={large ? 'sm' : 'xs'} label="Today" onPress={onToday} />
  </View>
);

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  rowLarge: { gap: 16, justifyContent: 'center' },
  labelLarge: { fontSize: 16, minWidth: 120 },
});
