'use client';
import { DrawSVGPlugin } from 'gsap/DrawSVGPlugin';
import { gsap } from './gsap';

/** Import (or `await import()`) before tweening `drawSVG`. */
if (typeof window !== 'undefined') gsap.registerPlugin(DrawSVGPlugin);

export { DrawSVGPlugin };
