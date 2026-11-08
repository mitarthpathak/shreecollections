'use client';
import { useMemo } from 'react';
import { pie, arc } from 'd3-shape';
import { COLOR_FAMILIES } from '@/lib/catalog';
import { useLang } from '@/lib/i18n';

/** A small Rang Chakra: colour families sized by real product counts. */
export function MiniChakra({
  counts,
  selected,
  onToggle,
  label,
}: {
  counts: Record<string, number>;
  selected: string[];
  onToggle: (c: string) => void;
  label: string;
}) {
  const lang = useLang();
  const entries = useMemo(() => Object.entries(counts).filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1]), [counts]);
  const arcs = useMemo(() => pie<[string, number]>().value((d) => d[1]).sort(null).padAngle(0.03)(entries), [entries]);
  const inner = arc<(typeof arcs)[number]>().innerRadius(34).outerRadius(54).cornerRadius(3);
  const outer = arc<(typeof arcs)[number]>().innerRadius(36).outerRadius(62).cornerRadius(3);

  return (
    <div className="flex items-start gap-4">
      <svg viewBox="-66 -66 132 132" className="h-28 w-28 shrink-0" aria-hidden>
        {arcs.map((a) => {
          const on = selected.includes(a.data[0]);
          return (
            <path
              key={a.data[0]}
              d={(on ? outer(a) : inner(a)) ?? ''}
              style={{ fill: COLOR_FAMILIES[a.data[0]]?.hex ?? 'var(--text-muted)', stroke: on ? 'var(--text)' : 'var(--bg)' }}
              strokeWidth={on ? 1.5 : 1}
              opacity={selected.length && !on ? 0.45 : 1}
              className="cursor-pointer transition-[d,opacity] duration-300"
              onClick={() => onToggle(a.data[0])}
            />
          );
        })}
        <circle r="28" strokeWidth="0.6" style={{ fill: 'var(--surface)', stroke: 'var(--gold-line)' }} />
        <text textAnchor="middle" dy="4" fontSize="9" style={{ fill: 'var(--gold-text)', fontFamily: 'var(--font-cinzel)', letterSpacing: 1.5 }}>
          RANG
        </text>
      </svg>
      <div role="group" aria-label={label} className="flex flex-wrap gap-1.5">
        {entries.map(([c, n]) => (
          <button
            key={c}
            type="button"
            role="checkbox"
            aria-checked={selected.includes(c)}
            onClick={() => onToggle(c)}
            className="chip !min-h-9 !px-2.5 !text-xs"
          >
            <span className="h-3 w-3 rounded-full ring-1 ring-field-line" style={{ background: COLOR_FAMILIES[c]?.hex }} />
            <span lang={lang === 'hi' ? 'hi' : undefined}>{lang === 'hi' ? COLOR_FAMILIES[c]?.hi : c}</span>
            <span className="opacity-60">{n}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
