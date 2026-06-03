import React from 'react';
import type { CategoryTotal } from '../../types';

interface CategoryPieChartMobileProps {
  data: CategoryTotal[];
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#FF6B6B', '#4ECDC4', '#45B7D1'];

const CategoryPieChartMobile: React.FC<CategoryPieChartMobileProps> = ({ data }) => {
  if (data.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '2rem', color: '#666' }}>
        No data available
      </div>
    );
  }

  const totalAmount = data.reduce((sum, d) => sum + d.amount, 0);

  return (
    <div>
      {/* Simple Donut Chart using CSS conic-gradient */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center',
        marginBottom: '20px'
      }}>
        <div style={{ position: 'relative', width: '180px', height: '180px' }}>
          <div
            style={{
              width: '100%',
              height: '100%',
              borderRadius: '50%',
              background: `conic-gradient(${data.map((item, index) => 
                `${COLORS[index % COLORS.length]} 0% ${item.percentage}%`
              ).join(', ')})`,
            }}
          />
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: '100px',
              height: '100px',
              background: 'white',
              borderRadius: '50%',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              textAlign: 'center'
            }}
          >
            <p style={{ fontSize: '10px', margin: 0, color: '#666' }}>Total</p>
            <p style={{ fontSize: '14px', fontWeight: 'bold', margin: 0, color: '#2c3e50' }}>
              ₹{totalAmount.toLocaleString('en-IN')}
            </p>
          </div>
        </div>
      </div>
      
      {/* Legend */}
      <div style={{ marginTop: '16px' }}>
        {data.map((entry, index) => (
          <div key={entry.category} style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between',
            marginBottom: '10px',
            padding: '10px',
            background: '#f8f9fa',
            borderRadius: '12px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                width: '12px',
                height: '12px',
                borderRadius: '50%',
                background: COLORS[index % COLORS.length]
              }} />
              <span style={{ fontSize: '13px', fontWeight: '500', color: '#555' }}>{entry.category}</span>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: '13px', fontWeight: '600', color: '#2c3e50' }}>
                ₹{entry.amount.toLocaleString('en-IN')}
              </span>
              <span style={{ 
                marginLeft: '8px', 
                fontSize: '11px', 
                fontWeight: 'bold', 
                color: COLORS[index % COLORS.length] 
              }}>
                ({entry.percentage.toFixed(1)}%)
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CategoryPieChartMobile;