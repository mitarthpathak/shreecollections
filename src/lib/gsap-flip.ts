'use client';
import { Flip } from 'gsap/Flip';
import { gsap } from './gsap';

if (typeof window !== 'undefined') gsap.registerPlugin(Flip);

export { Flip };
