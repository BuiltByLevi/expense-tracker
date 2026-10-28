import React, { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { CategoryTotal } from '../../types';
import { categoryColors } from '../../styles/theme';
import { useTheme } from '../../context/ThemeContext';

interface CategoryPieChartProps {
  data: CategoryTotal[];
  height?: number | string;
}

const CategoryPieChart: React.FC<CategoryPieChartProps> = ({ data, height = 300 }) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (data.length === 0) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100%',
        color: isDark ? '#94a3b8' : '#64748b',
        fontSize: '14px',
        fontWeight: 500,
      }}>
        No data available for this period
      </div>
    );
  }

  // Disable labels on mobile to prevent overlap
  const showLabels = !isMobile && data.length <= 6;

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
            ? '1px solid rgba(139, 92, 246, 0.3)'
            : '1px solid rgba(255,255,255,0.8)',
          borderRadius: '12px',
          padding: '12px 16px',
          boxShadow: isDark
            ? '0 8px 32px rgba(0, 0, 0, 0.5), 0 0 20px rgba(139, 92, 246, 0.2)'
            : '0 8px 24px rgba(15, 23, 42, 0.15)',
          fontSize: '13px',
        }}>
          <p style={{ margin: 0, fontWeight: 700, color: isDark ? '#f8fafc' : '#1e293b' }}>
            {item.category}
          </p>
          <p style={{ margin: '4px 0 0 0', color: isDark ? '#a78bfa' : '#6366f1', fontWeight: 600 }}>
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

  const containerHeight: number | `${number}%` = typeof height === 'number'
    ? height
    : /^\d+(?:\.\d+)?%$/.test(height)
      ? height as `${number}%`
      : Number.isFinite(Number(height)) ? Number(height) : 300;

  return (
    <ResponsiveContainer width="100%" height={containerHeight}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          labelLine={showLabels}
          label={showLabels ? ({ name, percent }: any) =>
            `${name}: ${((percent || 0) * 100).toFixed(1)}%` : false}
          // Adjusted radius calculations for mobile
          outerRadius={isMobile ? Math.min(90, (typeof height === 'number' ? height : 300) * 0.45) : Math.min(110, (typeof height === 'number' ? height : 300) * 0.55)}
          innerRadius={isMobile ? Math.min(55, (typeof height === 'number' ? height : 300) * 0.28) : Math.min(45, (typeof height === 'number' ? height : 300) * 0.22)}
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
        <Legend
          wrapperStyle={{
            paddingTop: isMobile ? '8px' : '16px',
            fontSize: isMobile ? '11px' : '12px',
            fontWeight: 500,
            color: isDark ? '#a5b4c8' : '#64748b',
          }}
          formatter={(value: string) => (
            <span style={{ color: isDark ? '#a5b4c8' : '#64748b' }}>{value}</span>
          )}
          iconType="circle"
          iconSize={isMobile ? 6 : 8}
        />
      </PieChart>
    </ResponsiveContainer>
  );
};

export default CategoryPieChart;