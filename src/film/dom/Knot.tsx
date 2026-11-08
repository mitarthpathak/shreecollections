'use client';
import { useEffect, useRef } from 'react';
import { Section } from './Section';
import { brand } from '@/brand.config';
import { gsap, ScrollTrigger, useGSAP, prefersReducedMotion } from '@/lib/gsap';
import { film } from '../state';
import { FooterContent } from '@/components/Footer';

/**
 * The knot: the thread ties off and coils back into the badge ring; a giant gold श्री; then the footer.
 * The chapter is exactly one screen tall (its stage never spills into the footer), and as the
 * footer scrolls in, the 3D view rises with the page (film.footerRise) instead of staying put under it.
 */
export function KnotChapter() {
  const root = useRef<HTMLElement>(null);
  const foot = useRef<HTMLElement>(null);
  useGSAP(
    () => {
      const el = root.current!;
      ScrollTrigger.create({
        trigger: foot.current,
        start: 'top bottom',
        end: 'bottom bottom',
        onUpdate: (self) => void (film.footerRise = self.progress * (self.end - self.start)),
        onRefresh: (self) => void (film.footerRise = self.progress * (self.end - self.start)),
      });
      if (prefersReducedMotion()) return;
      gsap.timeline({ scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom bottom', scrub: 1 } })
        .fromTo(film.u.knot, { tie: 0 }, { tie: 1, ease: 'power2.inOut', duration: 1 }, 0)
        .fromTo(film.u.knot, { shri: 0 }, { shri: 1, ease: 'expo.out', duration: 0.7 }, 0.3)
        .from('[data-signoff]', { opacity: 0, y: 30, duration: 0.4 }, 0.6);
    },
    { scope: root },
  );
  useEffect(() => () => void (film.footerRise = 0), []);
  return (
    <>
      <Section index={10} ref={root} label="The knot">
        <div className="sticky top-0 grid h-svh place-items-center">
          <p data-signoff className="absolute bottom-[calc(var(--tabbar-h)+var(--safe-b)+2rem)] whitespace-nowrap font-editorial text-2xl font-medium italic text-gold-text sm:text-3xl md:bottom-12 short:bottom-[calc(var(--tabbar-h)+var(--safe-b)+0.75rem)] md:short:bottom-4">
            {brand.signOff}
          </p>
        </div>
      </Section>
      <footer ref={foot} className="relative z-10 border-t border-divider bg-bg/80 pb-tabbar">
        <FooterContent />
      </footer>
    </>
  );
}
