'use client';
import dynamic from 'next/dynamic';
import { useCallback, useEffect, useRef, useState } from 'react';
import { film } from './state';
import { chapterBgAt, rgbCss } from './chapterBg';
import { CHAPTERS } from './chapters';
import { useUI } from '@/lib/store';
import { ScrollTrigger, useGSAP, prefersReducedMotion } from '@/lib/gsap';
import { onFrame, getLenis } from '@/lib/clock';
import { Preloader } from './dom/Preloader';
import { FilmNav } from './dom/FilmNav';
import { Posters } from './dom/Posters';
import { Hero } from './dom/Hero';
import { ChapterSlot, KnotFooter, chapter } from './dom/lazyChapters';

// three.js and every shot load after first paint, during idle.
const Stage = dynamic(() => import('./Stage'), { ssr: false });
const DEBUG_BUILD = process.env.NODE_ENV !== 'production' || process.env.NEXT_PUBLIC_FILM_DEBUG === '1';
const Debug = DEBUG_BUILD ? dynamic(() => import('./Debug'), { ssr: false }) : () => null;
const MOBILE_QUERY = '(max-width: 767px)';

export type HeroMedia = { video: string; poster: string | null } | null;

export function Film({ heroMedia = null }: { heroMedia?: HeroMedia }) {
  const tier = useUI((s) => s.tier);
  const hydrated = useUI((s) => s.hydrated);
  const [loadStage, setLoadStage] = useState(false);
  const [stageReady, setStageReady] = useState(false);
  const [introDone, setIntroDone] = useState(false);
  // Phone layout (camera fov, shot placement, flat lookbook). Kept current through rotation:
  // the stage remounts when it flips, so every shot picks up the new value.
  const [mobile, setMobile] = useState(false);
  const fontsReady = useRef(false);
  const root = useRef<HTMLDivElement>(null);
  const backdrop = useRef<HTMLDivElement>(null);
  useEffect(() => {
    film.heroVideo = Boolean(heroMedia);
  }, [heroMedia]);

  useEffect(() => {
    const mq = window.matchMedia(MOBILE_QUERY);
    const apply = () => {
      if (film.mobile !== mq.matches) setStageReady(false); // posters cover the remount
      film.mobile = mq.matches;
      setMobile(mq.matches);
    };
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);

  // Decide on the stage once the tier is known. The page loads with posters; the 3D chunk
  // follows on the visitor's first sign of intent (or after a quiet moment), during idle,
  // so first paint and first input never compete with three.js.
  useEffect(() => {
    if (!hydrated) return;
    document.fonts?.ready.then(() => (fontsReady.current = true));
    if (tier === 0) return;
    let started = false;
    const ric = (window.requestIdleCallback ?? ((cb: () => void) => window.setTimeout(cb, 120))) as (cb: () => void) => number;
    const start = () => {
      if (started) return;
      started = true;
      off();
      import('./canvases').then((m) => m.prewarmCanvases());
      ric(() => setLoadStage(true));
    };
    const events = ['pointermove', 'pointerdown', 'wheel', 'touchstart', 'keydown', 'scroll'] as const;
    const off = () => events.forEach((e) => window.removeEventListener(e, start));
    events.forEach((e) => window.addEventListener(e, start, { passive: true, once: true }));
    const timer = window.setTimeout(start, 4000);
    return () => {
      off();
      window.clearTimeout(timer);
    };
  }, [hydrated, tier]);

  // Pointer for tilt / parallax; the canvas pauses while a drawer or search covers it.
  useEffect(() => {
    const move = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return;
      film.pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
      film.pointer.y = -((e.clientY / window.innerHeight) * 2 - 1);
      film.pointer.cx = e.clientX;
      film.pointer.cy = e.clientY;
      film.pointer.inside = true;
    };
    // the mouse left the page (or the window lost focus): things that follow it settle back
    const leave = () => void (film.pointer.inside = false);
    window.addEventListener('pointermove', move, { passive: true });
    document.documentElement.addEventListener('mouseleave', leave);
    window.addEventListener('blur', leave);
    const unsub = useUI.subscribe((s) => (film.covered = s.bagOpen || s.searchOpen));
    return () => {
      window.removeEventListener('pointermove', move);
      document.documentElement.removeEventListener('mouseleave', leave);
      window.removeEventListener('blur', leave);
      film.pointer.inside = false;
      unsub();
      film.covered = false;
    };
  }, []);

  // Scroll state: ScrollTrigger + Lenis write `film`; nothing here calls setState.
  useGSAP(
    () => {
      // the slots, not the chapters' own sections: a lazily loaded chapter replaces its
      // placeholder section, but its slot stays the same element
      const sections = Array.from(root.current!.querySelectorAll<HTMLElement>('[data-chapter-slot]'));
      const triggers = sections.map((el, i) =>
        ScrollTrigger.create({
          trigger: el,
          start: 'top top',
          endTrigger: sections[i + 1] ?? el,
          end: sections[i + 1] ? 'top top' : 'bottom bottom',
          onUpdate: (self) => void (film.chapters[i] = self.progress),
          onRefresh: (self) => void (film.chapters[i] = self.progress),
        }),
      );
      ScrollTrigger.create({
        trigger: root.current,
        start: 'top top',
        end: 'bottom bottom',
        onUpdate(self) {
          film.progress = self.progress;
          film.direction = self.direction as 1 | -1;
        },
      });
      // Section lengths are in svh, and phone / desktop lengths differ, so after a rotation or
      // a window resize the same scroll offset lands in another chapter. Remember where the
      // reader was (chapter + progress) when the size changed, and go back there once
      // ScrollTrigger has re-measured.
      let held: { c: number; p: number } | null = null;
      let fallback = 0;
      let size = { w: window.innerWidth, h: window.innerHeight };
      const coarse = window.matchMedia('(pointer: coarse)').matches;
      const onResize = () => {
        const w = window.innerWidth, h = window.innerHeight;
        // a phone's toolbar showing / hiding changes only the height: svh lengths don't move
        const moved = w !== size.w || (!coarse && h !== size.h);
        size = { w, h };
        if (!moved || held) return;
        held = { c: film.chapter, p: film.chapterProgress };
        // ScrollTrigger refreshes on its own after a resize; make sure one happens
        fallback = window.setTimeout(() => held && ScrollTrigger.refresh(), 1500);
      };
      const restore = () => {
        if (!held) return;
        window.clearTimeout(fallback);
        const { c, p } = held;
        held = null;
        const from = triggers[c].start;
        const to = triggers[c + 1]?.start ?? ScrollTrigger.maxScroll(window);
        const y = Math.round(from + (to - from) * p);
        const lenis = getLenis();
        if (lenis) {
          lenis.resize();
          lenis.scrollTo(y, { immediate: true, force: true });
        } else window.scrollTo(0, y);
        ScrollTrigger.update();
      };
      window.addEventListener('resize', onResize);
      ScrollTrigger.addEventListener('refresh', restore);
      const off = onFrame(() => {
        if (held) return; // measurements are stale until the refresh
        const y = getLenis()?.scroll ?? window.scrollY;
        let c = 0;
        for (let i = 0; i < triggers.length; i++) if (y >= triggers[i].start - 1) c = i;
        film.chapter = c;
        film.chapterProgress = film.chapters[c] ?? 0;
        film.velocity = getLenis()?.velocity ? getLenis()!.velocity * 60 : 0;
        // Colour journey: one fixed backdrop element carries --chapter-bg (not <html>, so the
        // page isn't restyled every frame); the WebGL clear colour eases to film.bg.
        chapterBgAt(c, film.chapterProgress, bgNow);
        if (Math.abs(bgNow[0] - bgLast[0]) + Math.abs(bgNow[1] - bgLast[1]) + Math.abs(bgNow[2] - bgLast[2]) > 0.003 || !film.bgReady) {
          bgLast[0] = bgNow[0];
          bgLast[1] = bgNow[1];
          bgLast[2] = bgNow[2];
          film.bg[0] = bgNow[0];
          film.bg[1] = bgNow[1];
          film.bg[2] = bgNow[2];
          film.bgReady = true;
          backdrop.current?.style.setProperty('--chapter-bg', rgbCss(bgNow));
        }
      });
      const bgNow: [number, number, number] = [0, 0, 0];
      const bgLast: [number, number, number] = [-1, -1, -1];
      const onTheme = () => (bgLast[0] = -1); // re-blend with the new theme's tints
      const mo = new MutationObserver(onTheme);
      mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
      return () => {
        off();
        mo.disconnect();
        film.bgReady = false;
        window.removeEventListener('resize', onResize);
        ScrollTrigger.removeEventListener('refresh', restore);
        window.clearTimeout(fallback);
        film.chapter = 0;
        film.chapterProgress = 0;
        film.progress = 0;
      };
    },
    { scope: root },
  );

  // Reset the shot values when leaving the page so a return starts clean.
  useEffect(
    () => () => {
      Object.assign(film.u.hero, { turn: 0, lift: 0 });
      Object.assign(film.u.weave, { assemble: 0, sheet: 0, fabric: 0 });
      Object.assign(film.u.ribbon, { flow: 0, show: 0 });
      film.u.mor.sweep = 0;
      Object.assign(film.u.chakra, { show: 0, tintAmt: 0 });
      Object.assign(film.u.picks, { pour: 0, show: 0 });
      Object.assign(film.u.lookbook, { show: 0, spin: 0 });
      Object.assign(film.u.knot, { tie: 0, shri: 0 });
    },
    [],
  );

  const progress = useCallback(() => {
    // fonts + (stage chunk & shader compile, when a stage is expected)
    const f = fontsReady.current ? 1 : 0.4;
    if (!hydrated) return 0.2;
    if (tier === 0 || prefersReducedMotion() || !loadStage) return f;
    return f * 0.5 + (stageReady ? 0.5 : 0.2);
  }, [hydrated, tier, loadStage, stageReady]);
  const progressRef = useRef(progress);
  useEffect(() => {
    progressRef.current = progress;
  }, [progress]);

  return (
    <>
      {/* first in paint order: the stage and posters (same z) cover it */}
      <div ref={backdrop} aria-hidden data-chapter-bg className="pointer-events-none fixed inset-0 z-0" style={{ background: 'var(--chapter-bg)' }} />
      <Preloader progress={() => progressRef.current()} onDone={() => setIntroDone(true)} />
      {loadStage && tier > 0 && (
        <div className={`fixed inset-0 z-0 transition-opacity duration-1000 ${stageReady ? 'opacity-100' : 'opacity-0'}`} aria-hidden>
          <Stage key={`${tier}-${mobile ? 'm' : 'd'}`} tier={tier} onReady={() => setStageReady(true)} />
        </div>
      )}
      <Posters hidden={stageReady && tier > 0} />
      <FilmNav />
      {DEBUG_BUILD && <Debug />}
      <div id="film" ref={root} data-stage-ready={stageReady && tier > 0} className="relative z-10" style={{ ['--chapters' as string]: CHAPTERS.length }}>
        <ChapterSlot index={0}>
          <Hero introDone={introDone} media={heroMedia} />
        </ChapterSlot>
        <ChapterSlot index={1}><chapter.Dhaaga /></ChapterSlot>
        <ChapterSlot index={2}><chapter.Weave /></ChapterSlot>
        <ChapterSlot index={3}><chapter.Sarees /></ChapterSlot>
        <ChapterSlot index={4}><chapter.Mor /></ChapterSlot>
        <ChapterSlot index={5}><chapter.Suits /></ChapterSlot>
        <ChapterSlot index={6}><chapter.Chakra /></ChapterSlot>
        <ChapterSlot index={7}><chapter.Picks /></ChapterSlot>
        <ChapterSlot index={8}><chapter.Lookbook wall3D={stageReady && tier >= 2 && !mobile} /></ChapterSlot>
        <ChapterSlot index={9}><chapter.Visit /></ChapterSlot>
        <ChapterSlot index={10}><chapter.Knot /></ChapterSlot>
        <KnotFooter />
      </div>
    </>
  );
}
