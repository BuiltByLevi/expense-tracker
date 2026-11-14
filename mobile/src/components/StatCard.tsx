import React from 'react';
import { StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/context/ThemeContext';
import { Sparkline } from '@/components/FinanceIcons';
import { radius, spacing } from '@/theme';

interface StatCardProps {
  /** A string is rendered uppercase; an element (e.g. label + EST marker) as-is. */
  label: React.ReactNode;
  value: string;
  hint?: React.ReactNode;
  /** Extra element (e.g. a MoM DeltaBadge) rendered after the hint. */
  badge?: React.ReactNode;
  valueColor?: string;
  /** Rendered at 18px inside the icon well, and again at 92px as a watermark. */
  icon?: React.ReactElement<{ size?: number; color?: string; strokeWidth?: number }>;
  /** Accent hex for the icon well and corner watermark on non-gradient cards. */
  wellColor?: string;
  accent?: boolean;
  danger?: boolean;
  /** 4-6 recent monthly values drawn as a mini trend line. */
  trend?: number[];
  compact?: boolean;
  style?: ViewStyle;
}

/**
 * React Native port of the web app's shared KPI tile
 * (src/components/Dashboard/StatCard.tsx), which DashboardWeb and
 * DashboardMobile both render. Same anatomy so the Android app reads as the
 * same product: icon well + optional sparkline on the top row, label/value/
 * hint anchored to the bottom, and a faint oversized icon as a corner
 * watermark. Type scale (11px label / 22px value / 11px hint) matches too.
 */
export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  hint,
  valueColor,
  icon,
  wellColor,
  accent = false,
  danger = false,
  trend,
  badge,
  compact = false,
  style,
}) => {
  const { palette, mode } = useTheme();

  const onDark = accent || danger;
  const gradient: [string, string] | null = danger
    ? ['#ef4444', '#f97316']
    : accent
      ? (palette.primaryGradient as unknown as [string, string])
      : null;

  const onColor = onDark ? 'rgba(255,255,255,0.85)' : palette.textSecondary;
  const valueOnColor = onDark ? (valueColor ?? '#ffffff') : (valueColor ?? palette.textPrimary);
  const well = wellColor ?? palette.primary;
  // `${hex}1F` is ~12% alpha — the same well tint the web card uses.
  const wellBg = onDark ? 'rgba(255,255,255,0.2)' : `${well}1F`;
  const iconColor = onDark ? '#ffffff' : well;

  const body = compact ? (
    <View style={styles.compactInner}>
      <View style={styles.compactLabelRow}>
        {icon ? React.cloneElement(icon, { size: 12, color: onColor }) : null}
        {typeof label === 'string' ? (
          <Text style={[styles.label, { color: onColor }]} numberOfLines={1}>
            {label.toUpperCase()}
          </Text>
        ) : (
          label
        )}
      </View>
      <Text
        style={[styles.compactValue, { color: valueOnColor }]}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.7}
      >
        {value}
      </Text>
      {typeof hint === 'string' ? (
        <Text style={[styles.hint, { color: onColor, textAlign: 'center' }]} numberOfLines={1}>
          {hint}
        </Text>
      ) : (
        hint ?? null
      )}
    </View>
  ) : (
    <>
      {/* Oversized corner watermark — decorative, clipped by the card. */}
      {icon ? (
        <View style={styles.watermark} pointerEvents="none">
          {React.cloneElement(icon, {
            size: 92,
            color: iconColor,
            strokeWidth: 1.4,
          })}
        </View>
      ) : null}

      <View style={styles.topRow}>
        <View style={[styles.well, { backgroundColor: wellBg }]}>
          {icon ? React.cloneElement(icon, { size: 18, color: iconColor }) : null}
        </View>
        {trend && trend.length >= 2 ? (
          <Sparkline data={trend} color={valueOnColor} width={62} height={22} />
        ) : null}
      </View>

      <View style={styles.bottom}>
        {typeof label === 'string' ? (
          <Text style={[styles.label, { color: onColor }]} numberOfLines={1}>
            {label.toUpperCase()}
          </Text>
        ) : (
          label
        )}
        <Text
          style={[styles.value, { color: valueOnColor }]}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.6}
        >
          {value}
        </Text>
        <View style={styles.hintRow}>
          {typeof hint === 'string' ? (
            <Text style={[styles.hint, { color: onColor }]} numberOfLines={1}>
              {hint}
            </Text>
          ) : (
            hint
          )}
          {badge}
        </View>
      </View>
    </>
  );

  const shell: ViewStyle = {
    ...(compact ? styles.compactCard : styles.card),
    ...(gradient
      ? {}
      : {
          borderWidth: 1,
          backgroundColor: palette.glassBg,
          borderColor: palette.glassBorder,
          ...(mode === 'light'
            ? {
                shadowColor: '#1e3a8a',
                shadowOpacity: 0.08,
                shadowRadius: 16,
                shadowOffset: { width: 0, height: 6 },
                elevation: 3,
              }
            : {}),
        }),
    ...style,
  };

  if (gradient) {
    return (
      <LinearGradient
        colors={gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={shell}
      >
        {body}
      </LinearGradient>
    );
  }

  return <View style={shell}>{body}</View>;
};

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: 0,
    minHeight: 124,
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    justifyContent: 'space-between',
    overflow: 'hidden',
    position: 'relative',
  },
  compactCard: {
    flex: 1,
    minWidth: 0,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    alignItems: 'center',
    overflow: 'hidden',
  },
  compactInner: { alignItems: 'center', width: '100%' },
  compactLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  compactValue: { fontSize: 15, fontWeight: '700', marginTop: 6 },
  watermark: { position: 'absolute', right: -14, bottom: -18, opacity: 0.14 },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  well: {
    width: 36,
    height: 36,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottom: { minWidth: 0, marginTop: spacing.md },
  label: { fontSize: 11, fontWeight: '600', letterSpacing: 0.66 },
  value: { fontSize: 22, fontWeight: '700', marginTop: 6, letterSpacing: -0.2 },
  hint: { fontSize: 11, fontWeight: '500', flexShrink: 1 },
  hintRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8, minHeight: 24, marginTop: 5 },
});
