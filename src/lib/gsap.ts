'use client';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';

/*
 * The GSAP core every page needs at first paint: gsap, ScrollTrigger (driven by Lenis in
 * lib/clock) and useGSAP. Plugins live in their own modules and are imported only where they
 * are used, so they stay out of the first load:
 *   gsap-flip (Flip) · gsap-draw (DrawSVG) · gsap-split (SplitText) · gsap-silk (the 'silk' ease)
 */
let registered = false;
if (typeof window !== 'undefined' && !registered) {
  gsap.registerPlugin(ScrollTrigger, useGSAP);
  ScrollTrigger.config({ ignoreMobileResize: true });
  gsap.defaults({ ease: 'power2.out', duration: 0.35 });
  registered = true;
}

export { gsap, ScrollTrigger, useGSAP };

export const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
