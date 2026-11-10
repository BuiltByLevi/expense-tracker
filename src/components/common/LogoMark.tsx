import React from 'react';

interface LogoMarkProps {
  size?: number | string;
  color?: string;
  className?: string;
}

/**
 * The PRATIQ monogram — a circular "FP" mark (stem + crossbar read as F,
 * stem + loop read as P) — redrawn as SVG from the brand reference image so
 * it renders crisply at any size instead of using a raster export.
 */
const LogoMark: React.FC<LogoMarkProps> = ({ size = 24, color = 'currentColor', className }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 100 100"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-hidden="true"
  >
    <circle cx="50" cy="50" r="44" stroke={color} strokeWidth="7" />
    <line x1="42" y1="23" x2="42" y2="77" stroke={color} strokeWidth="7" />
    <line x1="19" y1="50" x2="58" y2="50" stroke={color} strokeWidth="7" />
    <circle cx="58" cy="36" r="15" stroke={color} strokeWidth="7" />
  </svg>
);

export default LogoMark;
