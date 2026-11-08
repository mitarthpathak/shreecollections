'use client';
import Link from 'next/link';
import { useEffect, useRef } from 'react';
import { CHAPTERS } from '../chapters';
import { film } from '../state';
import { onFrame, getLenis } from '@/lib/clock';
import { useLang, useT } from '@/lib/i18n';

/** A thin gold progress thread with chapter ticks (desktop), dots (mobile), and a floating Shop button (desktop). */
export function FilmNav() {
  const bar = useRef<HTMLDivElement>(null);
  const wrap = useRef<HTMLDivElement>(null);
  const lang = useLang();
  const t = useT();

  useEffect(() => {
    let last = -1;
    return onFrame(() => {
      if (bar.current) bar.current.style.transform = `scaleX(${film.progress})`;
      if (film.chapter !== last && wrap.current) {
        last = film.chapter;
        wrap.current.querySelectorAll<HTMLElement>('[data-dot]').forEach((d) => d.toggleAttribute('data-on', Number(d.dataset.i) === last));
        document.documentElement.dataset.chapterActive = CHAPTERS[last].id;
      }
    });
  }, []);

  useEffect(() => () => void delete document.documentElement.dataset.chapterActive, []);

  const go = (id: string) => {
    const el = document.getElementById(`ch-${id}`);
    if (!el) return;
    const lenis = getLenis();
    if (lenis) lenis.scrollTo(el, { duration: 1.6 });
    else el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div ref={wrap}>
      <div className="pointer-events-none fixed inset-x-0 top-0 z-[55] h-[2px] bg-gold-line/20" aria-hidden>
        <div ref={bar} className="h-full origin-left bg-gradient-to-r from-gold-line via-gold-text to-gold-text shadow-[0_0_10px_color-mix(in_srgb,var(--metal)_70%,transparent)]" style={{ transform: 'scaleX(0)' }} />
      </div>
      {/*
        Ticks hang 10px from the top edge: above the header's controls (which start 10px down),
        so they never take a click meant for search, bag or the logo. Labels are tooltips
        (hover / keyboard focus) and don't widen the hit area.
      */}
      <nav aria-label="Chapters" className="pointer-events-none fixed left-[var(--safe-l)] right-[var(--safe-r)] top-0 z-[55] hidden md:block">
        <ol className="relative mx-auto h-0">
          {CHAPTERS.map((c, i) => (
            <li key={c.id} className="absolute top-0" style={{ left: `max(10px, ${(i / CHAPTERS.length) * 100}%)` }}>
              <button
                type="button"
                data-dot
                data-i={i}
                onClick={() => go(c.id)}
                className="group/tick pointer-events-auto relative flex h-2.5 w-5 -translate-x-1/2 justify-center rounded-b-sm focus-visible:outline-offset-0"
                aria-label={lang === 'hi' ? c.labelHi : c.label}
              >
                <span className="mt-0.5 block h-1.5 w-px bg-gold-line transition-all group-hover/tick:h-2 group-hover/tick:bg-gold-text group-data-[on]/tick:h-2 group-data-[on]/tick:bg-gold-text" />
                <span className="label pointer-events-none absolute left-1/2 top-3.5 -translate-x-1/2 whitespace-nowrap rounded-full bg-bg/90 px-2.5 py-1 text-[0.6rem] text-gold-text opacity-0 shadow-[inset_0_0_0_1px_var(--divider)] transition-opacity group-hover/tick:opacity-100 group-focus-visible/tick:opacity-100">
                  {lang === 'hi' ? c.labelHi : c.label}
                </span>
              </button>
            </li>
          ))}
        </ol>
      </nav>
      <div aria-hidden className="pointer-events-none fixed right-[calc(0.5rem+var(--safe-r))] top-1/2 z-[55] flex -translate-y-1/2 flex-col gap-1.5 md:hidden">
        {CHAPTERS.map((c, i) => (
          <span key={c.id} data-dot data-i={i} className="block h-1.5 w-1.5 rounded-full bg-fg-muted/25 transition-all data-[on]:h-4 data-[on]:bg-gold-text" />
        ))}
      </div>
      {/* Phones have Shop in the tab bar, so this floats only from md up (and not over the hero). */}
      <Link
        href="/shop"
        data-film-fab
        className="btn btn-gold fixed bottom-[calc(1.5rem+var(--safe-b))] right-[calc(1.5rem+var(--safe-r))] z-[56] hidden !min-h-12 !px-5 shadow-[0_10px_40px_-10px_var(--shadow)] md:inline-flex"
        data-magnetic
      >
        {t('shop')}
      </Link>
    </div>
  );
}
