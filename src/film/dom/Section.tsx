'use client';
import { forwardRef } from 'react';
import { CHAPTERS } from '../chapters';

/** A chapter's DOM section; its scroll length comes from the registry (svh, desktop / mobile). */
export const Section = forwardRef<HTMLElement, { index: number; className?: string; children: React.ReactNode; label?: string }>(
  function Section({ index, className = '', children, label }, ref) {
    const c = CHAPTERS[index];
    return (
      <section
        ref={ref}
        id={`ch-${c.id}`}
        data-chapter={c.id}
        aria-label={label ?? c.label}
        className={`relative h-[var(--m)] md:h-[var(--d)] ${className}`}
        style={{ ['--d' as string]: `${c.span.d}svh`, ['--m' as string]: `${c.span.m}svh` }}
      >
        {children}
      </section>
    );
  },
);

/** ScrollTrigger ranges shared by every chapter. */
export const ranges = {
  /** while the section's sticky stage is pinned */
  pin: (el: Element) => ({
    trigger: el,
    start: 'top top',
    end: () => ((el as HTMLElement).offsetHeight > window.innerHeight + 2 ? 'bottom bottom' : 'bottom top'),
    scrub: 1,
    invalidateOnRefresh: true,
  }),
  /** as the section scrolls in from below */
  enter: (el: Element) => ({ trigger: el, start: 'top bottom', end: 'top top', scrub: 1 }),
  /** the whole pass: from the section entering to it leaving */
  pass: (el: Element) => ({ trigger: el, start: 'top bottom', end: 'bottom top', scrub: 1, invalidateOnRefresh: true }),
  /** as the section scrolls away */
  exit: (el: Element) => ({ trigger: el, start: 'bottom bottom', end: 'bottom top', scrub: 1 }),
};
