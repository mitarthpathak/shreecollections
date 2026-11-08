'use client';
import { useEffect, useId, useLayoutEffect, useMemo, useRef, useSyncExternalStore } from 'react';
import { scaleLog, scaleLinear } from 'd3-scale';
import { bin, max as d3max } from 'd3-array';
import { brushX, type BrushBehavior, type D3BrushEvent } from 'd3-brush';
import { select } from 'd3-selection';
import { formatINR } from '@/lib/format';

const W = 280;
const H = 72;
const PAD = 8;
const DOMAIN: [number, number] = [1000, 25000];
const TICKS = [1000, 2000, 5000, 10000, 25000];
const subscribeCoarse = (cb: () => void) => {
  const m = window.matchMedia('(pointer: coarse)');
  m.addEventListener('change', cb);
  return () => m.removeEventListener('change', cb);
};
const short = (v: number) => (v >= 1000 ? `₹${v / 1000}k` : `₹${v}`);

/**
 * D3 owns the maths (log scale, bins, brush); React owns the bars.
 * Fine pointers get a d3-brush; touch gets a dual-thumb slider above the same histogram.
 */
export function PriceHistogram({
  prices,
  value,
  onChange,
  label,
}: {
  prices: number[];
  value: [number, number] | null;
  onChange: (v: [number, number] | null) => void;
  label: string;
}) {
  const x = useMemo(() => scaleLog().domain(DOMAIN).range([PAD, W - PAD]).clamp(true), []);
  const bins = useMemo(() => {
    const thresholds = Array.from({ length: 15 }, (_, i) => Math.exp(Math.log(DOMAIN[0]) + ((Math.log(DOMAIN[1]) - Math.log(DOMAIN[0])) * i) / 14));
    return bin().domain(DOMAIN).thresholds(thresholds)(prices);
  }, [prices]);
  const y = useMemo(() => scaleLinear().domain([0, d3max(bins, (b) => b.length) ?? 1]).range([H - 4, 10]), [bins]);
  const brushG = useRef<SVGGElement>(null);
  const brushRef = useRef<BrushBehavior<unknown> | null>(null);
  const touch = useSyncExternalStore(subscribeCoarse, () => window.matchMedia('(pointer: coarse)').matches, () => false);
  const [lo, hi] = value ?? DOMAIN;
  // The panel renders twice (desktop sidebar + mobile sheet); a shared gradient id would
  // resolve to the copy inside display:none and leave the bars unpainted.
  const gradId = `hist-gold-${useId().replace(/[^\w-]/g, '')}`;
  // The brush is bound once, so it must always call the latest onChange: an old closure
  // would rebuild the URL from stale search params and drop the other filters.
  const onChangeRef = useRef(onChange);
  useLayoutEffect(() => {
    onChangeRef.current = onChange;
  });

  // d3-brush lives in a <g> React never re-renders.
  useEffect(() => {
    if (touch || !brushG.current) return;
    const g = select(brushG.current);
    const brush = brushX<unknown>()
      .extent([[PAD, 4], [W - PAD, H]])
      .on('end', (e: D3BrushEvent<unknown>) => {
        if (!e.sourceEvent) return; // programmatic moves (below) don't report back
        const s = e.selection as [number, number] | null;
        if (!s) return onChangeRef.current(null);
        const a = Math.round(x.invert(s[0]) / 100) * 100;
        const b = Math.round(x.invert(s[1]) / 100) * 100;
        onChangeRef.current(a <= DOMAIN[0] && b >= DOMAIN[1] ? null : [a, b]);
      });
    g.call(brush);
    g.selectAll('.selection').attr('fill', 'rgba(233,196,106,0.12)').attr('stroke', '#E9C46A').attr('rx', 4);
    g.selectAll('.handle').attr('fill', '#E9C46A').attr('rx', 2);
    brushRef.current = brush;
    return () => {
      brushRef.current = null;
      g.on('.brush', null);
      g.selectAll('*').remove();
    };
  }, [touch, x]);

  // Keep the brush in step with the URL: "Clear all", back/forward, the other panel's brush.
  const v0 = value?.[0];
  const v1 = value?.[1];
  useEffect(() => {
    const brush = brushRef.current;
    if (touch || !brush || !brushG.current) return;
    select(brushG.current).call(brush.move, v0 != null && v1 != null ? [x(v0), x(v1)] : null);
  }, [touch, x, v0, v1]);

  const toPos = (v: number) => ((Math.log(v) - Math.log(DOMAIN[0])) / (Math.log(DOMAIN[1]) - Math.log(DOMAIN[0]))) * 1000;
  const fromPos = (p: number) => Math.round(Math.exp(Math.log(DOMAIN[0]) + (p / 1000) * (Math.log(DOMAIN[1]) - Math.log(DOMAIN[0]))) / 100) * 100;

  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between text-xs text-ivory-dim">
        <span>{label}</span>
        <span className="tabular-nums text-gold-100" aria-live="polite">
          {value ? `${formatINR(lo)} – ${formatINR(hi)}` : `${formatINR(Math.min(...prices))} – ${formatINR(Math.max(...prices))}`}
        </span>
      </div>
      {touch && (
        <div className="relative mb-1 h-11" role="group" aria-label={label}>
          {(['lo', 'hi'] as const).map((k) => (
            <input
              key={k}
              type="range"
              min={0}
              max={1000}
              step={1}
              aria-label={k === 'lo' ? `${label} min` : `${label} max`}
              value={toPos(k === 'lo' ? lo : hi)}
              onChange={(e) => {
                const v = fromPos(Number(e.target.value));
                const next: [number, number] = k === 'lo' ? [Math.min(v, hi - 200), hi] : [lo, Math.max(v, lo + 200)];
                onChange(next[0] <= DOMAIN[0] && next[1] >= DOMAIN[1] ? null : next);
              }}
              className="dual-thumb pointer-events-none absolute inset-0 h-11 w-full appearance-none bg-transparent"
            />
          ))}
        </div>
      )}
      <svg viewBox={`0 0 ${W} ${H + 18}`} className="w-full overflow-visible" role="img" aria-label={`${label} distribution`}>
        {bins.map((b, i) => {
          const x0 = x(b.x0 ?? DOMAIN[0]);
          const x1 = x(b.x1 ?? DOMAIN[1]);
          const on = !value || ((b.x1 ?? 0) > lo && (b.x0 ?? 0) < hi);
          return (
            <rect
              key={i}
              x={x0 + 1}
              y={y(b.length)}
              width={Math.max(0, x1 - x0 - 2)}
              height={H - 4 - y(b.length)}
              rx={2}
              fill={on ? `url(#${gradId})` : 'rgba(201,150,46,0.18)'}
            />
          );
        })}
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#FFF1C1" />
            <stop offset="1" stopColor="#8A6418" />
          </linearGradient>
        </defs>
        <line x1={PAD} x2={W - PAD} y1={H - 4} y2={H - 4} stroke="#8A6418" />
        {TICKS.map((t) => (
          <text key={t} x={x(t)} y={H + 12} textAnchor="middle" fontSize="9" fill="#C9BFAB">
            {short(t)}
          </text>
        ))}
        {!touch && <g ref={brushG} />}
      </svg>
    </div>
  );
}
