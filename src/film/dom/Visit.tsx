'use client';
import { useCallback, useRef, useState } from 'react';
import { Section } from './Section';
import { brand } from '@/brand.config';
import { RajasthanMap, MAP_CREDIT } from '@/components/visit/RajasthanMap';
import { StoreCard } from '@/components/visit/StoreCard';
import { mapTimeline, mapPulse, mapAtRest } from '@/components/visit/VisitView';
import { gsap, ScrollTrigger, useGSAP, prefersReducedMotion } from '@/lib/gsap';

/** The thread draws Rajasthan, districts fade in, the view zooms to Banswara and a pin drops. */
export function Visit() {
  const root = useRef<HTMLElement>(null);
  const svg = useRef<SVGSVGElement>(null);
  const [mapReady, setMapReady] = useState(false);
  const onReady = useCallback(() => setMapReady(true), []);

  // Built once the map's paths exist, inside the component's GSAP context, so the trigger,
  // the timeline and the pulse are all killed when the film unmounts.
  useGSAP(
    () => {
      const el = root.current;
      const s = svg.current;
      if (!mapReady || !el || !s) return;
      if (prefersReducedMotion()) {
        const tl = mapTimeline(s, { paused: true });
        return void (tl && mapAtRest(s, tl));
      }
      // Scrub the choreography while the map is in view. Desktop: the stage is sticky, so the
      // whole pass works. Phones: the chapter is taller than the screen and the map scrolls
      // away under the copy, so finish by the time the map reaches the header.
      gsap.matchMedia().add({ desktop: '(min-width: 768px)', phone: '(max-width: 767px)' }, (ctx) => {
        const tl = mapTimeline(s, { paused: true });
        if (!tl) return;
        const phone = ctx.conditions?.phone;
        ScrollTrigger.create({
          trigger: phone ? s : el,
          start: phone ? 'top 85%' : 'top 55%',
          end: phone ? 'top 15%' : 'bottom bottom',
          scrub: 1,
          animation: tl,
        });
      });
      // The pin's pulse loops on its own clock, only while the chapter is on screen
      // (the pin itself stays hidden until the scrubbed timeline drops it).
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
          <figcaption className="mt-2 text-center text-xs text-ivory-dim">{MAP_CREDIT}</figcaption>
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
