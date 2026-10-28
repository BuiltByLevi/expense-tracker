import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface MonthlyBarChartProps {
  data: { month: string; total: number }[];
}

const MonthlyBarChart: React.FC<MonthlyBarChartProps> = ({ data }) => {
  if (data.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '2rem', color: '#666' }}>
        No data available
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={400}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="month" />
        <YAxis />
        <Tooltip formatter={(value: number | string | readonly (string | number)[] | undefined) => {
          const formattedValue = Array.isArray(value) ? value[0] : value;
          return typeof formattedValue === 'number' ? `$${formattedValue.toFixed(2)}` : formattedValue;
        }} />
        <Legend />
        <Bar dataKey="total" fill="#8884d8" name="Monthly Expenses" />
      </BarChart>
    </ResponsiveContainer>
  );
};

export default MonthlyBarChart;