import React from 'react';
import { theme as design } from '../../styles/theme';

interface StatCardProps {
  label: React.ReactNode;
  value: React.ReactNode;
  hint?: React.ReactNode;
  valueColor?: string;
  icon?: React.ReactNode;
  compact?: boolean;
  accent?: boolean;
  danger?: boolean;
  onClick?: () => void;
  'aria-label'?: string;
}

/**
 * Shared KPI tile used by DashboardWeb and DashboardMobile so the repeated
 * inline card markup stays visually consistent and only needs to change once.
 */
const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  hint,
  valueColor,
  icon,
  compact = false,
  accent = false,
  danger = false,
  onClick,
  'aria-label': ariaLabel,
}) => {
  const background = danger
    ? 'linear-gradient(135deg, #ef4444 0%, #f97316 100%)'
    : accent
      ? design.colors.primaryGradient
      : undefined;
  const onColor = (danger || accent) ? 'rgba(255,255,255,0.85)' : design.colors.textSecondary;
  const valueOnColor = (danger || accent) ? 'white' : (valueColor || design.colors.textPrimary);

  return (
    <div
      className="glass-card"
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      aria-label={ariaLabel}
      style={{
        padding: compact ? '12px 10px' : '20px',
        textAlign: compact ? 'center' : undefined,
        cursor: onClick ? 'pointer' : undefined,
        background,
        border: background ? 'none' : undefined,
        minWidth: 0,
        overflow: 'hidden',
      }}
    >
      <p
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          fontSize: compact ? '11px' : '11px',
          fontWeight: 600,
          color: onColor,
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          margin: 0,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {icon && <span style={{ fontSize: compact ? '12px' : '14px' }}>{icon}</span>}
        {label}
      </p>
      <h2
        style={{
          fontSize: compact ? '15px' : '22px',
          fontWeight: 700,
          color: valueOnColor,
          margin: compact ? '6px 0 0 0' : '8px 0 0 0',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          letterSpacing: '-0.01em',
        }}
      >
        {value}
      </h2>
      {hint && (
        <p
          style={{
            fontSize: compact ? '11px' : '11px',
            color: onColor,
            margin: '6px 0 0 0',
            fontWeight: 500,
          }}
        >
          {hint}
        </p>
      )}
    </div>
  );
};

export default StatCard;
