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

/*
 * Scroll lock. Every overlay takes its own hold, and the page stays still while any hold is
 * open, so one overlay closing never unlocks the page under another. The state lives here,
 * not in Lenis: a hold taken before startClock() is applied when Lenis is created.
 */
const holds = new Set<symbol>();
/** Holds taken with lockScroll(true); lockScroll(false) releases all of them. */
const switchHolds = new Set<symbol>();

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
  // A hold taken before the clock started (the preloader mounts first) applies now.
  if (holds.size) lenis.stop();
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

function applyScrollLock() {
  const locked = holds.size > 0;
  if (lenis) {
    if (locked) lenis.stop();
    else lenis.start();
  }
  if (typeof document !== 'undefined') document.documentElement.style.overflow = locked ? 'hidden' : '';
}

function take(fromSwitch: boolean) {
  const hold = Symbol('scroll-hold');
  holds.add(hold);
  if (fromSwitch) switchHolds.add(hold);
  applyScrollLock();
  return () => {
    switchHolds.delete(hold);
    if (holds.delete(hold)) applyScrollLock();
  };
}

/**
 * Lock page scroll until the returned release() is called. release() is idempotent: call it
 * when the overlay closes and again from the effect cleanup, so an overlay that unmounts
 * while open (navigation, Back) can never leave the page locked.
 */
export function holdScroll(): () => void {
  return take(false);
}

/**
 * On/off form: lockScroll(true) takes a hold (and returns its release), lockScroll(false)
 * releases every hold taken with lockScroll(true) — and only those, never a holdScroll() hold.
 * Calling lockScroll(false) twice, or on unmount after a close, is safe. These holds don't
 * outlive the page: Providers calls lockScroll(false) on every route change.
 */
export function lockScroll(lock: boolean): () => void {
  if (lock) return take(true);
  if (switchHolds.size) {
    switchHolds.forEach((h) => holds.delete(h));
    switchHolds.clear();
    applyScrollLock();
  }
  return () => {};
}

