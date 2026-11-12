import React from 'react';
import { theme as design } from '../../styles/theme';

interface IconProps {
  size?: number;
  color?: string;
  strokeWidth?: number;
  style?: React.CSSProperties;
}

const base = (size: number, style?: React.CSSProperties) => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none',
  xmlns: 'http://www.w3.org/2000/svg',
  style: { flexShrink: 0, display: 'block', ...style } as React.CSSProperties,
});

const stroke = (color?: string, strokeWidth = 2) => ({
  stroke: color || 'currentColor',
  strokeWidth,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
});

export const WalletIcon: React.FC<IconProps> = ({ size = 16, color, strokeWidth, style }) => (
  <svg {...base(size, style)}>
    <path {...stroke(color, strokeWidth)} d="M19 7V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2H3" />
    <circle cx="16" cy="14" r="1.4" fill={color || 'currentColor'} stroke="none" />
  </svg>
);

export const BankIcon: React.FC<IconProps> = ({ size = 16, color, strokeWidth, style }) => (
  <svg {...base(size, style)}>
    <path {...stroke(color, strokeWidth)} d="M3 9.5 12 4l9 5.5M4.5 10v8M9.5 10v8M14.5 10v8M19.5 10v8M3 20h18" />
  </svg>
);

export const LedgerIcon: React.FC<IconProps> = ({ size = 16, color, strokeWidth, style }) => (
  <svg {...base(size, style)}>
    <path {...stroke(color, strokeWidth)} d="M6 3h12a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1ZM9 8h6M9 12h6M9 16h3" />
  </svg>
);

export const TrendDownIcon: React.FC<IconProps> = ({ size = 16, color, strokeWidth, style }) => (
  <svg {...base(size, style)}>
    <path {...stroke(color, strokeWidth)} d="m3 8 5.5 5.5 3.5-3.5 7 7M19 17h2.5v-2.5" />
  </svg>
);

export const TrendUpIcon: React.FC<IconProps> = ({ size = 16, color, strokeWidth, style }) => (
  <svg {...base(size, style)}>
    <path {...stroke(color, strokeWidth)} d="m3 16 5.5-5.5 3.5 3.5 7-7M19 7h2.5v2.5" />
  </svg>
);

export const ExchangeIcon: React.FC<IconProps> = ({ size = 16, color, strokeWidth, style }) => (
  <svg {...base(size, style)}>
    <path {...stroke(color, strokeWidth)} d="M4 8h13m0 0-3-3m3 3-3 3M20 16H7m0 0 3-3m-3 3 3 3" />
  </svg>
);

export const ChartLineIcon: React.FC<IconProps> = ({ size = 16, color, strokeWidth, style }) => (
  <svg {...base(size, style)}>
    <path {...stroke(color, strokeWidth)} d="M4 4v15a1 1 0 0 0 1 1h15M8 15l3.5-4 3 2.5L19 8" />
  </svg>
);

export const PieIcon: React.FC<IconProps> = ({ size = 16, color, strokeWidth, style }) => (
  <svg {...base(size, style)}>
    <path {...stroke(color, strokeWidth)} d="M12 3a9 9 0 1 0 9 9h-9V3Z" />
    <path {...stroke(color, strokeWidth)} d="M15 3.5A9 9 0 0 1 20.5 9H15V3.5Z" />
  </svg>
);

export const CalendarIcon: React.FC<IconProps> = ({ size = 16, color, strokeWidth, style }) => (
  <svg {...base(size, style)}>
    <path {...stroke(color, strokeWidth)} d="M5 5h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1ZM4 10h16M8 3v4M16 3v4" />
  </svg>
);

export const UserIcon: React.FC<IconProps> = ({ size = 16, color, strokeWidth, style }) => (
  <svg {...base(size, style)}>
    <circle {...stroke(color, strokeWidth)} cx="12" cy="8" r="4" />
    <path {...stroke(color, strokeWidth)} d="M4.5 20.5c1.5-3.5 4.3-5 7.5-5s6 1.5 7.5 5" />
  </svg>
);

export const LockIcon: React.FC<IconProps> = ({ size = 16, color, strokeWidth, style }) => (
  <svg {...base(size, style)}>
    <rect {...stroke(color, strokeWidth)} x="5" y="11" width="14" height="9" rx="2" />
    <path {...stroke(color, strokeWidth)} d="M8 11V7a4 4 0 0 1 8 0v4" />
  </svg>
);

export const GearIcon: React.FC<IconProps> = ({ size = 16, color, strokeWidth, style }) => (
  <svg {...base(size, style)}>
    <circle {...stroke(color, strokeWidth)} cx="12" cy="12" r="3" />
    <path {...stroke(color, strokeWidth)} d="M12 2.5v3M12 18.5v3M21.5 12h-3M5.5 12h-3M18.7 5.3l-2.1 2.1M7.4 16.6l-2.1 2.1M18.7 18.7l-2.1-2.1M7.4 7.4 5.3 5.3" />
  </svg>
);

export const AlertIcon: React.FC<IconProps> = ({ size = 16, color, strokeWidth, style }) => (
  <svg {...base(size, style)}>
    <path {...stroke(color, strokeWidth)} d="M12 3 2.5 20h19L12 3ZM12 10v4.5" />
    <circle cx="12" cy="17.2" r="1" fill={color || 'currentColor'} stroke="none" />
  </svg>
);

export const CheckCircleIcon: React.FC<IconProps> = ({ size = 16, color, strokeWidth, style }) => (
  <svg {...base(size, style)}>
    <circle {...stroke(color, strokeWidth)} cx="12" cy="12" r="9" />
    <path {...stroke(color, strokeWidth)} d="m8 12.5 2.5 2.5L16 9.5" />
  </svg>
);

export const RupeeIcon: React.FC<IconProps> = ({ size = 16, color, strokeWidth, style }) => (
  <svg {...base(size, style)}>
    <path {...stroke(color, strokeWidth)} d="M7 4h10M7 8.5h10M7 4c4 0 6.5 1 6.5 4.5S10 13 7 13l6.5 7" />
  </svg>
);

export const SavingsIcon: React.FC<IconProps> = ({ size = 16, color, strokeWidth, style }) => (
  <svg {...base(size, style)}>
    <path {...stroke(color, strokeWidth)} d="M12 3v9m0 0 3.5-3.5M12 12 8.5 8.5" />
    <path {...stroke(color, strokeWidth)} d="M4 14v4a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4" />
  </svg>
);

export const DocumentIcon: React.FC<IconProps> = ({ size = 16, color, strokeWidth, style }) => (
  <svg {...base(size, style)}>
    <path {...stroke(color, strokeWidth)} d="M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8l-5-5Z" />
    <path {...stroke(color, strokeWidth)} d="M14 3v5h5M9 13h6M9 17h4" />
  </svg>
);

export const UploadIcon: React.FC<IconProps> = ({ size = 16, color, strokeWidth, style }) => (
  <svg {...base(size, style)}>
    <path {...stroke(color, strokeWidth)} d="M12 15V4m0 0L8 8m4-4 4 4" />
    <path {...stroke(color, strokeWidth)} d="M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" />
  </svg>
);

export const CameraIcon: React.FC<IconProps> = ({ size = 16, color, strokeWidth, style }) => (
  <svg {...base(size, style)}>
    <path {...stroke(color, strokeWidth)} d="M4 8h2.5l1.5-2.5h8L17.5 8H20a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1Z" />
    <circle {...stroke(color, strokeWidth)} cx="12" cy="13" r="3.2" />
  </svg>
);

export const MoonIcon: React.FC<IconProps> = ({ size = 16, color, strokeWidth, style }) => (
  <svg {...base(size, style)}>
    <path {...stroke(color, strokeWidth)} d="M20 14.5A8.5 8.5 0 0 1 9.5 4 8.5 8.5 0 1 0 20 14.5Z" />
  </svg>
);

export const SunIcon: React.FC<IconProps> = ({ size = 16, color, strokeWidth, style }) => (
  <svg {...base(size, style)}>
    <circle {...stroke(color, strokeWidth)} cx="12" cy="12" r="4" />
    <path {...stroke(color, strokeWidth)} d="M12 2.5v2M12 19.5v2M21.5 12h-2M4.5 12h-2M18.7 5.3l-1.4 1.4M6.7 17.3l-1.4 1.4M18.7 18.7l-1.4-1.4M6.7 6.7 5.3 5.3" />
  </svg>
);

export const ChevronDownIcon: React.FC<IconProps> = ({ size = 16, color, strokeWidth, style }) => (
  <svg {...base(size, style)}>
    <path {...stroke(color, strokeWidth)} d="m6 9 6 6 6-6" />
  </svg>
);

export const TrashIcon: React.FC<IconProps> = ({ size = 16, color, strokeWidth, style }) => (
  <svg {...base(size, style)}>
    <path {...stroke(color, strokeWidth)} d="M4 6h16M9 6V4.5A1.5 1.5 0 0 1 10.5 3h3A1.5 1.5 0 0 1 15 4.5V6M6.5 6l1 14a1 1 0 0 0 1 .9h7a1 1 0 0 0 1-.9l1-14M10 10.5v6M14 10.5v6" />
  </svg>
);

export const QuestionIcon: React.FC<IconProps> = ({ size = 16, color, strokeWidth, style }) => (
  <svg {...base(size, style)}>
    <circle {...stroke(color, strokeWidth)} cx="12" cy="12" r="9" />
    <path {...stroke(color, strokeWidth)} d="M9.5 9.5a2.5 2.5 0 1 1 3.8 2.1c-.8.5-1.3 1-1.3 1.9v.5" />
    <circle cx="12" cy="17" r="1" fill={color || 'currentColor'} stroke="none" />
  </svg>
);

export const InfoIcon: React.FC<IconProps> = ({ size = 16, color, strokeWidth, style }) => (
  <svg {...base(size, style)}>
    <circle {...stroke(color, strokeWidth)} cx="12" cy="12" r="9" />
    <path {...stroke(color, strokeWidth)} d="M12 11v5.5" />
    <circle cx="12" cy="7.5" r="1" fill={color || 'currentColor'} stroke="none" />
  </svg>
);

export const ClockIcon: React.FC<IconProps> = ({ size = 16, color, strokeWidth, style }) => (
  <svg {...base(size, style)}>
    <circle {...stroke(color, strokeWidth)} cx="12" cy="12" r="9" />
    <path {...stroke(color, strokeWidth)} d="M12 7v5l3.5 2" />
  </svg>
);

export const InboxIcon: React.FC<IconProps> = ({ size = 16, color, strokeWidth, style }) => (
  <svg {...base(size, style)}>
    <path {...stroke(color, strokeWidth)} d="M4 4h16v16H4V4Z" />
    <path {...stroke(color, strokeWidth)} d="M4 13h4.5l1.5 2.5h4l1.5-2.5H20" />
  </svg>
);

export const ShieldCheckIcon: React.FC<IconProps> = ({ size = 16, color, strokeWidth, style }) => (
  <svg {...base(size, style)}>
    <path {...stroke(color, strokeWidth)} d="M12 3 5 5.5v5.2c0 4.5 3 7.7 7 9.3 4-1.6 7-4.8 7-9.3V5.5L12 3Z" />
    <path {...stroke(color, strokeWidth)} d="m9 12 2.2 2.2L15.5 9.5" />
  </svg>
);

export const CheckIcon: React.FC<IconProps> = ({ size = 16, color, strokeWidth, style }) => (
  <svg {...base(size, style)}>
    <path {...stroke(color, strokeWidth)} d="m4.5 12.5 5 5L19.5 6.5" />
  </svg>
);

export const LogoutIcon: React.FC<IconProps> = ({ size = 16, color, strokeWidth, style }) => (
  <svg {...base(size, style)}>
    <path {...stroke(color, strokeWidth)} d="M14 4H6a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h8M10 12h11m0 0-3.5-3.5M21 12l-3.5 3.5" />
  </svg>
);

/** EMV-style chip for the bank-card KPI. Decorative. */
export const CardChip: React.FC<{ width?: number }> = ({ width = 34 }) => (
  <svg width={width} height={width * 0.74} viewBox="0 0 34 25" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ display: 'block' }}>
    <rect x="0.5" y="0.5" width="33" height="24" rx="4.5" fill="rgba(255,255,255,0.25)" stroke="rgba(255,255,255,0.6)" />
    <path d="M0.5 9h10M0.5 16h10M23.5 9h10M23.5 16h10M12 0.5v7a3 3 0 0 0 3 3h4a3 3 0 0 0 3-3v-7M12 24.5v-6a3 3 0 0 1 3-3h4a3 3 0 0 1 3 3v6" stroke="rgba(255,255,255,0.6)" />
  </svg>
);

/** Contactless-payment arcs for the bank-card KPI. Decorative. */
export const ContactlessMark: React.FC<{ size?: number }> = ({ size = 22 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ display: 'block' }}>
    <path d="M6 8.5a6.5 6.5 0 0 1 0 7M9.5 6.5a10 10 0 0 1 0 11M13 4.5a13.5 13.5 0 0 1 0 15" stroke="rgba(255,255,255,0.7)" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

/** Tiny decorative trend line for KPI cards. Pure presentation. */
export const Sparkline: React.FC<{
  data: number[];
  color?: string;
  width?: number;
  height?: number;
}> = ({ data, color, width = 72, height = 24 }) => {
  if (data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const span = max - min || 1;
  const pad = 3;
  const pts = data.map((v, i) => {
    const x = pad + (i / (data.length - 1)) * (width - pad * 2);
    const y = pad + (1 - (v - min) / span) * (height - pad * 2);
    return [x, y] as const;
  });
  const line = pts.map(p => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
  const c = color || design.colors.primary;
  const last = pts[pts.length - 1];
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" style={{ display: 'block' }}>
      <polyline points={line} stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" opacity="0.85" />
      <circle cx={last[0]} cy={last[1]} r="2.2" fill={c} />
    </svg>
  );
};

/** Month-over-month percent change pill. `goodWhenDown` flips the coloring for
 *  metrics like spending where a decrease is the positive outcome. */
export const DeltaBadge: React.FC<{
  current: number;
  previous: number;
  goodWhenDown?: boolean;
  light?: boolean;
}> = ({ current, previous, goodWhenDown = false, light = false }) => {
  if (!isFinite(previous) || previous === 0) return null;
  const pct = ((current - previous) / Math.abs(previous)) * 100;
  if (!isFinite(pct)) return null;
  const up = pct >= 0;
  const good = goodWhenDown ? !up : up;
  const color = light ? 'rgba(255,255,255,0.95)' : good ? design.colors.success : design.colors.danger;
  const bg = light
    ? 'rgba(255,255,255,0.2)'
    : good
      ? `rgba(${design.colors.successRgb}, 0.12)`
      : 'rgba(239, 68, 68, 0.12)';
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '3px',
      fontSize: '10px', fontWeight: 700, color, background: bg,
      padding: '2px 7px', borderRadius: '999px', letterSpacing: '0.02em',
      fontVariantNumeric: 'tabular-nums',
    }}>
      {up ? <TrendUpIcon size={10} color={color} strokeWidth={2.5} /> : <TrendDownIcon size={10} color={color} strokeWidth={2.5} />}
      {Math.abs(pct) >= 1000 ? '999+' : Math.abs(pct).toFixed(1)}% MoM
    </span>
  );
};
