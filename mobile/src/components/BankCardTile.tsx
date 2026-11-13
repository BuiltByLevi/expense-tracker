import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/context/ThemeContext';
import { CardChip, ContactlessMark, TrendDownIcon, TrendUpIcon } from '@/components/FinanceIcons';
import { radius, spacing } from '@/theme';

/**
 * Month-over-month percent-change pill. Port of DeltaBadge from the web
 * FinanceIcons module. `goodWhenDown` flips the colouring for metrics like
 * spending, where a decrease is the positive outcome.
 */
export const DeltaBadge: React.FC<{
  current: number;
  previous: number;
  goodWhenDown?: boolean;
  light?: boolean;
}> = ({ current, previous, goodWhenDown = false, light = false }) => {
  const { palette } = useTheme();
  if (!isFinite(previous) || previous === 0) return null;
  const pct = ((current - previous) / Math.abs(previous)) * 100;
  if (!isFinite(pct)) return null;

  const up = pct >= 0;
  const good = goodWhenDown ? !up : up;
  const color = light ? 'rgba(255,255,255,0.95)' : good ? palette.success : palette.danger;
  const bg = light
    ? 'rgba(255,255,255,0.2)'
    : good
      ? 'rgba(20, 184, 166, 0.12)'
      : 'rgba(239, 68, 68, 0.12)';
  const Arrow = up ? TrendUpIcon : TrendDownIcon;

  return (
    <View style={[styles.delta, { backgroundColor: bg }]}>
      <Arrow size={10} color={color} strokeWidth={2.5} />
      <Text style={[styles.deltaText, { color }]}>
        {Math.abs(pct) >= 1000 ? '999+' : Math.abs(pct).toFixed(1)}% MoM
      </Text>
    </View>
  );
};

/**
 * The "Net Balance · Cumulative" tile, styled as a payment card — EMV chip
 * and contactless arcs on the top row, figures below. Mirrors the bank-card
 * KPI in DashboardWeb that every other StatCard was later redesigned to match.
 */
export const BankCardTile: React.FC<{
  value: string;
  hint: string;
  badge?: React.ReactNode;
}> = ({ value, hint, badge }) => {
  const { palette } = useTheme();
  return (
    <LinearGradient
      colors={palette.primaryGradient as unknown as [string, string]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.tile}
    >
      <View style={styles.chipRow}>
        <CardChip width={30} />
        <ContactlessMark size={20} />
      </View>
      <View style={styles.body}>
        <Text style={styles.label}>NET BALANCE · CUMULATIVE</Text>
        <Text style={styles.value} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>
          {value}
        </Text>
        <View style={styles.hintRow}>
          <Text style={styles.hint} numberOfLines={1}>
            {hint}
          </Text>
          {badge}
        </View>
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    minWidth: 0,
    minHeight: 124,
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    justifyContent: 'space-between',
    overflow: 'hidden',
  },
  chipRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  body: { minWidth: 0, marginTop: spacing.md },
  label: {
    fontSize: 10,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.8)',
    letterSpacing: 1,
  },
  value: { fontSize: 22, fontWeight: '700', color: '#fff', marginTop: 4, letterSpacing: -0.2 },
  hintRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: 5 },
  hint: { fontSize: 10, fontWeight: '500', color: 'rgba(255,255,255,0.75)', flexShrink: 1 },
  delta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 999,
  },
  deltaText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.2 },
});
