import React, { useEffect, useMemo, useRef, useState } from 'react';
import { format } from 'date-fns';
import type { Expense } from '../../types';
import type { FinanceTotals } from '../../utils/finance';
import {
  buildCumulativeSpend, sliceMonthlySummaries,
  DAILY_RANGES, MONTHLY_RANGES, RANGE_LABELS, type TrendRange,
} from '../../utils/trendSeries';

/**
 * Stock-app style line charts: a big figure on top, a line you can drag a
 * finger (or mouse) along to read any point, and range buttons underneath.
 * Used on the mobile Analytics page and on the desktop dashboard.
 */

const inr = (n: number) => `${n < 0 ? '−' : ''}₹${Math.abs(Math.round(n)).toLocaleString('en-IN')}`;
const compact = new Intl.NumberFormat('en-IN', { notation: 'compact', maximumFractionDigits: 1 });
const tick = (n: number) => `${n < 0 ? '−' : ''}${compact.format(Math.abs(n))}`;

interface Series {
  key: string;
  color: string;
  values: number[];
  /** Thinner comparison line with no end marker. */
  muted?: boolean;
  /** Soft wash between the line and zero. */
  fill?: boolean;
}

/** Round step so the gridlines land on clean numbers (1, 2, 2.5, 5 × 10ⁿ). */
function niceStep(span: number, count: number): number {
  const raw = span / count;
  const pow = Math.pow(10, Math.floor(Math.log10(raw)));
  const f = raw / pow;
  return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * pow;
}

const PAD = { top: 10, right: 42, bottom: 22, left: 6 };

const LineChart: React.FC<{
  series: Series[];
  /** Short axis label for a point (only first, middle and last are drawn). */
  xLabel: (i: number) => string;
  active: number | null;
  onActive: (i: number | null) => void;
  ariaLabel: string;
  height?: number;
}> = ({ series, xLabel, active, onActive, ariaLabel, height = 190 }) => {
  const wrap = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const gradId = React.useId();

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    setWidth(el.clientWidth);
    const ro = new ResizeObserver(() => setWidth(el.clientWidth));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const n = series[0]?.values.length ?? 0;
  const geo = useMemo(() => {
    const all = series.flatMap((s) => s.values);
    let min = Math.min(0, ...all);
    let max = Math.max(0, ...all);
    if (max === min) max = min + 1;
    const step = niceStep(max - min, 3);
    const ticks: number[] = [];
    for (let t = Math.ceil(min / step) * step; t <= max + step * 1e-6; t += step) ticks.push(Math.abs(t) < step * 1e-6 ? 0 : t);
    max += (max - min) * 0.06;
    if (min < 0) min -= (max - min) * 0.06;
    return { min, max, ticks };
  }, [series]);

  const plotW = Math.max(0, width - PAD.left - PAD.right);
  const plotH = height - PAD.top - PAD.bottom;
  const x = (i: number) => PAD.left + (n > 1 ? (i / (n - 1)) * plotW : 0);
  const y = (v: number) => PAD.top + (1 - (v - geo.min) / (geo.max - geo.min)) * plotH;

  const indexAt = (clientX: number) => {
    const rect = wrap.current!.getBoundingClientRect();
    const ratio = plotW > 0 ? (clientX - rect.left - PAD.left) / plotW : 0;
    return Math.max(0, Math.min(n - 1, Math.round(ratio * (n - 1))));
  };

  if (n < 2) {
    return <div ref={wrap} className="tc-empty" style={{ height, marginTop: 10 }}>Not enough data yet to draw this trend.</div>;
  }

  const path = (vals: number[]) => vals.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join('');
  const shown = active ?? n - 1;
  const xTicks = [0, Math.floor((n - 1) / 2), n - 1];

  return (
    <div
      ref={wrap}
      className="tc-plot"
      style={{ height }}
      role="img"
      aria-label={`${ariaLabel} Use the left and right arrow keys to read each point.`}
      tabIndex={0}
      onPointerDown={(e) => onActive(indexAt(e.clientX))}
      onPointerMove={(e) => { if (e.pointerType === 'mouse' || e.buttons || e.pressure > 0) onActive(indexAt(e.clientX)); }}
      onPointerUp={(e) => { if (e.pointerType !== 'mouse') onActive(null); }}
      onPointerCancel={() => onActive(null)}
      onPointerLeave={() => onActive(null)}
      onBlur={() => onActive(null)}
      onKeyDown={(e) => {
        if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
          e.preventDefault();
          onActive(Math.max(0, Math.min(n - 1, shown + (e.key === 'ArrowLeft' ? -1 : 1))));
        } else if (e.key === 'Escape') onActive(null);
      }}
    >
      {width > 0 && (
        <svg width={width} height={height} aria-hidden="true">
          <defs>
            {series.filter((s) => s.fill).map((s) => (
              <linearGradient key={s.key} id={`${gradId}-${s.key}`} x1="0" x2="0" y1="0" y2="1">
                <stop offset="0" stopColor={s.color} stopOpacity="0.2" />
                <stop offset="1" stopColor={s.color} stopOpacity="0.02" />
              </linearGradient>
            ))}
          </defs>
          {geo.ticks.map((t) => (
            <g key={t}>
              <line x1={PAD.left} x2={PAD.left + plotW} y1={y(t)} y2={y(t)} stroke="var(--tc-grid)" strokeWidth={t === 0 && geo.min < 0 ? 1.5 : 1} />
              <text x={width} y={y(t) + 3} textAnchor="end">{tick(t)}</text>
            </g>
          ))}
          {xTicks.map((i, k) => (
            <text key={k} x={x(i)} y={height - 5} textAnchor={k === 0 ? 'start' : k === 2 ? 'end' : 'middle'}>{xLabel(i)}</text>
          ))}
          {series.filter((s) => s.fill).map((s) => (
            <path
              key={s.key}
              d={`${path(s.values)}L${x(n - 1).toFixed(1)},${y(0).toFixed(1)}L${x(0).toFixed(1)},${y(0).toFixed(1)}Z`}
              fill={`url(#${gradId}-${s.key})`}
            />
          ))}
          {series.map((s) => (
            <path key={s.key} d={path(s.values)} fill="none" stroke={s.color} strokeWidth={s.muted ? 1.5 : 2} strokeLinejoin="round" strokeLinecap="round" />
          ))}
          {active !== null && (
            <line x1={x(active)} x2={x(active)} y1={PAD.top} y2={PAD.top + plotH} stroke="var(--text-tertiary)" strokeWidth={1} />
          )}
          {series.filter((s) => !s.muted || active !== null).map((s) => (
            <circle key={s.key} cx={x(shown)} cy={y(s.values[shown])} r={s.muted ? 4 : 4.5} fill={s.color} stroke="var(--tc-surface)" strokeWidth={2} />
          ))}
        </svg>
      )}
    </div>
  );
};

const Ranges: React.FC<{ options: TrendRange[]; value: TrendRange; onChange: (r: TrendRange) => void }> = ({ options, value, onChange }) => (
  <div className="tc-ranges" role="group" aria-label="Time range">
    {options.map((r) => (
      <button key={r} type="button" aria-pressed={r === value} onClick={() => onChange(r)}>{r === 'ALL' ? 'All' : r}</button>
    ))}
  </div>
);

/** ▲ / ▼ with a good-or-bad colour; the words beside it carry the meaning too. */
const Arrow: React.FC<{ up: boolean; good: boolean }> = ({ up, good }) => (
  <span className={`tc-arrow ${good ? 'good' : 'bad'}`} aria-hidden="true">{up ? '▲' : '▼'}</span>
);

const SpendingTrend: React.FC<{ expenses: Expense[] }> = ({ expenses }) => {
  const [range, setRange] = useState<TrendRange>('1M');
  const [category, setCategory] = useState<string | null>(null);
  const [active, setActive] = useState<number | null>(null);

  const categories = useMemo(() => {
    const totals = new Map<string, number>();
    for (const e of expenses) totals.set(e.category, (totals.get(e.category) ?? 0) + e.amount);
    return [...totals.entries()].sort((a, b) => b[1] - a[1]).map(([c]) => c);
  }, [expenses]);

  const data = useMemo(
    () => buildCumulativeSpend(expenses, range, new Date(), category ?? undefined),
    [expenses, range, category],
  );
  const n = data.dates.length;
  const i = active !== null && active < n ? active : null;
  const series: Series[] = [
    ...(data.previous ? [{ key: 'prev', color: 'var(--tc-muted)', values: data.previous, muted: true }] : []),
    { key: 'cur', color: 'var(--tc-1)', values: data.current, fill: true },
  ];

  const prevTotal = data.previousTotal;
  const change = prevTotal ? ((data.total - prevTotal) / prevTotal) * 100 : null;
  const longRange = n > 120;

  let sub: React.ReactNode;
  if (i !== null) {
    sub = <>spent from {format(data.dates[0], 'd MMM')} to <strong>{format(data.dates[i], 'd MMM yyyy')}</strong></>;
  } else if (range === 'ALL') {
    sub = <>since {format(data.dates[0], 'd MMM yyyy')}</>;
  } else if (change === null) {
    sub = <>Nothing spent in the {RANGE_LABELS[range]} before, so there is nothing to compare</>;
  } else if (Math.abs(change) < 0.5) {
    sub = <>About the same as the previous {RANGE_LABELS[range]}</>;
  } else {
    sub = <><Arrow up={change > 0} good={change < 0} /><strong>{Math.abs(change).toFixed(0)}% {change > 0 ? 'more' : 'less'}</strong> than the previous {RANGE_LABELS[range]}</>;
  }

  return (
    <section className="glass-card tc-card">
      <p className="tc-title">{category ? `${category} spending` : 'Spending'} · {range === 'ALL' ? 'all time' : `last ${RANGE_LABELS[range]}`}</p>
      <p className="tc-value">{inr(i !== null ? data.current[i] : data.total)}</p>
      <p className="tc-sub">{sub}</p>
      {data.previous && (
        <ul className="tc-legend">
          <li><span className="tc-key" style={{ borderColor: 'var(--tc-1)' }} />This period{i !== null && <strong>{inr(data.current[i])}</strong>}</li>
          <li><span className="tc-key" style={{ borderColor: 'var(--tc-muted)' }} />Previous {RANGE_LABELS[range]}<strong>{inr(i !== null ? data.previous[i] : prevTotal ?? 0)}</strong></li>
        </ul>
      )}
      <LineChart
        series={series}
        xLabel={(k) => format(data.dates[k], longRange ? 'MMM yy' : 'd MMM')}
        active={i}
        onActive={setActive}
        ariaLabel={`Line chart of running total spending over the last ${RANGE_LABELS[range]}, reaching ${inr(data.total)}.`}
      />
      <Ranges options={DAILY_RANGES} value={range} onChange={(r) => { setActive(null); setRange(r); }} />
      {categories.length > 1 && (
        <div className="tc-chips" role="group" aria-label="Category">
          <button type="button" aria-pressed={category === null} onClick={() => setCategory(null)}>All categories</button>
          {categories.map((c) => (
            <button key={c} type="button" aria-pressed={category === c} onClick={() => setCategory(c)}>{c}</button>
          ))}
        </div>
      )}
    </section>
  );
};

const monthLabel = (s: { year: number; month: number }, long = false) =>
  format(new Date(s.year, s.month), long ? 'MMMM yyyy' : 'MMM yy');

const BalanceTrend: React.FC<{ financeTotals: FinanceTotals }> = ({ financeTotals }) => {
  const [range, setRange] = useState<TrendRange>('1Y');
  const [active, setActive] = useState<number | null>(null);
  const months = useMemo(() => sliceMonthlySummaries(financeTotals.monthlySummaries, range), [financeTotals, range]);
  const n = months.length;
  const i = active !== null && active < n ? active : null;
  const values = months.map((m) => m.runningBalance);
  const last = n ? values[n - 1] : 0;
  const diff = n > 1 ? last - values[0] : 0;

  let sub: React.ReactNode = null;
  if (i !== null) sub = <>at the end of <strong>{monthLabel(months[i], true)}</strong></>;
  else if (n > 1 && Math.round(diff) !== 0) {
    sub = <><Arrow up={diff > 0} good={diff > 0} /><strong>{inr(Math.abs(diff))} {diff > 0 ? 'up' : 'down'}</strong> since {monthLabel(months[0], true)}</>;
  } else if (n > 1) sub = <>No change since {monthLabel(months[0], true)}</>;

  return (
    <section className="glass-card tc-card">
      <p className="tc-title">Balance over time</p>
      <p className="tc-value">{inr(i !== null ? values[i] : last)}</p>
      <p className="tc-sub">{sub}</p>
      <LineChart
        series={[{ key: 'bal', color: 'var(--tc-1)', values, fill: true }]}
        xLabel={(k) => monthLabel(months[k])}
        active={i}
        onActive={setActive}
        ariaLabel={`Line chart of your running balance by month, now ${inr(last)}.`}
      />
      <Ranges options={MONTHLY_RANGES} value={range} onChange={(r) => { setActive(null); setRange(r); }} />
    </section>
  );
};

const EarnedVsSpent: React.FC<{ financeTotals: FinanceTotals }> = ({ financeTotals }) => {
  const [range, setRange] = useState<TrendRange>('1Y');
  const [active, setActive] = useState<number | null>(null);
  const months = useMemo(() => sliceMonthlySummaries(financeTotals.monthlySummaries, range), [financeTotals, range]);
  const n = months.length;
  const shown = n ? months[active !== null && active < n ? active : n - 1] : null;
  const net = shown ? shown.earnings - shown.spent : 0;

  return (
    <section className="glass-card tc-card">
      <p className="tc-title">Money in vs spent by month</p>
      <p className="tc-value">{inr(Math.abs(net))}</p>
      <p className="tc-sub">
        {shown && <><Arrow up={net >= 0} good={net >= 0} /><strong>{net >= 0 ? 'saved' : 'overspent'}</strong> in {monthLabel(shown, true)}</>}
      </p>
      <ul className="tc-legend">
        <li><span className="tc-key" style={{ borderColor: 'var(--tc-1)' }} />Money in<strong>{inr(shown?.earnings ?? 0)}</strong></li>
        <li><span className="tc-key" style={{ borderColor: 'var(--tc-2)' }} />Spent<strong>{inr(shown?.spent ?? 0)}</strong></li>
      </ul>
      <LineChart
        series={[
          { key: 'earned', color: 'var(--tc-1)', values: months.map((m) => m.earnings) },
          { key: 'spent', color: 'var(--tc-2)', values: months.map((m) => m.spent) },
        ]}
        xLabel={(k) => monthLabel(months[k])}
        active={active !== null && active < n ? active : null}
        onActive={setActive}
        ariaLabel="Line chart comparing money in and spending for each month."
      />
      <Ranges options={MONTHLY_RANGES} value={range} onChange={(r) => { setActive(null); setRange(r); }} />
    </section>
  );
};

const TrendCharts: React.FC<{ expenses: Expense[]; financeTotals: FinanceTotals }> = ({ expenses, financeTotals }) => (
  <>
    <SpendingTrend expenses={expenses} />
    <BalanceTrend financeTotals={financeTotals} />
    <EarnedVsSpent financeTotals={financeTotals} />
  </>
);

export default TrendCharts;
