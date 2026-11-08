'use client';
import { useCallback, useRef, useState } from 'react';
import { Accent } from '@/components/Accent';
import { Section } from './Section';
import { brand } from '@/brand.config';
import { RajasthanMap, MAP_CREDIT } from '@/components/visit/RajasthanMap';
import { StoreCard } from '@/components/visit/StoreCard';
import { mapAtRest, mapPulse, mapTimeline } from '@/components/visit/VisitView';
import { ScrollTrigger, useGSAP, prefersReducedMotion } from '@/lib/gsap';

/** The thread draws Rajasthan, districts fade in, the view zooms to Banswara and a pin drops. */
export function Visit() {
  const root = useRef<HTMLElement>(null);
  const svg = useRef<SVGSVGElement>(null);
  const [mapReady, setMapReady] = useState(false);
  const onReady = useCallback(() => setMapReady(true), []);
  // Built inside the component's GSAP context once the map's paths exist, so the trigger, the
  // timeline and the pulse die with the film. (Created outside a context they leaked a full
  // detached copy of the film on every visit to the home page.)
  useGSAP(
    () => {
      const el = root.current, s = svg.current;
      if (!mapReady || !el || !s) return;
      const tl = mapTimeline(s, { paused: true });
      if (!tl) return;
      if (prefersReducedMotion()) return mapAtRest(s, tl);
      ScrollTrigger.create({ trigger: el, start: 'top 70%', end: 'bottom bottom', scrub: 1, animation: tl });
      // the pulse loops only while the chapter is on screen
      const pulse = mapPulse(s);
      if (pulse) ScrollTrigger.create({ trigger: el, start: 'top bottom', end: 'bottom top', onToggle: (self) => void pulse.paused(!self.isActive) });
      ScrollTrigger.refresh();
    },
    { scope: root, dependencies: [mapReady] },
  );
  return (
    <Section index={9} ref={root} label="Visit us in Banswara" className="!h-auto min-h-[var(--m)] md:min-h-[var(--d)]">
      <div className="sticky top-0 mx-auto grid min-h-svh max-w-[1500px] items-center gap-8 px-5 py-[12svh] md:grid-cols-[1.15fr_1fr] md:px-12">
        <figure>
          <RajasthanMap ref={svg} onReady={onReady} className="mx-auto w-full max-w-[600px]" />
          <figcaption className="mt-2 text-center text-xs text-fg-muted">{MAP_CREDIT}</figcaption>
        </figure>
        <div>
          <h2 className="font-editorial font-medium text-[clamp(2.2rem,5.5vw,5.5rem)] leading-[0.98] text-fg"><Accent text={brand.copy.visit.en} word="Banswara" /></h2>
          <p lang="hi" className="font-hindi-display mb-8 mt-3 text-xl text-fg/80 md:text-2xl">{brand.copy.visit.hi}</p>
          <StoreCard />
        </div>
      </div>
    </Section>
  );
}
