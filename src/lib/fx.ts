'use client';
import { gsap, prefersReducedMotion } from './gsap';
import { playTick } from './sound';

export function visibleBagTarget() {
  return [...document.querySelectorAll<HTMLElement>('[data-bag-target]')].find((el) => {
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden';
  });
}

export function bump(target: Element) {
  gsap.fromTo(target, { scale: 1 }, { scale: 1.2, duration: 0.14, yoyo: true, repeat: 1, ease: 'power2.out', overwrite: true });
  const c = target.querySelector('[data-count]');
  if (c) gsap.fromTo(c, { rotateX: -180 }, { rotateX: 0, duration: 0.55, ease: 'back.out(2.2)' });
}

/** Add to bag: a gold thread arcs from the product image to the bag icon, which bumps. */
export function threadToBag(from: Element | null) {
  playTick();
  if (/Android/i.test(navigator.userAgent)) navigator.vibrate?.(10);
  // The drawing (d3-shape, DrawSVG) loads on the first add, not with the page.
  import('./fx-thread').then((m) => m.drawThread(from));
}

/** Wishlist: a tiny burst of gold dust from the heart. */
export function goldBurst(from: Element) {
  if (prefersReducedMotion()) return;
  const r = from.getBoundingClientRect();
  const layer = document.createElement('div');
  layer.setAttribute('aria-hidden', 'true');
  layer.style.cssText = `position:fixed;left:${r.left + r.width / 2}px;top:${r.top + r.height / 2}px;width:0;height:0;pointer-events:none;z-index:90`;
  const dots: HTMLSpanElement[] = [];
  for (let i = 0; i < 12; i++) {
    const s = document.createElement('span');
    const size = 2 + Math.random() * 3;
    s.style.cssText = `position:absolute;left:0;top:0;width:${size}px;height:${size}px;border-radius:50%;background:${i % 3 ? 'var(--metal)' : 'var(--metal-hi)'};box-shadow:0 0 6px var(--metal)`;
    layer.appendChild(s);
    dots.push(s);
  }
  document.body.appendChild(layer);
  gsap.to(dots, {
    x: () => (Math.random() - 0.5) * 70,
    y: () => (Math.random() - 0.7) * 70,
    opacity: 0,
    scale: 0.4,
    duration: () => 0.5 + Math.random() * 0.35,
    ease: 'power2.out',
    onComplete: () => layer.remove(),
  });
}
