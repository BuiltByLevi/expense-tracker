import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';
import { useTheme } from '@/context/ThemeContext';
import { fontSize, spacing } from '@/theme';
import { formatCurrency } from '@/utils/format';

export interface DonutSlice {
  label: string;
  value: number;
  color: string;
}

interface DonutChartProps {
  slices: DonutSlice[];
  total: number;
  centerCaption?: string;
  size?: number;
}

/**
 * Recharts is DOM-only, so the web pie chart is rebuilt here with
 * react-native-svg. Drawn as a single circle per slice using strokeDasharray
 * offsets — no per-slice path math, and it animates/scales cleanly.
 */
export const DonutChart: React.FC<DonutChartProps> = ({
  slices,
  total,
  centerCaption = 'ALL TIME',
  size = 200,
}) => {
  const { palette } = useTheme();
  const strokeWidth = size * 0.17;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  const positive = slices.filter((s) => s.value > 0);
  const sum = positive.reduce((acc, s) => acc + s.value, 0);

  let offset = 0;

  return (
    <View style={styles.wrap}>
      <View style={{ width: size, height: size }}>
        <Svg width={size} height={size}>
          {/* Rotated so the first slice starts at 12 o'clock. Expressed as an
              SVG transform string rather than the rotation/origin props: those
              are native-only and react-native-web forwards `origin` to the DOM
              as the invalid attribute `transform-origin`. */}
          <G transform={`rotate(-90 ${center} ${center})`}>
            <Circle
              cx={center}
              cy={center}
              r={radius}
              stroke={palette.cardBorder}
              strokeWidth={strokeWidth}
              fill="none"
            />
            {sum > 0 &&
              positive.map((slice) => {
                const fraction = slice.value / sum;
                const dash = fraction * circumference;
                const element = (
                  <Circle
                    key={slice.label}
                    cx={center}
                    cy={center}
                    r={radius}
                    stroke={slice.color}
                    strokeWidth={strokeWidth}
                    fill="none"
                    strokeDasharray={`${dash} ${circumference - dash}`}
                    strokeDashoffset={-offset}
                  />
                );
                offset += dash;
                return element;
              })}
          </G>
        </Svg>
        <View style={[StyleSheet.absoluteFill, styles.center]} pointerEvents="none">
          <Text style={[styles.caption, { color: palette.textTertiary }]}>{centerCaption}</Text>
          <Text
            style={[styles.total, { color: palette.textPrimary }]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.6}
          >
            {formatCurrency(total)}
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
  center: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xxl },
  caption: { fontSize: fontSize.xs, fontWeight: '700', letterSpacing: 0.8 },
  total: { fontSize: fontSize.xl, fontWeight: '700', marginTop: 2 },
});
