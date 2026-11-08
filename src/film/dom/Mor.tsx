'use client';
import { useRef } from 'react';
import { Section } from './Section';
import { gsap, useGSAP, prefersReducedMotion } from '@/lib/gsap';
import { film } from '../state';
import { PEACOCK_EYE } from '../peacock';

/** Mor pankh wipe: the feather sweeps across the lens; its eye becomes the mask into suits. */
export function Mor() {
  const root = useRef<HTMLElement>(null);
  useGSAP(
    () => {
      const el = root.current!;
      if (prefersReducedMotion()) return;
      gsap.timeline({ scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: 0.8 } })
        .fromTo(film.u.mor, { sweep: 0 }, { sweep: 1, ease: 'none', duration: 1 }, 0)
        .fromTo('[data-eye]', { clipPath: 'circle(0% at 50% 55%)', opacity: 1 }, { clipPath: 'circle(75% at 50% 55%)', ease: 'power2.in', duration: 0.55 }, 0.35)
        .to('[data-eye]', { opacity: 0, duration: 0.15 }, 0.9)
        .fromTo('[data-mor-label]', { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.25 }, 0.05)
        .to('[data-mor-label]', { opacity: 0, duration: 0.2 }, 0.45);
    },
    { scope: root },
  );
  return (
    <Section index={4} ref={root} label="Mor pankh" className="overflow-x-clip">
      <div className="pointer-events-none fixed inset-0 z-20 grid place-items-center [[data-chapter-active]:not([data-chapter-active=mor])_&]:invisible">
        <p data-mor-label className="label text-gold-text opacity-0 motion-reduce:opacity-100">
          Mor Pankh · <span lang="hi">मोरपंख</span>
        </p>
        {/* the same crisp eye as the coin face and the logo badge (peacock.ts) */}
        <div
          data-eye
          aria-hidden
          className="absolute inset-0 opacity-0"
          style={{
            clipPath: 'circle(0% at 50% 55%)',
            background: 'var(--tint-mor)',
            maskImage: 'radial-gradient(circle at 50% 55%, var(--text) 55%, transparent 80%)',
          }}
        >
          <svg viewBox="-100 -100 200 200" preserveAspectRatio="xMidYMid meet" className="absolute left-1/2 top-[55%] h-[88svh] w-[68svh] max-w-[90vw] -translate-x-1/2 -translate-y-1/2">
            {PEACOCK_EYE.map((r) => (
              <ellipse key={r.token} cx="0" cy={r.dy * 100} rx={78 * r.rx} ry={100 * r.ry} style={{ fill: `var(${r.token})` }} />
            ))}
          </svg>
        </div>
      </div>
    </Section>
  );
}
