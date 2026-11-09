'use client';
import { useRef } from 'react';
import { Section, ranges } from './Section';
import { gsap, useGSAP, prefersReducedMotion } from '@/lib/gsap';
import { film } from '../state';

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
      // The eye overlay is only shown while Mor is the active chapter (its top at the top of the
      // viewport until Suits arrives), so its timeline is mapped to exactly that range and starts
      // and ends invisible: it swells from a point, fills the lens, then dissolves into Suits.
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
        <p data-mor-label className="label text-center text-gold-300">
          Mor Pankh · <span lang="hi">मोरपंख</span>
        </p>
      </div>
      <div className="pointer-events-none fixed inset-0 z-20 motion-reduce:hidden [[data-chapter-active]:not([data-chapter-active=mor])_&]:invisible">
        <div
          data-eye
          aria-hidden
          className="absolute inset-0 opacity-0"
          style={{
            transformOrigin: '50% 55%',
            transform: 'scale(0.04)',
            background:
              'radial-gradient(ellipse 34% 44% at 50% 55%, rgba(16,24,74,.95) 0%, rgba(22,58,120,.9) 20%, rgba(14,124,123,.75) 38%, rgba(70,110,40,.45) 52%, rgba(201,150,46,.35) 60%, rgba(7,6,10,0) 74%), #07060A',
            maskImage: 'radial-gradient(circle at 50% 55%, #000 55%, transparent 80%)',
          }}
        />
      </div>
    </Section>
  );
}
