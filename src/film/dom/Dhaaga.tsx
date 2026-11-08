'use client';
import { useMemo, useRef } from 'react';
import { lineRadial, curveCardinalClosed, line, curveCatmullRomClosed } from 'd3-shape';
import { range } from 'd3-array';
import { Section, ranges } from './Section';
import { brand } from '@/brand.config';
import { gsap, useGSAP, prefersReducedMotion } from '@/lib/gsap';
import { film } from '../state';

/** Procedural mandala + paisley line-art, drawn with d3.lineRadial + curveCardinalClosed. */
function Mandala() {
  const paths = useMemo(() => {
    const out: { d: string; w: number; o: number }[] = [];
    const radial = lineRadial<[number, number]>().curve(curveCardinalClosed.tension(0.35));
    // petal rings
    [
      [12, 70, 110],
      [16, 120, 160],
      [24, 175, 205],
      [32, 215, 240],
    ].forEach(([petals, inner, outer], k) => {
      const pts: [number, number][] = range(petals * 2).map((i) => [(i / (petals * 2)) * Math.PI * 2, i % 2 ? inner : outer]);
      out.push({ d: radial(pts) ?? '', w: 1.2 - k * 0.15, o: 0.9 - k * 0.12 });
    });
    // inner lotus
    out.push({ d: radial(range(16).map((i) => [(i / 16) * Math.PI * 2, i % 2 ? 26 : 56] as [number, number])) ?? '', w: 1.4, o: 1 });
    // a ring of paisleys
    const kairi = line().curve(curveCatmullRomClosed.alpha(0.5));
    const base: [number, number][] = [[0, -18], [9, -14], [13, -3], [10, 8], [2, 15], [-7, 14], [-11, 6], [-9, -2], [-3, -3], [-1, 1], [-4, 5]];
    range(12).forEach((i) => {
      const a = (i / 12) * Math.PI * 2;
      const r = 268;
      const cx = Math.sin(a) * r, cy = -Math.cos(a) * r;
      const pts = base.map(([x, y]) => {
        const rx = x * Math.cos(a) - y * Math.sin(a);
        const ry = x * Math.sin(a) + y * Math.cos(a);
        return [cx + rx * 1.4, cy + ry * 1.4] as [number, number];
      });
      out.push({ d: kairi(pts) ?? '', w: 1, o: 0.8 });
    });
    out.push({ d: radial(range(96).map((i) => [(i / 96) * Math.PI * 2, i % 2 ? 300 : 306] as [number, number])) ?? '', w: 0.8, o: 0.6 });
    return out;
  }, []);
  return (
    <svg viewBox="-320 -320 640 640" className="h-[min(92vw,86svh)] w-[min(92vw,86svh)]" aria-hidden>
      <defs>
        <linearGradient id="mandala-gold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" style={{ stopColor: 'var(--metal-hi)' }} />
          <stop offset="0.5" style={{ stopColor: 'var(--metal)' }} />
          <stop offset="1" style={{ stopColor: 'var(--metal-lo)' }} />
        </linearGradient>
      </defs>
      {paths.map((p, i) => (
        <path key={i} data-mandala d={p.d} fill="none" stroke="url(#mandala-gold)" strokeWidth={p.w} opacity={p.o} />
      ))}
    </svg>
  );
}

export function Dhaaga() {
  const root = useRef<HTMLElement>(null);
  const words = brand.copy.thread.en.split(' ');

  useGSAP(
    () => {
      const el = root.current!;
      if (prefersReducedMotion()) return;
      // mandala draws on in sync with the thread
      gsap.timeline({ scrollTrigger: { ...ranges.enter(el), end: 'bottom bottom' } })
        .fromTo('[data-mandala]', { drawSVG: '0%' }, { drawSVG: '100%', stagger: 0.04, ease: 'none', duration: 1 }, 0)
        .fromTo('[data-mandala-wrap]', { rotate: -30, scale: 0.85 }, { rotate: 15, scale: 1.05, ease: 'none', duration: 1 }, 0)
        .to(film.u.thread, { glow: 1, ease: 'none', duration: 1 }, 0);
      gsap.to('[data-mandala-wrap]', { opacity: 0, scrollTrigger: ranges.exit(el) });
      // each word fills with gold as it crosses the centre
      gsap.utils.toArray<HTMLElement>('[data-fill]').forEach((w) => {
        gsap.fromTo(w, { clipPath: 'inset(0 100% 0 0)' }, { clipPath: 'inset(0 0% 0 0)', ease: 'none', scrollTrigger: { trigger: w, start: 'top 62%', end: 'bottom 42%', scrub: 0.8 } });
      });
    },
    { scope: root },
  );

  return (
    <Section index={1} ref={root}>
      <div className="pointer-events-none sticky top-0 grid h-svh place-items-center overflow-hidden">
        <div data-mandala-wrap className="opacity-60">
          <Mandala />
        </div>
      </div>
      <div className="relative -mt-[100svh] flex min-h-full flex-col justify-center px-safe py-[26svh] md:px-safe-12 short:py-[14svh]">
        <h2 className="mx-auto max-w-[1600px] font-editorial font-medium text-[length:clamp(2.5rem,min(12vw,20svh),13rem)] leading-[0.95] tracking-tight short:text-[length:clamp(2rem,min(12vw,15svh),13rem)]">
          {words.map((w, i) => (
            <span key={i} className={`relative mr-[0.25em] inline-block ${w.startsWith('thread') ? 'italic' : ''}`}>
              <span className="text-outline-gold">{w}</span>
              {/* the one accent word fills in italic gold; the rest fill in --text */}
              <span data-fill aria-hidden className={`absolute inset-0 ${w.startsWith('thread') ? 'accent-word' : 'text-fg'}`} style={{ clipPath: 'inset(0 0 0 0)' }}>
                {w}
              </span>
            </span>
          ))}
        </h2>
        <p lang="hi" className="font-hindi-display mx-auto mt-8 w-full max-w-[1600px] text-[length:clamp(1.3rem,min(3vw,6svh),2.6rem)] text-fg/85 short:mt-3">
          {brand.copy.thread.hi}
        </p>
      </div>
    </Section>
  );
}
