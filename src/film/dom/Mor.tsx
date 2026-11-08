'use client';
import { useRef } from 'react';
import { Section } from './Section';
import { gsap, useGSAP, prefersReducedMotion } from '@/lib/gsap';
import { film } from '../state';

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
        <p data-mor-label className="label text-gold-300 opacity-0 motion-reduce:opacity-100">
          Mor Pankh · <span lang="hi">मोरपंख</span>
        </p>
        <div
          data-eye
          aria-hidden
          className="absolute inset-0 opacity-0"
          style={{
            clipPath: 'circle(0% at 50% 55%)',
            background:
              'radial-gradient(ellipse 40% 50% at 50% 55%, #141E5C 0%, #1B3F8C 22%, #0E7C7B 44%, #6B8F2A 62%, #C9962E 72%, #07060A 92%)',
          }}
        />
      </div>
    </Section>
  );
}
