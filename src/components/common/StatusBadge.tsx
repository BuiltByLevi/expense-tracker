import React from 'react';
import { theme as design } from '../../styles/theme';
import { CheckIcon, AlertIcon } from './FinanceIcons';

export type EarningsStatus = 'confirmed' | 'estimated' | 'missing';

interface StatusBadgeProps {
  status: EarningsStatus;
  size?: 'sm' | 'md';
}

const STATUS_CONFIG: Record<EarningsStatus, { label: string; color: string; bg: string; Icon: React.FC<{ size?: number; color?: string; strokeWidth?: number }> | null }> = {
  confirmed: { label: 'Confirmed', color: design.colors.success, bg: `rgba(${design.colors.successRgb}, 0.1)`, Icon: CheckIcon },
  estimated: { label: 'Estimated', color: design.colors.warning, bg: 'rgba(245, 158, 11, 0.1)', Icon: AlertIcon },
  missing: { label: 'Default', color: design.colors.textSecondary, bg: 'rgba(0,0,0,0.05)', Icon: null },
};

/**
 * Shared earnings status pill, used wherever a month's confirmed/estimated/
 * default state needs a visual badge (EarningsHistoryPage tables/cards).
 */
const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  const { label, color, bg, Icon } = STATUS_CONFIG[status];
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '4px',
      padding: size === 'sm' ? '3px 8px' : '4px 10px',
      background: bg,
      color,
      borderRadius: '20px',
      fontSize: '11px',
      fontWeight: 600,
      whiteSpace: 'nowrap',
    }}>
      {Icon && <Icon size={10} color={color} strokeWidth={2.5} />}
      {label}
    </span>
  );
};

export default StatusBadge;
