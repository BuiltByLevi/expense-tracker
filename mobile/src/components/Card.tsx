import React from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type RefreshControlProps,
  type StyleProp,
  type ViewProps,
  type ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';
import { useTheme } from '@/context/ThemeContext';
import { AlertIcon, CheckIcon } from '@/components/FinanceIcons';
import { Btn } from '@/components/controls';

/**
 * React Native ports of the web app's global CSS building blocks
 * (src/styles/globals.css): the page gradient + aurora, .glass-card,
 * .badge-pill, .icon-box, .text-gradient page headers and StatusBadge.
 * The mobile app mirrors the DESKTOP layout, so these follow the desktop
 * values rather than a phone-native design.
 */

/** body::before gradient + body::after aurora glows, behind a scrolling page. */
export const GlassPage: React.FC<{
  children: React.ReactNode;
  contentStyle?: StyleProp<ViewStyle>;
  refreshControl?: React.ReactElement<RefreshControlProps>;
  footer?: React.ReactNode;
  scroll?: boolean;
}> = ({ children, contentStyle, refreshControl, footer, scroll = true }) => {
  const { palette } = useTheme();
  const { width, height } = useWindowDimensions();
  // CSS `radial-gradient(circle at X Y, c 0%, transparent 40%)` with the
  // default farthest-corner size: the colour fades out at 40% of the
  // distance to the farthest corner, approximated here from the diagonal.
  const r = Math.hypot(width, height) * 0.4;
  const glows: [number, number][] = [
    [0.2, 0.1],
    [0.8, 0.2],
    [0.4, 0.8],
  ];

  return (
    <View style={[styles.flex, { backgroundColor: palette.screenBg }]}>
      <LinearGradient
        colors={palette.bgGradient as unknown as [string, string, string]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <Svg style={StyleSheet.absoluteFill} width={width} height={height} pointerEvents="none">
        <Defs>
          {glows.map(([gx, gy], i) => (
            <RadialGradient
              key={i}
              id={`aurora${i}`}
              cx={gx * width}
              cy={gy * height}
              r={r}
              gradientUnits="userSpaceOnUse"
            >
              <Stop offset="0" stopColor={palette.aurora[i]} stopOpacity={1} />
              <Stop offset="1" stopColor={palette.aurora[i]} stopOpacity={0} />
            </RadialGradient>
          ))}
        </Defs>
        {glows.map((_, i) => (
          <Rect key={i} x={0} y={0} width={width} height={height} fill={`url(#aurora${i})`} />
        ))}
      </Svg>
      <SafeAreaView style={styles.flex} edges={['top', 'bottom']}>
        {scroll ? (
          <ScrollView
            contentContainerStyle={[styles.pageContent, contentStyle]}
            refreshControl={refreshControl}
            keyboardShouldPersistTaps="handled"
          >
            {children}
          </ScrollView>
        ) : (
          <View style={[styles.flex, contentStyle]}>{children}</View>
        )}
        {footer}
      </SafeAreaView>
    </View>
  );
};

interface CardProps extends ViewProps {
  style?: StyleProp<ViewStyle>;
}

/** .glass-card — translucent surface, 20px radius, hairline border, soft shadow. */
export const Card: React.FC<CardProps> = ({ style, children, ...rest }) => {
  const { palette, mode } = useTheme();
  return (
    <View
      {...rest}
      style={[
        styles.card,
        {
          backgroundColor: palette.glassBg,
          borderColor: palette.glassBorder,
          shadowColor: mode === 'dark' ? '#000000' : palette.primary,
          shadowOpacity: mode === 'dark' ? 0.4 : 0.08,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
};

/** .badge-pill — the teal uppercase chip ("PRO EXPENSE TRACKER"). */
export const BadgePill: React.FC<{ label: string; style?: StyleProp<ViewStyle> }> = ({ label, style }) => {
  const { palette } = useTheme();
  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: `${palette.success}26`, borderColor: `${palette.success}4D` },
        style,
      ]}
    >
      <Text style={[styles.badgeText, { color: palette.success }]}>{label.toUpperCase()}</Text>
    </View>
  );
};

/** .icon-box — the gradient tile holding a white glyph. */
export const IconBox: React.FC<{
  size?: number;
  radius?: number;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}> = ({ size = 44, radius = 14, children, style }) => {
  const { palette } = useTheme();
  return (
    <LinearGradient
      colors={palette.primaryGradient as unknown as [string, string]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[{ width: size, height: size, borderRadius: radius }, styles.center, style]}
    >
      {children}
    </LinearGradient>
  );
};

/**
 * The sub-page header card used by Account Statement, Earnings History,
 * My Profile and Import: gradient-coloured title, subtitle, and the
 * "← Back to Dashboard" ghost button.
 */
export const PageHeader: React.FC<{
  title: string;
  subtitle?: string;
  onBack: () => void;
  right?: React.ReactNode;
}> = ({ title, subtitle, onBack, right }) => {
  const { palette, mode } = useTheme();
  return (
    <Card style={styles.pageHeader}>
      <View style={styles.flexShrink}>
        {/* .text-gradient can't clip a gradient to glyphs without an extra
            native module, so it uses the gradient's leading colour. */}
        <Text style={[styles.pageTitle, { color: mode === 'dark' ? palette.accentBright : palette.primary }]}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={[styles.pageSubtitle, { color: palette.textSecondary }]}>{subtitle}</Text>
        ) : null}
      </View>
      <View style={styles.pageHeaderRight}>
        {right}
        <Btn variant="ghost" size="sm" label="← Back to Dashboard" onPress={onBack} />
      </View>
    </Card>
  );
};

export type EarningsStatus = 'confirmed' | 'estimated' | 'missing';

/** Earnings status pill — port of common/StatusBadge. */
export const StatusBadge: React.FC<{ status: EarningsStatus }> = ({ status }) => {
  const { palette } = useTheme();
  const cfg = {
    confirmed: { label: 'Confirmed', color: palette.success, bg: `${palette.success}1A`, Icon: CheckIcon },
    estimated: { label: 'Estimated', color: palette.warning, bg: 'rgba(245, 158, 11, 0.1)', Icon: AlertIcon },
    missing: { label: 'Default', color: palette.textSecondary, bg: 'rgba(0,0,0,0.05)', Icon: null },
  }[status];
  return (
    <View style={[styles.status, { backgroundColor: cfg.bg }]}>
      {cfg.Icon ? <cfg.Icon size={10} color={cfg.color} strokeWidth={2.5} /> : null}
      <Text style={[styles.statusText, { color: cfg.color }]}>{cfg.label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
  flexShrink: { flexShrink: 1 },
  center: { alignItems: 'center', justifyContent: 'center' },
  pageContent: { padding: 12, gap: 16, paddingBottom: 32 },
  card: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 999,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  badgeText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.6 },
  pageHeader: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 18,
    paddingHorizontal: 20,
  },
  pageTitle: { fontSize: 24, fontWeight: '700' },
  pageSubtitle: { fontSize: 13, marginTop: 4 },
  pageHeaderRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  status: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    alignSelf: 'center',
  },
  statusText: { fontSize: 11, fontWeight: '600' },
});
