'use client';
import { line, curveBasis } from 'd3-shape';
import { gsap, prefersReducedMotion } from './gsap';
import { playTick } from './sound';

const SVGNS = 'http://www.w3.org/2000/svg';

function visibleBagTarget() {
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
  const target = visibleBagTarget();
  if (!target) return;
  if (!from || prefersReducedMotion()) {
    requestAnimationFrame(() => bump(target));
    return;
  }
  const a = from.getBoundingClientRect();
  const b = target.getBoundingClientRect();
  const p0: [number, number] = [a.left + a.width / 2, a.top + a.height * 0.4];
  const p4: [number, number] = [b.left + b.width / 2, b.top + b.height / 2];
  const lift = Math.max(120, Math.abs(p4[0] - p0[0]) * 0.25);
  const top = Math.max(24, Math.min(p0[1], p4[1]) - lift);
  const pts: [number, number][] = [
    p0,
    [p0[0], p0[1] - lift * 0.4],
    [(p0[0] + p4[0]) / 2, top],
    [p4[0], top + (p4[1] - top) * 0.3],
    p4,
  ];
  const d = line().curve(curveBasis)(pts) ?? '';

  const svg = document.createElementNS(SVGNS, 'svg');
  svg.setAttribute('aria-hidden', 'true');
  svg.style.cssText = 'position:fixed;inset:0;width:100vw;height:100lvh;pointer-events:none;z-index:90;overflow:visible';
  svg.innerHTML = `<defs><linearGradient id="tg" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#8A6418"/><stop offset=".5" stop-color="#FFF1C1"/><stop offset="1" stop-color="#E9C46A"/></linearGradient></defs>`;
  const glow = document.createElementNS(SVGNS, 'path');
  glow.setAttribute('d', d);
  glow.setAttribute('fill', 'none');
  glow.setAttribute('stroke', 'rgba(233,196,106,.35)');
  glow.setAttribute('stroke-width', '7');
  glow.setAttribute('stroke-linecap', 'round');
  const path = document.createElementNS(SVGNS, 'path');
  path.setAttribute('d', d);
  path.setAttribute('fill', 'none');
  path.setAttribute('stroke', 'url(#tg)');
  path.setAttribute('stroke-width', '2');
  path.setAttribute('stroke-linecap', 'round');
  svg.append(glow, path);
  document.body.appendChild(svg);

  gsap
    .timeline({ onComplete: () => svg.remove() })
    .fromTo([glow, path], { drawSVG: '0% 0%' }, { drawSVG: '0% 100%', duration: 0.55, ease: 'power2.inOut' })
    .call(() => bump(target))
    .to([glow, path], { drawSVG: '100% 100%', duration: 0.35, ease: 'power2.in' })
    .to(svg, { opacity: 0, duration: 0.15 }, '<0.2');
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
    s.style.cssText = `position:absolute;left:0;top:0;width:${size}px;height:${size}px;border-radius:50%;background:${i % 3 ? '#E9C46A' : '#FFF1C1'};box-shadow:0 0 6px #E9C46A`;
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
