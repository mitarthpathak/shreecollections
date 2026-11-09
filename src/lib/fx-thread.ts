'use client';
import { line, curveBasis } from 'd3-shape';
import { gsap, prefersReducedMotion } from './gsap';
import './gsap-draw';
import { bump, visibleBagTarget } from './fx';

const SVGNS = 'http://www.w3.org/2000/svg';

/** The gold thread from the product image to the bag icon (loaded on the first add to bag). */
export function drawThread(from: Element | null) {
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
  svg.innerHTML = `<defs><linearGradient id="tg" x1="0" y1="0" x2="1" y2="0"><stop offset="0" style="stop-color:var(--metal-lo)"/><stop offset=".5" style="stop-color:var(--metal-hi)"/><stop offset="1" style="stop-color:var(--metal)"/></linearGradient></defs>`;
  const glow = document.createElementNS(SVGNS, 'path');
  glow.setAttribute('d', d);
  glow.setAttribute('fill', 'none');
  glow.style.stroke = 'color-mix(in srgb, var(--metal) 35%, transparent)';
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
