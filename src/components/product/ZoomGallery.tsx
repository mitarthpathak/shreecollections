'use client';
import Image from 'next/image';
import { useEffect, useRef, useState, ViewTransition } from 'react';
import { IconClose, IconExpand } from '../icons';
import { gsap } from '@/lib/gsap';
import { lockScroll } from '@/lib/clock';

/** Pinch / drag / double-tap zoom inside the fullscreen viewer. */
function Zoomable({ src, alt }: { src: string; alt: string }) {
  const box = useRef<HTMLDivElement>(null);
  const img = useRef<HTMLDivElement>(null);
  const s = useRef({ scale: 1, x: 0, y: 0 });
  const pts = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<{ d: number; scale: number } | null>(null);
  const lastTap = useRef(0);

  const apply = (anim = false) => {
    const { scale, x, y } = s.current;
    gsap.to(img.current, { scale, x, y, duration: anim ? 0.35 : 0, ease: 'power2.out', overwrite: true });
  };
  const clampPan = () => {
    const b = box.current!.getBoundingClientRect();
    const mx = ((s.current.scale - 1) * b.width) / 2;
    const my = ((s.current.scale - 1) * b.height) / 2;
    s.current.x = Math.max(-mx, Math.min(mx, s.current.x));
    s.current.y = Math.max(-my, Math.min(my, s.current.y));
  };

  return (
    <div
      ref={box}
      className="relative h-full w-full touch-none overflow-hidden"
      data-cursor="Drag"
      onPointerDown={(e) => {
        (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
        pts.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (pts.current.size === 2) {
          const [a, b] = [...pts.current.values()];
          pinch.current = { d: Math.hypot(a.x - b.x, a.y - b.y), scale: s.current.scale };
        }
        const now = performance.now();
        if (now - lastTap.current < 280) {
          s.current = s.current.scale > 1 ? { scale: 1, x: 0, y: 0 } : { scale: 2.4, x: 0, y: 0 };
          apply(true);
        }
        lastTap.current = now;
      }}
      onPointerMove={(e) => {
        const prev = pts.current.get(e.pointerId);
        if (!prev) return;
        pts.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (pts.current.size === 2 && pinch.current) {
          const [a, b] = [...pts.current.values()];
          s.current.scale = Math.max(1, Math.min(4, (pinch.current.scale * Math.hypot(a.x - b.x, a.y - b.y)) / pinch.current.d));
        } else if (s.current.scale > 1) {
          s.current.x += e.clientX - prev.x;
          s.current.y += e.clientY - prev.y;
        }
        clampPan();
        apply();
      }}
      onPointerUp={(e) => {
        pts.current.delete(e.pointerId);
        if (pts.current.size < 2) pinch.current = null;
      }}
      onPointerCancel={(e) => pts.current.delete(e.pointerId)}
      onWheel={(e) => {
        s.current.scale = Math.max(1, Math.min(4, s.current.scale * (e.deltaY < 0 ? 1.12 : 0.9)));
        if (s.current.scale === 1) s.current.x = s.current.y = 0;
        clampPan();
        apply(true);
      }}
    >
      <div ref={img} className="h-full w-full will-change-transform">
        <Image src={src} alt={alt} fill sizes="100vw" quality={80} className="object-contain" draggable={false} />
      </div>
    </div>
  );
}

export function ZoomGallery({ images, alt, slug }: { images: string[]; alt: string; slug: string }) {
  const [active, setActive] = useState(0);
  const [full, setFull] = useState(false);
  const strip = useRef<HTMLDivElement>(null);
  const viewer = useRef<HTMLDivElement>(null);

  // Keep the dots in sync with native swipe.
  useEffect(() => {
    const el = strip.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => entries.forEach((en) => en.isIntersecting && setActive(Number((en.target as HTMLElement).dataset.i))),
      { root: el, threshold: 0.6 },
    );
    el.querySelectorAll('[data-i]').forEach((n) => io.observe(n));
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    const v = viewer.current;
    if (!v) return;
    if (full) {
      lockScroll(true);
      v.style.visibility = 'visible';
      gsap.fromTo(v, { opacity: 0 }, { opacity: 1, duration: 0.3 });
      v.focus();
    } else if (v.style.visibility === 'visible') {
      lockScroll(false);
      gsap.to(v, { opacity: 0, duration: 0.2, onComplete: () => void (v.style.visibility = 'hidden') });
    }
  }, [full]);

  const go = (i: number) => {
    setActive(i);
    strip.current?.children[i]?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  };

  return (
    <div className="md:grid md:grid-cols-[84px_1fr] md:gap-4">
      <div className="hidden flex-col gap-3 md:flex">
        {images.map((src, i) => (
          <button
            key={src}
            type="button"
            onClick={() => go(i)}
            aria-label={`Image ${i + 1}`}
            aria-current={active === i}
            className="overflow-hidden rounded-xl ring-1 ring-gold-700/50 transition-shadow aria-[current=true]:ring-2 aria-[current=true]:ring-gold-300"
          >
            <Image src={src} alt="" width={84} height={112} className="h-28 w-[84px] object-cover" />
          </button>
        ))}
      </div>
      <div className="relative">
        <ViewTransition name={`img-${slug}`} share="morph" default="none">
          <div ref={strip} className="no-scrollbar flex aspect-[3/4] snap-x snap-mandatory overflow-x-auto rounded-[18px] bg-lacquer" data-lenis-prevent>
            {images.map((src, i) => (
              <button key={src} type="button" data-i={i} data-cursor="View" onClick={() => setFull(true)} className="relative h-full w-full shrink-0 snap-center" aria-label={`Open image ${i + 1} fullscreen`}>
                <Image src={src} alt={i === 0 ? alt : `${alt}, view ${i + 1}`} fill priority={i === 0} sizes="(min-width: 1024px) 45vw, 100vw" quality={80} className="object-cover" />
              </button>
            ))}
          </div>
        </ViewTransition>
        <button type="button" onClick={() => setFull(true)} className="glass absolute right-3 top-3 grid h-11 w-11 place-items-center rounded-full text-gold-100" aria-label="Fullscreen">
          <IconExpand size={18} />
        </button>
        <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5 md:hidden" aria-hidden>
          {images.map((_, i) => (
            <span key={i} className={`h-1 rounded-full transition-all ${active === i ? 'w-5 bg-gold-300' : 'w-1.5 bg-ivory/40'}`} />
          ))}
        </div>
      </div>

      <div ref={viewer} tabIndex={-1} role="dialog" aria-modal="true" aria-label="Image viewer" className="fixed inset-0 z-[80] bg-raat outline-none" style={{ visibility: 'hidden', opacity: 0 }} onKeyDown={(e) => e.key === 'Escape' && setFull(false)}>
        {full && <Zoomable key={active} src={images[active]} alt={alt} />}
        <button type="button" onClick={() => setFull(false)} className="glass absolute right-4 top-4 grid h-12 w-12 place-items-center rounded-full text-gold-100" aria-label="Close">
          <IconClose />
        </button>
        <div className="absolute inset-x-0 bottom-6 flex justify-center gap-2 pb-[var(--safe-b)]">
          {images.map((_, i) => (
            <button key={i} type="button" onClick={() => setActive(i)} className={`h-11 w-11 rounded-full text-xs ${active === i ? 'bg-gold-300 text-raat' : 'glass text-ivory'}`}>
              {i + 1}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
