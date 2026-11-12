import React from 'react';
import { theme as design } from '../../styles/theme';
import { Sparkline } from '../common/FinanceIcons';

interface StatCardProps {
  label: React.ReactNode;
  value: React.ReactNode;
  hint?: React.ReactNode;
  valueColor?: string;
  icon?: React.ReactNode;
  /** Accent hex for the icon well and corner watermark (full-size cards). */
  wellColor?: string;
  compact?: boolean;
  accent?: boolean;
  danger?: boolean;
  /** 4-6 recent monthly values rendered as a mini trend line next to the value. */
  trend?: number[];
  trendColor?: string;
  /** Extra element (e.g. a MoM DeltaBadge) rendered after the hint. */
  badge?: React.ReactNode;
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
  wellColor,
  compact = false,
  accent = false,
  danger = false,
  trend,
  trendColor,
  badge,
  onClick,
  'aria-label': ariaLabel,
}) => {
  const background = danger
    ? 'linear-gradient(135deg, #ef4444 0%, #f97316 100%)'
    : accent
      ? design.colors.primaryGradient
      : undefined;
  const onColor = (danger || accent) ? 'rgba(255,255,255,0.85)' : design.colors.textSecondary;
  const valueOnColor = (danger || accent)
    ? (valueColor || 'white')
    : (valueColor || design.colors.textPrimary);

  if (compact) {
    return (
      <div
        className="glass-card"
        onClick={onClick}
        role={onClick ? 'button' : undefined}
        tabIndex={onClick ? 0 : undefined}
        aria-label={ariaLabel}
        style={{
          padding: '12px 10px',
          textAlign: 'center',
          cursor: onClick ? 'pointer' : undefined,
          background,
          border: background ? 'none' : undefined,
          minWidth: 0,
          overflow: 'hidden',
        }}
      >
        <p style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
          fontSize: '11px', fontWeight: 600, color: onColor,
          textTransform: 'uppercase', letterSpacing: '0.06em', margin: 0,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {icon && <span style={{ display: 'inline-flex', alignItems: 'center' }}>{icon}</span>}
          {label}
        </p>
        <h2 style={{
          fontSize: '15px', fontWeight: 700, color: valueOnColor, margin: '6px 0 0 0',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          letterSpacing: '-0.01em', fontVariantNumeric: 'tabular-nums', minWidth: 0,
        }}>
          {value}
        </h2>
        {(hint || badge) && (
          <p style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            fontSize: '11px', color: onColor, margin: '6px 0 0 0', fontWeight: 500, flexWrap: 'wrap',
          }}>
            {hint}
            {badge}
          </p>
        )}
      </div>
    );
  }

  // Full-size cards mirror the bank-card KPI: icon well + sparkline on the
  // top row, label/value/hint anchored to the bottom, a faint oversized icon
  // as a corner watermark, and height:100% so grid rows stay even.
  const onDark = danger || accent;
  const well = wellColor || design.colors.primary;
  const wellBg = onDark ? 'rgba(255,255,255,0.2)' : `${well}1F`;
  const iconColor = onDark ? 'white' : well;

  return (
    <div
      className="glass-card"
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      aria-label={ariaLabel}
      style={{
        padding: '16px 20px',
        height: '100%',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        gap: '12px',
        cursor: onClick ? 'pointer' : undefined,
        background,
        border: background ? 'none' : undefined,
        minWidth: 0,
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {React.isValidElement(icon) && (
        <div aria-hidden="true" style={{
          position: 'absolute', right: '-14px', bottom: '-18px',
          color: iconColor, opacity: onDark ? 0.14 : 0.07, pointerEvents: 'none',
        }}>
          {React.cloneElement(icon as React.ReactElement<{ size?: number; strokeWidth?: number; color?: string }>, { size: 92, strokeWidth: 1.4, color: undefined })}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
        <div style={{
          width: '36px', height: '36px', borderRadius: '11px', flexShrink: 0,
          background: wellBg, color: iconColor,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {icon}
        </div>
        {trend && trend.length >= 2 && (
          <Sparkline data={trend} color={trendColor || valueOnColor} />
        )}
      </div>

      <div style={{ minWidth: 0, position: 'relative' }}>
        <p style={{
          display: 'flex', alignItems: 'center', gap: '6px',
          fontSize: '11px', fontWeight: 600, color: onColor,
          textTransform: 'uppercase', letterSpacing: '0.06em', margin: 0,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {label}
        </p>
        <h2 style={{
          fontSize: '22px', fontWeight: 700, color: valueOnColor, margin: '6px 0 0 0',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          letterSpacing: '-0.01em', fontVariantNumeric: 'tabular-nums', minWidth: 0,
        }}>
          {value}
        </h2>
        <p style={{
          display: 'flex', alignItems: 'center', gap: '8px', minHeight: '24px',
          fontSize: '11px', color: onColor, margin: '5px 0 0 0', fontWeight: 500, flexWrap: 'wrap',
        }}>
          {hint}
          {badge}
        </p>
      </div>
    </div>
  );
};

export default StatCard;
