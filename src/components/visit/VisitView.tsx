'use client';
import { useCallback, useRef, useState } from 'react';
import { RajasthanMap, MAP_CREDIT } from './RajasthanMap';
import { StoreCard } from './StoreCard';
import { gsap, useGSAP, prefersReducedMotion } from '@/lib/gsap';

const K = 2.4;

/**
 * The map choreography: thread draws Rajasthan, districts fade in, zoom to Banswara, pin drops.
 * Finite, so it can be scrubbed; the pin's endless pulse is a separate tween (mapPulse). Create
 * both inside useGSAP / a gsap.context so they die with the component.
 */
export function mapTimeline(svg: SVGSVGElement, opts: { paused?: boolean } = {}) {
  const zoom = svg.querySelector<SVGGElement>('[data-map-zoom]');
  if (!zoom) return null;
  const cx = Number(zoom.dataset.cx), cy = Number(zoom.dataset.cy), w = Number(zoom.dataset.w), h = Number(zoom.dataset.h);
  const tl = gsap.timeline({ paused: opts.paused });
  tl.set(svg.querySelectorAll('[data-district]'), { opacity: 0 })
    .set(svg.querySelector('[data-banswara]'), { opacity: 0 })
    .set(svg.querySelector('[data-pin]'), { opacity: 0 })
    .fromTo(svg.querySelector('[data-map-outline]'), { drawSVG: '0%' }, { drawSVG: '100%', duration: 1.6, ease: 'power2.inOut' })
    .to(svg.querySelectorAll('[data-district]'), { opacity: 1, duration: 0.6, stagger: { each: 0.015, from: 'random' } }, '-=0.4')
    .to(zoom, { x: w / 2 - cx * K, y: h * 0.55 - cy * K, scale: K, duration: 1.4, ease: 'power3.inOut' }, '+=0.1')
    .to(svg.querySelector('[data-banswara]'), { opacity: 1, duration: 0.5 }, '-=0.6')
    .fromTo(svg.querySelector('[data-pin]'), { opacity: 0 }, { opacity: 1, duration: 0.01 }, '-=0.2')
    .fromTo(svg.querySelector('[data-pin-head]'), { y: -60, scale: 1 / K }, { y: 0, scale: 1 / K, duration: 0.6, ease: 'bounce.out' }, '<');
  return tl;
}

/** The pin's pulse: an endless loop kept out of the scrubbed timeline (it would make it infinite). */
export function mapPulse(svg: SVGSVGElement) {
  const ring = svg.querySelector('[data-pulse]');
  if (!ring) return null;
  return gsap.fromTo(ring, { scale: 0.4, opacity: 1, transformOrigin: '50% 50%' }, { scale: 1.6 / K, opacity: 0, duration: 1.2, repeat: -1, ease: 'power1.out', paused: true });
}

/** Reduced motion: the finished map, the pulse as a still ring. */
export function mapAtRest(svg: SVGSVGElement, tl: gsap.core.Timeline) {
  tl.progress(1).pause();
  const ring = svg.querySelector('[data-pulse]');
  if (ring) gsap.set(ring, { scale: 1 / K, opacity: 0.6, transformOrigin: '50% 50%' });
}

export function VisitView() {
  const root = useRef<HTMLDivElement>(null);
  const svg = useRef<SVGSVGElement>(null);
  const [mapReady, setMapReady] = useState(false);
  const onReady = useCallback(() => setMapReady(true), []);
  useGSAP(
    () => {
      const s = svg.current;
      if (!mapReady || !s) return;
      const tl = mapTimeline(s);
      if (!tl) return;
      if (prefersReducedMotion()) return mapAtRest(s, tl);
      const pulse = mapPulse(s);
      tl.call(() => void pulse?.play(0), undefined, '-=0.3');
    },
    { scope: root, dependencies: [mapReady] },
  );
  return (
    <div ref={root} className="mx-auto grid max-w-[1400px] items-center gap-10 px-4 pb-20 md:px-8 lg:grid-cols-[1.2fr_1fr]">
      <figure>
        <RajasthanMap ref={svg} onReady={onReady} className="mx-auto w-full max-w-[640px]" />
        <figcaption className="mt-3 text-center text-xs leading-relaxed text-fg-muted">{MAP_CREDIT}</figcaption>
      </figure>
      <StoreCard headingLevel={2} />
    </div>
  );
}
