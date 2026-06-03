import React from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { CategoryTotal } from '../../types';

interface CategoryPieChartProps {
  data: CategoryTotal[];
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#FF6B6B', '#4ECDC4', '#45B7D1'];

const CategoryPieChart: React.FC<CategoryPieChartProps> = ({ data }) => {
  if (data.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '2rem', color: '#666' }}>
        No data available
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={400}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          labelLine={true}
          label={({ name, percent = 0 }) => `${name}: ${(percent * 100).toFixed(1)}%`}
          outerRadius={140}
          innerRadius={40}
          paddingAngle={5}
          dataKey="amount"
          nameKey="category"
          className="pie-3d"
        >
          {data.map((_entry, index) => (
            <Cell 
              key={`cell-${index}`} 
              fill={COLORS[index % COLORS.length]} 
              stroke="#fff"
              strokeWidth={2}
            />
          ))}
        </Pie>
        <Tooltip formatter={(value) => `₹${Number(value ?? 0).toLocaleString('en-IN')}`} />
        <Legend 
          wrapperStyle={{
            paddingTop: '20px'
          }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
};

export default CategoryPieChart;