'use client';
/**
 * One clock. gsap.ticker drives Lenis, ScrollTrigger and (on the home page) R3F's
 * advance(), so DOM, scroll and WebGL all update in the same frame.
 */
import Lenis from 'lenis';
import { gsap, ScrollTrigger, prefersReducedMotion } from './gsap';

type FrameCb = (timeMs: number, deltaMs: number) => void;

let lenis: Lenis | null = null;
const callbacks = new Set<FrameCb>();

function tick(time: number, deltaTime: number) {
  const ms = time * 1000;
  lenis?.raf(ms);
  callbacks.forEach((cb) => cb(ms, deltaTime));
}

export function startClock() {
  if (typeof window === 'undefined' || lenis) return lenis;
  lenis = new Lenis({
    lerp: 0.09,
    smoothWheel: !prefersReducedMotion(),
    syncTouch: false, // keep native iOS / Android momentum
    autoRaf: false,
    anchors: true,
  });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add(tick);
  gsap.ticker.lagSmoothing(0);
  return lenis;
}

export const getLenis = () => lenis;

/** Run a callback inside the shared ticker. Returns an unsubscribe. */
export function onFrame(cb: FrameCb) {
  callbacks.add(cb);
  return () => {
    callbacks.delete(cb);
  };
}

export function scrollToTop(immediate = true) {
  if (lenis) lenis.scrollTo(0, { immediate, force: true });
  else window.scrollTo(0, 0);
}

export function lockScroll(lock: boolean) {
  if (lenis) {
    if (lock) lenis.stop();
    else lenis.start();
  }
  document.documentElement.style.overflow = lock ? 'hidden' : '';
}
