'use client';
import { useRef } from 'react';
import { Section } from './Section';
import { brand } from '@/brand.config';
import { RajasthanMap, MAP_CREDIT } from '@/components/visit/RajasthanMap';
import { StoreCard } from '@/components/visit/StoreCard';
import { mapTimeline } from '@/components/visit/VisitView';
import { ScrollTrigger, prefersReducedMotion } from '@/lib/gsap';

/** The thread draws Rajasthan, districts fade in, the view zooms to Banswara and a pin drops. */
export function Visit() {
  const root = useRef<HTMLElement>(null);
  const svg = useRef<SVGSVGElement>(null);
  const ready = () => {
    if (!svg.current || !root.current) return;
    const tl = mapTimeline(svg.current, { paused: true });
    if (!tl) return;
    if (prefersReducedMotion()) return void tl.progress(1);
    ScrollTrigger.create({
      trigger: root.current,
      start: 'top 70%',
      end: 'bottom bottom',
      scrub: 1,
      animation: tl,
    });
    ScrollTrigger.refresh();
  };
  return (
    <Section index={9} ref={root} label="Visit us in Banswara" className="!h-auto min-h-[var(--m)] md:min-h-[var(--d)]">
      <div className="sticky top-0 mx-auto grid min-h-svh max-w-[1500px] items-center gap-8 px-5 py-[12svh] md:grid-cols-[1.15fr_1fr] md:px-12">
        <figure>
          <RajasthanMap ref={svg} onReady={ready} className="mx-auto w-full max-w-[600px]" />
          <figcaption className="mt-2 text-center text-[10px] text-ivory-dim/60">{MAP_CREDIT}</figcaption>
        </figure>
        <div>
          <h2 className="font-display text-[clamp(2.2rem,5.5vw,5.5rem)] leading-[0.98] text-gold">{brand.copy.visit.en}</h2>
          <p lang="hi" className="font-hindi-display mb-8 mt-3 text-xl text-ivory/80 md:text-2xl">{brand.copy.visit.hi}</p>
          <StoreCard />
        </div>
      </div>
    </Section>
  );
}
