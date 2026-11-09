'use client';
import { useRef } from 'react';
import { Section, ranges } from './Section';
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
      // The 3D feather sweeps across the lens over the whole pass.
      gsap.timeline({ scrollTrigger: { ...ranges.pass(el), scrub: 0.8 } }).fromTo(film.u.mor, { sweep: 0 }, { sweep: 1, ease: 'none', duration: 1 }, 0);
      // The chapter card rises with Mor's own band, between Sarees and Suits.
      gsap.fromTo('[data-mor-label]', { opacity: 0, y: 24 }, { opacity: 1, y: 0, ease: 'none', scrollTrigger: { trigger: el, start: 'top 85%', end: 'top 35%', scrub: true } });
      // The eye overlay only shows while Mor is the active chapter (its top at the top of the
      // viewport until Suits arrives), so its timeline maps to exactly that range and starts and
      // ends invisible: it swells from a point, fills the lens, then dissolves into Suits.
      gsap.timeline({ scrollTrigger: { trigger: el, start: 'top top', end: 'bottom top', scrub: true } })
        .fromTo('[data-eye]', { scale: 0.04 }, { scale: 1.9, ease: 'power2.in', duration: 0.66 }, 0.06)
        .fromTo('[data-eye]', { opacity: 0 }, { opacity: 1, ease: 'none', duration: 0.14 }, 0.06)
        .to('[data-eye]', { opacity: 0, scale: 2.3, ease: 'power1.in', duration: 0.28 }, 0.72);
    },
    { scope: root },
  );
  return (
    <Section index={4} ref={root} label="Mor pankh" className="overflow-x-clip">
      {/* In the band itself (not a fixed overlay), so it can never sit on another chapter's text. */}
      <div className="relative z-30 grid h-full place-items-center px-5">
        <p data-mor-label className="label text-halo text-center text-gold-text">
          Mor Pankh · <span lang="hi">मोरपंख</span>
        </p>
      </div>
      <div className="pointer-events-none fixed inset-0 z-20 motion-reduce:hidden [[data-chapter-active]:not([data-chapter-active=mor])_&]:invisible">
        {/* the same crisp eye as the coin face and the logo badge (peacock.ts) */}
        <div
          data-eye
          aria-hidden
          className="absolute inset-0 opacity-0"
          style={{
            transformOrigin: '50% 55%',
            transform: 'scale(0.04)',
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
