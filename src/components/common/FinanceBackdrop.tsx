import React from 'react';

/**
 * Decorative animated background for the whole app: a faint chart grid, a
 * stock-style line that keeps drawing itself, candlesticks that rise and
 * fall, and ₹ coins drifting upward. Pure CSS/SVG (transform, opacity and
 * stroke-dashoffset only), low contrast, never clickable, hidden from
 * screen readers, and frozen for people who prefer reduced motion.
 */

const COINS = [
  { left: '6%', size: 26, delay: 0, dur: 22 },
  { left: '18%', size: 18, delay: 6, dur: 26 },
  { left: '31%', size: 32, delay: 11, dur: 30 },
  { left: '47%', size: 20, delay: 3, dur: 24 },
  { left: '62%', size: 28, delay: 14, dur: 28 },
  { left: '74%', size: 16, delay: 8, dur: 21 },
  { left: '86%', size: 24, delay: 17, dur: 27 },
  { left: '94%', size: 18, delay: 1, dur: 23 },
];

const CANDLES = [
  { x: 10, h: 38, up: true }, { x: 30, h: 54, up: true }, { x: 50, h: 30, up: false },
  { x: 70, h: 62, up: true }, { x: 90, h: 44, up: false }, { x: 110, h: 72, up: true },
  { x: 130, h: 50, up: true }, { x: 150, h: 34, up: false }, { x: 170, h: 80, up: true },
];

// A wandering upward trend, like a stock chart.
const TREND = 'M0,250 C60,240 90,205 140,214 S220,170 270,182 S350,120 400,140 S480,96 540,108 S640,52 700,70 S800,30 860,44 S960,18 1000,10';

const FinanceBackdrop: React.FC = () => (
  <div className="fx-bg" aria-hidden="true">
    <div className="fx-grid" />

    <svg className="fx-trend" viewBox="0 0 1000 300" preserveAspectRatio="none">
      <defs>
        <linearGradient id="fx-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--fx-line)" stopOpacity="0.22" />
          <stop offset="1" stopColor="var(--fx-line)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path className="fx-area" d={`${TREND} L1000,300 L0,300 Z`} fill="url(#fx-fill)" />
      <path className="fx-line" d={TREND} pathLength={1} />
      <circle className="fx-dot" cx="1000" cy="10" r="5" />
    </svg>

    <svg className="fx-candles" viewBox="0 0 190 120">
      {CANDLES.map((c, i) => (
        <g key={c.x} className={`fx-candle ${c.up ? 'up' : 'down'}`} style={{ animationDelay: `${i * 0.7}s` }}>
          <line x1={c.x + 5} x2={c.x + 5} y1={118 - c.h - 10} y2={118} />
          <rect x={c.x} y={118 - c.h} width="10" height={c.h - 6} rx="2" />
        </g>
      ))}
    </svg>

    {COINS.map((c) => (
      <span
        key={c.left}
        className="fx-coin"
        style={{ left: c.left, width: c.size, height: c.size, fontSize: c.size * 0.55, animationDelay: `-${c.delay}s`, animationDuration: `${c.dur}s` }}
      >
        ₹
      </span>
    ))}
  </div>
);

export default FinanceBackdrop;
