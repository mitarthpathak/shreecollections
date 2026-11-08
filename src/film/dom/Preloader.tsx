'use client';
import { useEffect, useRef } from 'react';
import { gsap, prefersReducedMotion } from '@/lib/gsap';
import { themeRGBA } from '@/lib/theme';
import { holdScroll } from '@/lib/clock';

/** The page background with zero alpha, so the fade never passes through grey. */
const clearBg = () => {
  const [r, g, b] = themeRGBA('--bg');
  return `rgba(${r},${g},${b},0)`;
};

const MIN = 1500;
const MAX = 2500;

/**
 * Shot 0: a gold ring draws itself, a matki fills with liquid gold as real progress rises,
 * and श्री fades in with a glint. Time-based (1.5–2.5 s), never blocks longer than that;
 * loading continues in the background. Once per session, and skippable.
 */
export function Preloader({ progress, onDone }: { progress: () => number; onDone: () => void }) {
  const root = useRef<HTMLDivElement>(null);
  const done = useRef(false);
  const release = useRef<() => void>(() => {});

  useEffect(() => {
    const el = root.current!;
    let seen = false;
    try {
      seen = sessionStorage.getItem('sc-intro') === '1';
    } catch {}
    if (seen || prefersReducedMotion()) {
      el.remove();
      onDone();
      return;
    }
    // Taken before the clock starts (this effect runs before Providers'); clock.ts applies it
    // to Lenis when Lenis is created, so the wheel can't scroll the film under the intro.
    const unlock = holdScroll();
    release.current = unlock;
    const t0 = performance.now();
    const fill = el.querySelector<SVGRectElement>('[data-fill]')!;
    const ring = el.querySelector('[data-ring]')!;
    gsap.fromTo(ring, { drawSVG: '0%' }, { drawSVG: '100%', duration: 1.1, ease: 'power2.inOut' });
    gsap.fromTo('[data-pre-shri]', { opacity: 0, scale: 0.92 }, { opacity: 1, scale: 1, duration: 0.9, delay: 0.35, ease: 'expo.out' });
    const shown = { v: 0 };
    const tick = () => {
      const elapsed = performance.now() - t0;
      const real = Math.min(1, progress());
      const target = Math.min(1, Math.max(real, elapsed / MAX) , elapsed < MIN ? elapsed / MIN : 1);
      shown.v += (target - shown.v) * 0.12;
      fill.setAttribute('y', String(100 - shown.v * 70));
      const ready = (elapsed >= MIN && real >= 0.999) || elapsed >= MAX;
      if (ready && !done.current) {
        done.current = true;
        gsap.ticker.remove(tick);
        try {
          sessionStorage.setItem('sc-intro', '1');
        } catch {}
        gsap.timeline({
          onComplete: () => {
            el.remove();
            unlock();
          },
        })
          .to(fill, { attr: { y: 30 }, duration: 0.25 })
          .to('[data-pre-matki], [data-pre-shri]', { opacity: 0, duration: 0.3 }, '<0.1')
          // the ring scales up and becomes the hero coin's rim
          .to(ring, { scale: 7, transformOrigin: '50% 50%', opacity: 0, duration: 1.1, ease: 'power3.inOut' }, '<')
          .to(el, { backgroundColor: clearBg(), duration: 0.8, ease: 'power2.out' }, '<0.25')
          .call(onDone, [], '<0.15');
      }
    };
    gsap.ticker.add(tick);
    return () => {
      gsap.ticker.remove(tick);
      // Leaving the page mid-intro (e.g. the "Skip to shop" link) must not leave it locked.
      unlock();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const skip = () => {
    if (done.current) return;
    done.current = true;
    try {
      sessionStorage.setItem('sc-intro', '1');
    } catch {}
    release.current();
    gsap.to(root.current, { opacity: 0, duration: 0.3, onComplete: () => root.current?.remove() });
    onDone();
  };

  return (
    <div ref={root} className="fixed inset-0 z-[110] grid place-items-center bg-bg" role="status" aria-label="Loading Shree Collection">
      <svg viewBox="0 0 200 200" className="w-[min(56vw,300px)] overflow-visible" aria-hidden>
        <defs>
          <linearGradient id="pre-gold" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" style={{ stopColor: 'var(--metal-hi)' }} />
            <stop offset="0.45" style={{ stopColor: 'var(--metal)' }} />
            <stop offset="1" style={{ stopColor: 'var(--metal-lo)' }} />
          </linearGradient>
          <clipPath id="pre-matki">
            <path d="M78 70 C 52 84, 50 132, 78 148 C 92 156, 108 156, 122 148 C 150 132, 148 84, 122 70 Z" />
          </clipPath>
        </defs>
        <circle data-ring cx="100" cy="100" r="92" fill="none" stroke="url(#pre-gold)" strokeWidth="2" transform="rotate(-90 100 100)" />
        <g data-pre-matki>
          <path d="M78 70 C 52 84, 50 132, 78 148 C 92 156, 108 156, 122 148 C 150 132, 148 84, 122 70 Z" fill="none" strokeWidth="1.2" style={{ stroke: 'var(--metal-lo)' }} />
          <path d="M80 70 h40 M84 64 h32" strokeWidth="1.2" style={{ stroke: 'var(--metal-lo)' }} />
          <g clipPath="url(#pre-matki)">
            <rect data-fill x="40" y="100" width="120" height="120" fill="url(#pre-gold)" />
          </g>
        </g>
        <text data-pre-shri x="100" y="196" textAnchor="middle" fill="url(#pre-gold)" style={{ fontFamily: 'var(--font-tiro)', fontSize: 34 }}>
          श्री
        </text>
      </svg>
      <button type="button" onClick={skip} className="absolute bottom-[calc(2rem+var(--safe-b))] min-h-11 rounded-full px-4 text-xs uppercase tracking-[0.25em] text-fg-muted hover:text-gold-text">
        Skip intro
      </button>
    </div>
  );
}
