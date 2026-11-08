'use client';
import { useRef } from 'react';
import { RajasthanMap, MAP_CREDIT } from './RajasthanMap';
import { StoreCard } from './StoreCard';
import { gsap, prefersReducedMotion } from '@/lib/gsap';

/** Builds the map choreography: thread draws Rajasthan, districts fade in, zoom to Banswara, pin drops. */
export function mapTimeline(svg: SVGSVGElement, opts: { paused?: boolean } = {}) {
  const zoom = svg.querySelector<SVGGElement>('[data-map-zoom]');
  if (!zoom) return null;
  const cx = Number(zoom.dataset.cx), cy = Number(zoom.dataset.cy), w = Number(zoom.dataset.w), h = Number(zoom.dataset.h);
  const k = 2.4;
  const tl = gsap.timeline({ paused: opts.paused });
  tl.set(svg.querySelectorAll('[data-district]'), { opacity: 0 })
    .set(svg.querySelector('[data-banswara]'), { opacity: 0 })
    .set(svg.querySelector('[data-pin]'), { opacity: 0 })
    .fromTo(svg.querySelector('[data-map-outline]'), { drawSVG: '0%' }, { drawSVG: '100%', duration: 1.6, ease: 'power2.inOut' })
    .to(svg.querySelectorAll('[data-district]'), { opacity: 1, duration: 0.6, stagger: { each: 0.015, from: 'random' } }, '-=0.4')
    .to(zoom, { x: w / 2 - cx * k, y: h * 0.55 - cy * k, scale: k, duration: 1.4, ease: 'power3.inOut' }, '+=0.1')
    .to(svg.querySelector('[data-banswara]'), { opacity: 1, duration: 0.5 }, '-=0.6')
    .fromTo(svg.querySelector('[data-pin]'), { opacity: 0 }, { opacity: 1, duration: 0.01 }, '-=0.2')
    .fromTo(svg.querySelector('[data-pin-head]'), { y: -60, scale: 1 / k }, { y: 0, scale: 1 / k, duration: 0.6, ease: 'bounce.out' }, '<')
    .fromTo(svg.querySelector('[data-pulse]'), { scale: 0.4, opacity: 1, transformOrigin: '50% 50%' }, { scale: 1.6 / k, opacity: 0, duration: 1.2, repeat: -1, ease: 'power1.out' }, '<0.3');
  return tl;
}

export function VisitView() {
  const svg = useRef<SVGSVGElement>(null);
  const ready = () => {
    if (!svg.current) return;
    const tl = mapTimeline(svg.current);
    if (prefersReducedMotion()) tl?.progress(1).pause();
  };
  return (
    <div className="mx-auto grid max-w-[1400px] items-center gap-10 px-4 pb-20 md:px-8 lg:grid-cols-[1.2fr_1fr]">
      <figure>
        <RajasthanMap ref={svg} onReady={ready} className="mx-auto w-full max-w-[640px]" />
        <figcaption className="mt-3 text-center text-[10px] leading-relaxed text-ivory-dim/60">{MAP_CREDIT}</figcaption>
      </figure>
      <StoreCard />
    </div>
  );
}
