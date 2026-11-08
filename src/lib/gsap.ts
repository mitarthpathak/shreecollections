'use client';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import { DrawSVGPlugin } from 'gsap/DrawSVGPlugin';
import { Flip } from 'gsap/Flip';
import { CustomEase } from 'gsap/CustomEase';
import { useGSAP } from '@gsap/react';

let registered = false;
if (typeof window !== 'undefined' && !registered) {
  gsap.registerPlugin(ScrollTrigger, SplitText, DrawSVGPlugin, Flip, CustomEase, useGSAP);
  ScrollTrigger.config({ ignoreMobileResize: true });
  // The one named ease for every fabric move: a slow lift, a long weightless settle.
  CustomEase.create('silk', 'M0,0 C0.18,0 0.24,0.42 0.42,0.72 0.58,0.96 0.74,1 1,1');
  gsap.defaults({ ease: 'power2.out', duration: 0.35 });
  registered = true;
}

export { gsap, ScrollTrigger, SplitText, DrawSVGPlugin, Flip, CustomEase, useGSAP };

export const EASE = {
  reveal: 'expo.out',
  camera: 'power3.inOut',
  ui: 'power2.out',
  silk: 'silk',
} as const;

export const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
