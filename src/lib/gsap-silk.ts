'use client';
import { CustomEase } from 'gsap/CustomEase';
import { gsap } from './gsap';

/** The one named ease for every fabric move: a slow lift, a long weightless settle. Import before using ease: 'silk'. */
if (typeof window !== 'undefined') {
  gsap.registerPlugin(CustomEase);
  if (!CustomEase.get('silk')) CustomEase.create('silk', 'M0,0 C0.18,0 0.24,0.42 0.42,0.72 0.58,0.96 0.74,1 1,1');
}

export const SILK = 'silk';
