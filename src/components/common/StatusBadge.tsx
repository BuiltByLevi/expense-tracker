import React from 'react';
import { theme as design } from '../../styles/theme';

export type EarningsStatus = 'confirmed' | 'estimated' | 'missing';

interface StatusBadgeProps {
  status: EarningsStatus;
  size?: 'sm' | 'md';
}

const STATUS_CONFIG: Record<EarningsStatus, { label: string; color: string; bg: string }> = {
  confirmed: { label: '✓ Confirmed', color: design.colors.success, bg: 'rgba(20, 184, 166, 0.1)' },
  estimated: { label: '⚠ Estimated', color: design.colors.warning, bg: 'rgba(245, 158, 11, 0.1)' },
  missing: { label: 'Default', color: design.colors.textSecondary, bg: 'rgba(0,0,0,0.05)' },
};

/**
 * Shared earnings status pill, used wherever a month's confirmed/estimated/
 * default state needs a visual badge (EarningsHistoryPage tables/cards).
 */
const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  const { label, color, bg } = STATUS_CONFIG[status];
  return (
    <span style={{
      padding: size === 'sm' ? '3px 8px' : '4px 10px',
      background: bg,
      color,
      borderRadius: '20px',
      fontSize: size === 'sm' ? '11px' : '11px',
      fontWeight: 600,
    }}>
      {label}
    </span>
  );
};

export default StatusBadge;
