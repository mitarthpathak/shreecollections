'use client';
import { useRef } from 'react';
import { Section } from './Section';
import { brand } from '@/brand.config';
import { gsap, useGSAP, prefersReducedMotion } from '@/lib/gsap';
import { film } from '../state';
import { FooterContent } from '@/components/Footer';

/** The knot: the thread ties off and coils back into the badge ring; a giant gold श्री; then the footer. */
export function KnotChapter() {
  const root = useRef<HTMLElement>(null);
  useGSAP(
    () => {
      const el = root.current!;
      if (prefersReducedMotion()) return;
      gsap.timeline({ scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom bottom', scrub: 1 } })
        .fromTo(film.u.knot, { tie: 0 }, { tie: 1, ease: 'power2.inOut', duration: 1 }, 0)
        .fromTo(film.u.knot, { shri: 0 }, { shri: 1, ease: 'expo.out', duration: 0.7 }, 0.3)
        .from('[data-signoff]', { opacity: 0, y: 30, duration: 0.4 }, 0.6);
    },
    { scope: root },
  );
  return (
    <>
      <Section index={10} ref={root} label="The knot">
        <div className="sticky top-0 grid h-svh place-items-center">
          <p data-signoff className="absolute bottom-[calc(var(--tabbar-h)+var(--safe-b)+2rem)] font-display text-xl tracking-[0.3em] text-gold-300 md:bottom-12">
            {brand.signOff.toUpperCase()}
          </p>
        </div>
      </Section>
      <footer className="relative z-10 border-t border-gold-700/30 bg-raat/80 pb-tabbar">
        <FooterContent />
      </footer>
    </>
  );
}
