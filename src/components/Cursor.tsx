'use client';
import { useEffect, useRef } from 'react';
import { gsap } from '@/lib/gsap';

/**
 * Fine pointers only: a gold dot and ring that grows and labels itself by context
 * (data-cursor="View" | "Drag" | "Add"). Also gives [data-magnetic] elements a gentle pull.
 */
export function Cursor() {
  const dot = useRef<HTMLDivElement>(null);
  const ring = useRef<HTMLDivElement>(null);
  const label = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const fine = window.matchMedia('(hover: hover) and (pointer: fine)');
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (!fine.matches || reduce.matches || !dot.current || !ring.current) return;
    document.documentElement.dataset.customCursor = 'on';
    const d = dot.current, r = ring.current;
    gsap.set([d, r], { xPercent: -50, yPercent: -50, opacity: 0 });
    const dx = gsap.quickTo(d, 'x', { duration: 0.08, ease: 'power3' });
    const dy = gsap.quickTo(d, 'y', { duration: 0.08, ease: 'power3' });
    const rx = gsap.quickTo(r, 'x', { duration: 0.35, ease: 'power3' });
    const ry = gsap.quickTo(r, 'y', { duration: 0.35, ease: 'power3' });
    let current: string | null = null;
    let magnet: HTMLElement | null = null;

    const move = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return;
      gsap.to([d, r], { opacity: 1, duration: 0.2, overwrite: 'auto' });
      dx(e.clientX); dy(e.clientY); rx(e.clientX); ry(e.clientY);
      const t = e.target as HTMLElement;
      const host = t.closest<HTMLElement>('[data-cursor]');
      const next = host?.dataset.cursor ?? (t.closest('a,button,[role=button],input,label,select') ? '' : null);
      if (next !== current) {
        current = next;
        const big = next !== null;
        gsap.to(r, { scale: next ? 2.6 : big ? 1.5 : 1, duration: 0.3, ease: 'power3.out' });
        gsap.to(d, { scale: next ? 0 : 1, duration: 0.2 });
        if (label.current) {
          label.current.textContent = next ?? '';
          gsap.to(label.current, { opacity: next ? 1 : 0, duration: 0.2 });
        }
      }
      const m = t.closest<HTMLElement>('[data-magnetic]');
      if (m !== magnet) {
        if (magnet) gsap.to(magnet, { x: 0, y: 0, duration: 0.5, ease: 'elastic.out(1,0.4)' });
        magnet = m;
      }
      if (magnet) {
        const b = magnet.getBoundingClientRect();
        gsap.to(magnet, { x: (e.clientX - (b.left + b.width / 2)) * 0.25, y: (e.clientY - (b.top + b.height / 2)) * 0.3, duration: 0.3, ease: 'power3.out' });
      }
    };
    const leave = () => gsap.to([d, r], { opacity: 0, duration: 0.2 });
    window.addEventListener('pointermove', move, { passive: true });
    document.addEventListener('pointerleave', leave);
    return () => {
      window.removeEventListener('pointermove', move);
      document.removeEventListener('pointerleave', leave);
      delete document.documentElement.dataset.customCursor;
    };
  }, []);

  return (
    // Above every layer, the intro (z-110) included: the page hides the system pointer.
    <div aria-hidden className="pointer-events-none fixed left-0 top-0 z-[250] hidden [@media(hover:hover)_and_(pointer:fine)]:block">
      <div ref={dot} className="fixed left-0 top-0 h-1.5 w-1.5 rounded-full bg-gold-text opacity-0" />
      <div ref={ring} className="fixed left-0 top-0 grid h-9 w-9 place-items-center rounded-full border border-gold-text/70 opacity-0">
        <span ref={label} className="text-[5px] font-semibold uppercase tracking-[0.2em] text-gold-text opacity-0" />
      </div>
    </div>
  );
}
