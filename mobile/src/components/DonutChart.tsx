import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { G, Path } from 'react-native-svg';
import { useTheme } from '@/context/ThemeContext';
import { EMPTY_STATE_QUOTES, getRandomQuote } from '@shared/quotes';

export interface CategorySlice {
  category: string;
  amount: number;
  percentage: number;
}

const toRad = (deg: number) => (deg * Math.PI) / 180;

/** Annular sector path, angles in degrees clockwise from 12 o'clock. */
function sector(cx: number, cy: number, r0: number, r1: number, a0: number, a1: number) {
  const p = (r: number, a: number) => [cx + r * Math.sin(toRad(a)), cy - r * Math.cos(toRad(a))];
  const large = a1 - a0 > 180 ? 1 : 0;
  const [x0, y0] = p(r1, a0);
  const [x1, y1] = p(r1, a1);
  const [x2, y2] = p(r0, a1);
  const [x3, y3] = p(r0, a0);
  return `M${x0} ${y0} A${r1} ${r1} 0 ${large} 1 ${x1} ${y1} L${x2} ${y2} A${r0} ${r0} 0 ${large} 0 ${x3} ${y3} Z`;
}

/**
 * Port of Charts/CategoryPieChart (Recharts is DOM-only): the same donut
 * geometry the desktop uses — outer radius min(110, h·0.55), inner radius
 * min(45, h·0.22), 4° padding between slices, a 3px stroke in the card
 * colour — coloured by rank from the categorical palette. Tapping a slice
 * shows the same tooltip card the web shows on hover.
 */
export const CategoryPieChart: React.FC<{ data: CategorySlice[]; height?: number }> = ({ data, height = 300 }) => {
  const { palette, categoryColors, mode } = useTheme();
  const [active, setActive] = useState<number | null>(null);
  const [emptyQuote] = useState(() => getRandomQuote(EMPTY_STATE_QUOTES));
  const isDark = mode === 'dark';

  if (data.length === 0) {
    return (
      <View style={[styles.empty, { height }]}>
        <Text style={[styles.emptyTitle, { color: isDark ? '#94a3b8' : '#64748b' }]}>
          No data available for this period
        </Text>
        <Text style={[styles.emptyQuote, { color: isDark ? '#6b7a94' : '#94a3b8' }]}>“{emptyQuote.text}”</Text>
      </View>
    );
  }

  const outer = Math.min(110, height * 0.55);
  const inner = Math.min(45, height * 0.22);
  const size = outer * 2 + 8;
  const c = size / 2;
  const total = data.reduce((s, d) => s + d.amount, 0) || 1;
  const pad = data.length > 1 ? 4 : 0;

  // Cumulative start angle of each slice, computed without mutation.
  const starts = data.map((_, i) =>
    data.slice(0, i).reduce((sum, d) => sum + (d.amount / total) * 360, 0)
  );
  const slices = data.map((d, i) => {
    const sweep = (d.amount / total) * 360;
    const a0 = starts[i] + pad / 2;
    const a1 = starts[i] + Math.max(sweep - pad / 2, pad / 2 + 0.01);
    // A single 100% slice can't be drawn as one arc (start == end).
    const path =
      sweep >= 359.99
        ? `${sector(c, c, inner, outer, 0, 180)} ${sector(c, c, inner, outer, 180, 359.99)}`
        : sector(c, c, inner, outer, a0, a1);
    return { path, color: categoryColors[i % categoryColors.length], i };
  });

  const sel = active !== null ? data[active] : null;

  return (
    <Pressable style={[styles.wrap, { height }]} onPress={() => setActive(null)}>
      <Svg width={size} height={size}>
        <G>
          {slices.map((s) => (
            <Path
              key={s.i}
              d={s.path}
              fill={s.color}
              stroke={isDark ? 'rgba(20, 25, 42, 0.9)' : 'rgba(255,255,255,0.9)'}
              strokeWidth={3}
              strokeLinejoin="round"
              opacity={active === null || active === s.i ? 1 : 0.55}
              onPress={() => setActive(active === s.i ? null : s.i)}
            />
          ))}
        </G>
      </Svg>
      {sel ? (
        <View
          pointerEvents="none"
          style={[
            styles.tooltip,
            isDark
              ? { backgroundColor: 'rgba(30, 40, 62, 0.98)', borderColor: `${palette.accentBright}4D` }
              : { backgroundColor: 'rgba(255,255,255,0.97)', borderColor: 'rgba(255,255,255,0.8)' },
          ]}
        >
          <Text style={[styles.tipTitle, { color: isDark ? '#f8fafc' : '#1e293b' }]}>{sel.category}</Text>
          <Text style={[styles.tipAmount, { color: isDark ? palette.accentBright : palette.primary }]}>
            ₹{sel.amount.toLocaleString('en-IN')}
          </Text>
          <Text style={[styles.tipPct, { color: isDark ? '#94a3b8' : '#64748b' }]}>
            {sel.percentage.toFixed(1)}% of total
          </Text>
        </View>
      ) : null}
    </Pressable>
  );
};

const MAX_LEGEND_ENTRIES = 8;

/** The desktop's 2-column dot legend, capped at 8 entries. */
export const CategoryLegend: React.FC<{ data: CategorySlice[] }> = ({ data }) => {
  const { palette, categoryColors } = useTheme();
  if (data.length === 0) return null;
  const visible = data.slice(0, MAX_LEGEND_ENTRIES);
  const hidden = data.length - visible.length;
  return (
    <View style={styles.legend}>
      <View style={styles.legendGrid}>
        {visible.map((e, i) => (
          <View key={e.category} style={styles.legendItem}>
            <View style={[styles.dot, { backgroundColor: categoryColors[i % categoryColors.length] }]} />
            <Text style={[styles.legendText, { color: palette.textSecondary }]} numberOfLines={1}>
              {e.category}
            </Text>
          </View>
        ))}
      </View>
      {hidden > 0 ? (
        <Text style={[styles.more, { color: palette.textTertiary }]}>
          +{hidden} more {hidden === 1 ? 'category' : 'categories'}
        </Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
  empty: { alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 16 },
  emptyTitle: { fontSize: 14, fontWeight: '500', textAlign: 'center' },
  emptyQuote: { fontSize: 12, fontStyle: 'italic', textAlign: 'center' },
  tooltip: {
    position: 'absolute',
    top: 4,
    right: 4,
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 14,
    shadowColor: '#0f172a',
    shadowOpacity: 0.15,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  tipTitle: { fontSize: 13, fontWeight: '700' },
  tipAmount: { fontSize: 13, fontWeight: '600', marginTop: 4 },
  tipPct: { fontSize: 11, marginTop: 2 },
  legend: { marginTop: 12 },
  legendGrid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 8 },
  legendItem: { width: '50%', flexDirection: 'row', alignItems: 'center', gap: 8, paddingRight: 16 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 12, fontWeight: '500', flexShrink: 1 },
  more: { fontSize: 11, marginTop: 8 },
});
