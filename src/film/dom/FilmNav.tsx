'use client';
import Link from 'next/link';
import { useEffect, useRef } from 'react';
import { CHAPTERS } from '../chapters';
import { film } from '../state';
import { onFrame, getLenis } from '@/lib/clock';
import { useLang, useT } from '@/lib/i18n';

/** A thin gold progress thread with chapter ticks (desktop), dots (mobile), and an always-there Shop button. */
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
      <div className="pointer-events-none fixed inset-x-0 top-0 z-[55] h-[2px] bg-gold-700/20" aria-hidden>
        <div ref={bar} className="h-full origin-left bg-gradient-to-r from-gold-700 via-gold-300 to-gold-100 shadow-[0_0_10px_rgba(233,196,106,.7)]" style={{ transform: 'scaleX(0)' }} />
      </div>
      <nav aria-label="Chapters" className="fixed inset-x-0 top-[3px] z-[55] hidden md:block">
        <ol className="relative mx-auto h-0">
          {CHAPTERS.map((c, i) => (
            <li key={c.id} className="absolute -top-1" style={{ left: `${(i / CHAPTERS.length) * 100}%` }}>
              <button type="button" data-dot data-i={i} onClick={() => go(c.id)} className="group/tick flex h-6 items-start px-1" aria-label={c.label}>
                <span className="block h-2 w-px bg-gold-500 transition-all group-data-[on]/tick:h-3 group-data-[on]/tick:bg-gold-100" />
                <span className="label pointer-events-none ml-1 mt-1 whitespace-nowrap text-[0.55rem] text-gold-300 opacity-0 transition-opacity group-hover/tick:opacity-100 group-data-[on]/tick:opacity-80">
                  {lang === 'hi' ? c.labelHi : c.label}
                </span>
              </button>
            </li>
          ))}
        </ol>
      </nav>
      <div aria-hidden className="fixed right-2 top-1/2 z-[55] flex -translate-y-1/2 flex-col gap-1.5 md:hidden">
        {CHAPTERS.map((c, i) => (
          <span key={c.id} data-dot data-i={i} className="block h-1.5 w-1.5 rounded-full bg-ivory/25 transition-all data-[on]:h-4 data-[on]:bg-gold-300" />
        ))}
      </div>
      <Link
        href="/shop"
        className="btn btn-gold fixed bottom-[calc(var(--tabbar-h)+var(--safe-b)+0.9rem)] right-4 z-[56] !min-h-12 !px-5 shadow-[0_10px_40px_-10px_rgba(233,196,106,.7)] md:bottom-6 md:right-6"
        data-magnetic
      >
        {t('shop')}
      </Link>
    </div>
  );
}
