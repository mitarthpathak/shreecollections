'use client';
import Image from 'next/image';
import { useEffect, useRef, useState, ViewTransition } from 'react';
import { IconClose, IconExpand } from '../icons';
import { gsap, prefersReducedMotion } from '@/lib/gsap';
import { useModal } from '@/lib/modal';

type Step = 1 | -1;

/**
 * Pinch / drag / double-tap zoom inside the fullscreen viewer; at 1x a horizontal swipe
 * moves to the next or previous image.
 */
function Zoomable({ src, alt, enter, onSwipe }: { src: string; alt: string; enter: Step | 0; onSwipe: (step: Step) => void }) {
  const box = useRef<HTMLDivElement>(null);
  const img = useRef<HTMLDivElement>(null);
  const s = useRef({ scale: 1, x: 0, y: 0 });
  const pts = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<{ d: number; scale: number } | null>(null);
  /** One gesture, first finger down to last finger up. `multi` once a second finger joins. */
  const gesture = useRef<{ x: number; y: number; t: number; multi: boolean } | null>(null);
  /** Horizontal drag at 1x, shown as a preview of the swipe. */
  const drag = useRef(0);
  const lastTap = useRef<{ t: number; x: number; y: number } | null>(null);

  const apply = (anim = false) => {
    const { scale, x, y } = s.current;
    gsap.to(img.current, { scale, x: x + drag.current, y, duration: anim ? 0.35 : 0, ease: 'power2.out', overwrite: true });
  };

  // Slide the new image in from the side it was swiped from.
  useEffect(() => {
    if (!enter || prefersReducedMotion()) return;
    gsap.fromTo(img.current, { x: enter * 48, opacity: 0 }, { x: 0, opacity: 1, duration: 0.3, ease: 'power2.out' });
  }, [enter]);

  const endGesture = (e: React.PointerEvent) => {
    const g = gesture.current;
    const dx = drag.current;
    gesture.current = null;
    drag.current = 0;
    if (g && !g.multi) {
      const dy = e.clientY - g.y;
      const now = e.timeStamp;
      if (s.current.scale === 1 && Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy)) {
        onSwipe(dx < 0 ? 1 : -1);
      } else if (Math.hypot(e.clientX - g.x, dy) < 10 && now - g.t < 300) {
        // A tap. Two quick taps in the same place toggle zoom.
        const prev = lastTap.current;
        if (prev && now - prev.t < 300 && Math.hypot(e.clientX - prev.x, e.clientY - prev.y) < 40) {
          s.current = s.current.scale > 1 ? { scale: 1, x: 0, y: 0 } : { scale: 2.4, x: 0, y: 0 };
          lastTap.current = null;
        } else {
          lastTap.current = { t: now, x: e.clientX, y: e.clientY };
        }
      }
    }
    if (s.current.scale <= 1) s.current = { scale: 1, x: 0, y: 0 };
    clampPan();
    apply(true);
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
        if (pts.current.size === 1) {
          gesture.current = { x: e.clientX, y: e.clientY, t: e.timeStamp, multi: false };
          return;
        }
        // A second finger starts a pinch: never a tap (so no double-tap jump) and never a swipe.
        if (gesture.current) gesture.current.multi = true;
        lastTap.current = null;
        drag.current = 0;
        if (pts.current.size === 2) {
          const [a, b] = [...pts.current.values()];
          pinch.current = { d: Math.max(1, Math.hypot(a.x - b.x, a.y - b.y)), scale: s.current.scale };
        }
      }}
      onPointerMove={(e) => {
        const prev = pts.current.get(e.pointerId);
        if (!prev) return;
        pts.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (pts.current.size === 2 && pinch.current) {
          const [a, b] = [...pts.current.values()];
          s.current.scale = Math.max(1, Math.min(4, (pinch.current.scale * Math.hypot(a.x - b.x, a.y - b.y)) / pinch.current.d));
        } else if (pts.current.size === 1 && s.current.scale > 1) {
          s.current.x += e.clientX - prev.x;
          s.current.y += e.clientY - prev.y;
        } else if (pts.current.size === 1 && gesture.current && !gesture.current.multi) {
          drag.current = e.clientX - gesture.current.x;
        }
        clampPan();
        apply();
      }}
      onPointerUp={(e) => {
        pts.current.delete(e.pointerId);
        if (pts.current.size < 2) pinch.current = null;
        if (pts.current.size === 0) endGesture(e);
      }}
      onPointerCancel={(e) => {
        pts.current.delete(e.pointerId);
        if (pts.current.size < 2) pinch.current = null;
        if (pts.current.size === 0) {
          gesture.current = null;
          drag.current = 0;
          apply(true);
        }
      }}
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
  const [enter, setEnter] = useState<Step | 0>(0);
  const strip = useRef<HTMLDivElement>(null);
  const viewer = useRef<HTMLDivElement>(null);

  const show = (i: number, from: Step | 0 = 0) => {
    if (i < 0 || i >= images.length || i === active) return;
    setEnter(from);
    setActive(i);
  };
  const step = (d: Step) => show(active + d, d);
  const openViewer = () => {
    setEnter(0);
    setFull(true);
  };
  const close = () => {
    setFull(false);
    // Leave the page gallery on the image that was being viewed.
    const s = strip.current;
    const slide = s?.children[active] as HTMLElement | undefined;
    if (s && slide) s.scrollTo({ left: slide.offsetLeft, behavior: 'instant' });
  };

  // Scroll hold (released on close and on unmount, e.g. Back with the viewer open), focus
  // trap, Escape from anywhere, and focus back to the image that opened it.
  useModal(full, viewer, close);

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
      v.style.visibility = 'visible';
      gsap.fromTo(v, { opacity: 0 }, { opacity: 1, duration: 0.3, overwrite: true });
      v.focus({ preventScroll: true });
    } else if (v.style.visibility === 'visible') {
      gsap.to(v, { opacity: 0, duration: 0.2, overwrite: true, onComplete: () => void (v.style.visibility = 'hidden') });
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
              <button key={src} type="button" data-i={i} data-cursor="View" onClick={openViewer} className="relative h-full w-full shrink-0 snap-center" aria-label={`Open image ${i + 1} fullscreen`}>
                <Image src={src} alt={i === 0 ? alt : `${alt}, view ${i + 1}`} fill priority={i === 0} sizes="(min-width: 1024px) 45vw, 100vw" quality={80} className="object-cover" />
              </button>
            ))}
          </div>
        </ViewTransition>
        <button type="button" onClick={openViewer} className="glass absolute right-3 top-3 grid h-11 w-11 place-items-center rounded-full text-gold-100" aria-label="Fullscreen">
          <IconExpand size={18} />
        </button>
        <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5 md:hidden" aria-hidden>
          {images.map((_, i) => (
            <span key={i} className={`h-1 rounded-full transition-all ${active === i ? 'w-5 bg-gold-300' : 'w-1.5 bg-ivory/40'}`} />
          ))}
        </div>
      </div>

      <div
        ref={viewer}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label="Image viewer"
        aria-hidden={!full}
        className="fixed inset-0 z-[80] bg-raat outline-none"
        style={{ visibility: 'hidden', opacity: 0 }}
        onKeyDown={(e) => {
          if (e.key === 'ArrowRight') step(1);
          if (e.key === 'ArrowLeft') step(-1);
        }}
      >
        {full && <Zoomable key={active} src={images[active]} alt={alt} enter={enter} onSwipe={step} />}
        <button
          type="button"
          onClick={close}
          className="glass absolute right-[calc(1rem+env(safe-area-inset-right,0px))] top-[calc(1rem+env(safe-area-inset-top,0px))] grid h-12 w-12 place-items-center rounded-full text-gold-100"
          aria-label="Close"
        >
          <IconClose />
        </button>
        <div className="absolute inset-x-0 bottom-6 flex justify-center gap-2 pb-[var(--safe-b)]">
          {images.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => show(i, i > active ? 1 : -1)}
              aria-label={`Image ${i + 1} of ${images.length}`}
              aria-current={active === i}
              className={`h-11 w-11 rounded-full text-xs ${active === i ? 'bg-gold-300 text-raat' : 'glass text-ivory'}`}
            >
              {i + 1}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
