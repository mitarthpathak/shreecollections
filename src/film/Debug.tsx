'use client';
import { useEffect, useRef, useSyncExternalStore } from 'react';
import { film } from './state';
import { CHAPTERS } from './chapters';
import { onFrame } from '@/lib/clock';
import { useShop, useUI, type Tier } from '@/lib/store';

/**
 * ?debug — frame timing, tier, chapter and film values, plus tier switches.
 * Only bundled when NODE_ENV !== 'production' or NEXT_PUBLIC_FILM_DEBUG=1.
 */
const noop = () => () => {};

export default function Debug() {
  const on = useSyncExternalStore(noop, () => new URLSearchParams(window.location.search).has('debug'), () => false);
  const out = useRef<HTMLPreElement>(null);
  const tier = useUI((s) => s.tier);
  const setOverride = useShop((s) => s.setTierOverride);
  useEffect(() => {
    if (!on) return;
    (window as unknown as { __film: typeof film }).__film = film;
    let last = performance.now();
    let acc = 0, frames = 0, worst = 0, fps = 0;
    return onFrame(() => {
      const now = performance.now();
      const dt = now - last;
      last = now;
      acc += dt;
      frames++;
      worst = Math.max(worst, dt);
      if (acc > 500) {
        fps = (frames * 1000) / acc;
        if (out.current)
          out.current.textContent = [
            `fps ${fps.toFixed(0)}  worst ${worst.toFixed(1)}ms`,
            `chapter ${film.chapter} ${CHAPTERS[film.chapter]?.id}  cp ${film.chapterProgress.toFixed(3)}`,
            `progress ${film.progress.toFixed(3)}  vel ${film.velocity.toFixed(0)}`,
            JSON.stringify(film.u, (k, v) => (k === '_gsap' ? undefined : typeof v === 'number' ? +v.toFixed(2) : v)),
          ].join('\n');
        acc = 0;
        frames = 0;
        worst = 0;
      }
    });
  }, [on]);
  if (!on) return null;
  return (
    <div className="fixed left-2 top-20 z-[120] max-w-[360px] rounded-lg bg-black/80 p-2 font-mono text-[10px] text-green-300">
      <pre ref={out} className="whitespace-pre-wrap" />
      <div className="mt-1 flex gap-1">
        {([0, 1, 2, 3] as Tier[]).map((t) => (
          <button key={t} type="button" onClick={() => setOverride(t)} className={`rounded px-2 py-1 ${tier === t ? 'bg-green-700' : 'bg-white/10'}`}>
            T{t}
          </button>
        ))}
        <button type="button" onClick={() => setOverride(null)} className="rounded bg-white/10 px-2 py-1">auto</button>
      </div>
    </div>
  );
}
