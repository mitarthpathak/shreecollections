'use client';
import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { gsap, prefersReducedMotion } from '@/lib/gsap';

/**
 * The gold thread that sweeps across on page changes. Browsers with the View Transitions
 * API animate the `.vt-thread` snapshot from CSS; everyone else gets this GSAP fallback.
 */
export function RouteCurtain() {
  const pathname = usePathname();
  const first = useRef(true);
  const curtain = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if ('startViewTransition' in document || prefersReducedMotion() || !curtain.current) return;
    const c = curtain.current;
    gsap.timeline()
      .set(c, { autoAlpha: 1, xPercent: -100 })
      .to(c, { xPercent: 100, duration: 0.8, ease: 'power3.inOut' })
      .set(c, { autoAlpha: 0 });
  }, [pathname]);

  return (
    <>
      <div className="vt-thread" aria-hidden />
      <div ref={curtain} aria-hidden className="pointer-events-none invisible fixed inset-0 z-[100]">
        <div className="absolute inset-y-0 right-0 w-full bg-gradient-to-r from-transparent via-bg/70 to-bg" />
        <div className="absolute inset-y-0 right-0 w-[3px] bg-gold-text shadow-[0_0_18px_2px_color-mix(in_srgb,var(--metal)_65%,transparent)]" />
      </div>
    </>
  );
}
