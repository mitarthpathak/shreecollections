'use client';
import dynamic from 'next/dynamic';
import { useCallback, useEffect, useRef, useState } from 'react';
import { film } from './state';
import { CHAPTERS } from './chapters';
import { useUI } from '@/lib/store';
import { ScrollTrigger, useGSAP, prefersReducedMotion } from '@/lib/gsap';
import { onFrame, getLenis } from '@/lib/clock';
import { Preloader } from './dom/Preloader';
import { FilmNav } from './dom/FilmNav';
import { Posters } from './dom/Posters';
import { prewarmCanvases } from './canvases';
import { Hero } from './dom/Hero';
import { Dhaaga } from './dom/Dhaaga';
import { Weave } from './dom/Weave';
import { Sarees } from './dom/Sarees';
import { Mor } from './dom/Mor';
import { Suits } from './dom/Suits';
import { Chakra } from './dom/Chakra';
import { Picks } from './dom/Picks';
import { Lookbook } from './dom/Lookbook';
import { Visit } from './dom/Visit';
import { KnotChapter } from './dom/Knot';

// three.js and every shot load after first paint, during idle.
const Stage = dynamic(() => import('./Stage'), { ssr: false });
const DEBUG_BUILD = process.env.NODE_ENV !== 'production' || process.env.NEXT_PUBLIC_FILM_DEBUG === '1';
const Debug = DEBUG_BUILD ? dynamic(() => import('./Debug'), { ssr: false }) : () => null;

export function Film() {
  const tier = useUI((s) => s.tier);
  const hydrated = useUI((s) => s.hydrated);
  const [loadStage, setLoadStage] = useState(false);
  const [stageReady, setStageReady] = useState(false);
  const [introDone, setIntroDone] = useState(false);
  const fontsReady = useRef(false);
  const root = useRef<HTMLDivElement>(null);

  // Decide on the stage once the tier is known. The page loads with posters; the 3D chunk
  // follows on the visitor's first sign of intent (or after a quiet moment), during idle,
  // so first paint and first input never compete with three.js.
  useEffect(() => {
    if (!hydrated) return;
    film.mobile = window.matchMedia('(max-width: 767px)').matches;
    document.fonts?.ready.then(() => (fontsReady.current = true));
    if (tier === 0) return;
    let started = false;
    const ric = (window.requestIdleCallback ?? ((cb: () => void) => window.setTimeout(cb, 120))) as (cb: () => void) => number;
    const start = () => {
      if (started) return;
      started = true;
      off();
      prewarmCanvases();
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
    };
    window.addEventListener('pointermove', move, { passive: true });
    const unsub = useUI.subscribe((s) => (film.covered = s.bagOpen || s.searchOpen));
    return () => {
      window.removeEventListener('pointermove', move);
      unsub();
      film.covered = false;
    };
  }, []);

  // Scroll state: ScrollTrigger + Lenis write `film`; nothing here calls setState.
  useGSAP(
    () => {
      const sections = Array.from(root.current!.querySelectorAll<HTMLElement>('[data-chapter]'));
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
      const off = onFrame(() => {
        const y = getLenis()?.scroll ?? window.scrollY;
        let c = 0;
        for (let i = 0; i < triggers.length; i++) if (y >= triggers[i].start - 1) c = i;
        film.chapter = c;
        film.chapterProgress = film.chapters[c] ?? 0;
        film.velocity = getLenis()?.velocity ? getLenis()!.velocity * 60 : 0;
      });
      return () => {
        off();
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
      <Preloader progress={() => progressRef.current()} onDone={() => setIntroDone(true)} />
      {loadStage && tier > 0 && (
        <div className={`fixed inset-0 z-0 transition-opacity duration-1000 ${stageReady ? 'opacity-100' : 'opacity-0'}`} aria-hidden>
          <Stage key={tier} tier={tier} onReady={() => setStageReady(true)} />
        </div>
      )}
      <Posters hidden={stageReady && tier > 0} />
      <FilmNav />
      {DEBUG_BUILD && <Debug />}
      <div id="film" ref={root} data-stage-ready={stageReady && tier > 0} className="relative z-10" style={{ ['--chapters' as string]: CHAPTERS.length }}>
        <Hero introDone={introDone} />
        <Dhaaga />
        <Weave />
        <Sarees />
        <Mor />
        <Suits />
        <Chakra />
        <Picks />
        <Lookbook stageReady={stageReady} />
        <Visit />
        <KnotChapter />
      </div>
    </>
  );
}
