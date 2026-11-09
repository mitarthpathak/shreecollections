'use client';
import { lazy, useEffect } from 'react';
import { CHAPTERS } from '../chapters';
import { ScrollTrigger } from '@/lib/gsap';

/*
 * Every chapter after the hero is its own chunk, so the first load carries only the hero (and
 * the film engine): D3, the chapters' GSAP plugins and their code arrive after first paint.
 *
 * They are still server-rendered, in place: on first load the HTML is already on the page at its
 * final height, and the chunks are requested after the first frame has been painted.
 */
/**
 * Resolves once the browser has painted a frame (immediately on the server). The chapters'
 * chunks are requested after it, so first paint never waits for them: the server HTML is
 * already on screen, and the chapters hydrate a moment later.
 */
let painted: Promise<void> | null = null;
const afterFirstPaint = () =>
  (painted ??= new Promise<void>((resolve) => {
    if (typeof window === 'undefined') return resolve();
    requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(resolve, 0)));
  }));

const later = <T,>(load: () => Promise<T>) => () => afterFirstPaint().then(load);

export const chapter = {
  Dhaaga: lazy(later(() => import('./Dhaaga').then((m) => ({ default: m.Dhaaga })))),
  Weave: lazy(later(() => import('./Weave').then((m) => ({ default: m.Weave })))),
  Sarees: lazy(later(() => import('./Sarees').then((m) => ({ default: m.Sarees })))),
  Mor: lazy(later(() => import('./Mor').then((m) => ({ default: m.Mor })))),
  Suits: lazy(later(() => import('./Suits').then((m) => ({ default: m.Suits })))),
  Chakra: lazy(later(() => import('./Chakra').then((m) => ({ default: m.Chakra })))),
  Picks: lazy(later(() => import('./Picks').then((m) => ({ default: m.Picks })))),
  Lookbook: lazy(later(() => import('./Lookbook').then((m) => ({ default: m.Lookbook })))),
  Visit: lazy(later(() => import('./Visit').then((m) => ({ default: m.Visit })))),
  Knot: lazy(later(() => import('./Knot').then((m) => ({ default: m.KnotChapter })))),
};

export const KnotFooter = lazy(later(() => import('./Knot').then((m) => ({ default: m.KnotFooter }))));

/**
 * One chapter's slot: a stable element for the film's scroll triggers. Deliberately *no*
 * Suspense boundary here: with one, React would stream each chapter out of order (placeholder
 * first, content moved in by an inline script) — invisible without JavaScript and later for
 * the LCP. Without one, the server simply waits for the chapter and writes it in place, and on a
 * client-side visit the router keeps the previous page until the chunks have arrived.
 */
export function ChapterSlot({ index, children }: { index: number; children: React.ReactNode }) {
  return (
    <div data-chapter-slot={CHAPTERS[index].id}>
      {children}
      <Remeasure />
    </div>
  );
}

/** A chapter just mounted (or hydrated): re-measure the scroll triggers once things settle. */
let pending = 0;
function Remeasure() {
  useEffect(() => {
    window.clearTimeout(pending);
    pending = window.setTimeout(() => ScrollTrigger.refresh(), 120);
  }, []);
  return null;
}
