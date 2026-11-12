import React, { useState } from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { CategoryTotal } from '../../types';
import { theme as design, categoryColors } from '../../styles/theme';
import { useTheme } from '../../context/ThemeContext';
import { useIsMobile } from '../../hooks/useIsMobile';
import { EMPTY_STATE_QUOTES, getRandomQuote } from '../../utils/quotes';

interface CategoryPieChartProps {
  data: CategoryTotal[];
  height?: number | string;
  /** Set false to suppress recharts' built-in legend, e.g. when the caller renders its own. */
  legend?: boolean;
}

const CategoryPieChart: React.FC<CategoryPieChartProps> = ({ data, height = 300, legend = true }) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const isMobile = useIsMobile();
  const [emptyQuote] = useState(() => getRandomQuote(EMPTY_STATE_QUOTES));

  if (data.length === 0) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100%',
        gap: '8px',
        padding: '0 16px',
        textAlign: 'center',
      }}>
        <span style={{ color: isDark ? '#94a3b8' : '#64748b', fontSize: '14px', fontWeight: 500 }}>
          No data available for this period
        </span>
        <span style={{ color: isDark ? '#6b7a94' : '#94a3b8', fontSize: '12px', fontStyle: 'italic' }}>
          “{emptyQuote.text}”
        </span>
      </div>
    );
  }

  // Force labels OFF on mobile to prevent overlap, and whenever the caller
  // renders its own legend (slice % labels would be redundant clutter).
  const showLabels = legend && !isMobile && data.length <= 6;

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload;
      return (
        <div style={{
          background: isDark
            ? 'linear-gradient(180deg, rgba(45, 55, 80, 0.98) 0%, rgba(20, 25, 42, 0.98) 100%)'
            : 'rgba(255,255,255,0.95)',
          backdropFilter: 'blur(20px)',
          border: isDark
            ? `1px solid rgba(${design.colors.accentBrightRgb}, 0.3)`
            : '1px solid rgba(255,255,255,0.8)',
          borderRadius: '12px',
          padding: '12px 16px',
          boxShadow: isDark
            ? `0 8px 32px rgba(0, 0, 0, 0.5), 0 0 20px rgba(${design.colors.accentBrightRgb}, 0.2)`
            : '0 8px 24px rgba(15, 23, 42, 0.15)',
          fontSize: '13px',
        }}>
          <p style={{ margin: 0, fontWeight: 700, color: isDark ? '#f8fafc' : '#1e293b' }}>
            {item.category}
          </p>
          <p style={{ margin: '4px 0 0 0', color: isDark ? design.colors.accentBright : design.colors.primary, fontWeight: 600 }}>
            ₹{item.amount.toLocaleString('en-IN')}
          </p>
          <p style={{ margin: '2px 0 0 0', color: isDark ? '#94a3b8' : '#64748b', fontSize: '11px' }}>
            {item.percentage.toFixed(1)}% of total
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={showLabels ? ({ name, percent }: any) =>
              `${name}: ${((percent || 0) * 100).toFixed(1)}%` : false}
            // Adjusted radius to look good on both mobile and desktop
            outerRadius={isMobile ? 85 : Math.min(110, (typeof height === 'number' ? height : 300) * 0.55)}
            innerRadius={isMobile ? 50 : Math.min(45, (typeof height === 'number' ? height : 300) * 0.22)}
            paddingAngle={isMobile ? 2 : 4}
            dataKey="amount"
            nameKey="category"
            cornerRadius={6}
          >
            {data.map((_entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={categoryColors[index % categoryColors.length]}
                stroke={isDark ? 'rgba(20, 25, 42, 0.9)' : 'rgba(255,255,255,0.9)'}
                strokeWidth={isMobile ? 2 : 3}
              />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          {legend && (
            <Legend
              verticalAlign="bottom"
              height={36}
              wrapperStyle={{
                paddingTop: '10px',
                fontSize: isMobile ? '11px' : '12px',
                fontWeight: 500,
                color: isDark ? '#a5b4c8' : '#64748b',
                lineHeight: '1.4',
              }}
              formatter={(value: string) => (
                <span style={{ color: isDark ? '#a5b4c8' : '#64748b', marginRight: '8px' }}>{value}</span>
              )}
              iconType="circle"
              iconSize={isMobile ? 6 : 8}
            />
          )}
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

export default CategoryPieChart;