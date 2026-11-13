import React from 'react';
import { StyleSheet, Text, View, type ViewProps, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/context/ThemeContext';
import { spacing } from '@/theme';

interface CardProps extends ViewProps {
  style?: ViewStyle | ViewStyle[];
}

/**
 * Mobile equivalent of the web app's `.glass-card` (globals.css): 20px
 * radius, hairline border, soft shadow. RN has no backdrop-filter, so the
 * translucency is approximated with an opaque surface colour.
 */
export const Card: React.FC<CardProps> = ({ style, children, ...rest }) => {
  const { palette, mode } = useTheme();
  return (
    <View
      {...rest}
      style={[
        styles.card,
        {
          backgroundColor: palette.cardBg,
          borderColor: palette.cardBorder,
          // Elevation reads as mud on a dark ground; the hairline border does
          // the separating work there instead.
          ...(mode === 'light'
            ? {
                shadowColor: '#1e3a8a',
                shadowOpacity: 0.08,
                shadowRadius: 16,
                shadowOffset: { width: 0, height: 6 },
                elevation: 3,
              }
            : {}),
        },
        style as ViewStyle,
      ]}
    >
      {children}
    </View>
  );
};

/** Mobile `.badge-pill` — the teal "PRO EXPENSE TRACKER" chip. */
export const BadgePill: React.FC<{ label: string; style?: ViewStyle }> = ({ label, style }) => {
  const { palette } = useTheme();
  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: `rgba(20, 184, 166, 0.15)` },
        style,
      ]}
    >
      <Text style={[styles.badgeText, { color: palette.success }]}>{label.toUpperCase()}</Text>
    </View>
  );
};

/** Mobile `.icon-box` — the navy→teal gradient tile holding a white glyph. */
export const IconBox: React.FC<{
  size?: number;
  radius?: number;
  children: React.ReactNode;
  style?: ViewStyle;
}> = ({ size = 44, radius = 14, children, style }) => {
  const { palette } = useTheme();
  return (
    <LinearGradient
      colors={palette.primaryGradient as unknown as [string, string]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[
        { width: size, height: size, borderRadius: radius },
        styles.center,
        style,
      ]}
    >
      {children}
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  card: {
    // 20px matches .glass-card's border-radius in globals.css.
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.lg,
    overflow: 'hidden',
  },
  center: { alignItems: 'center', justifyContent: 'center' },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 999,
    alignSelf: 'flex-start',
  },
  badgeText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.6 },
});
