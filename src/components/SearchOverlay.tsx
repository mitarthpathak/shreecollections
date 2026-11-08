'use client';
import Image from 'next/image';
import Link from 'next/link';
import Fuse from 'fuse.js';
import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { useShop, useUI } from '@/lib/store';
import { getAllProducts, FABRIC_HI, COLOR_FAMILIES } from '@/lib/catalog';
import { useLang, useT } from '@/lib/i18n';
import { formatINR } from '@/lib/format';
import { gsap } from '@/lib/gsap';
import { useModal } from '@/lib/modal';
import { IconClose, IconSearch } from './icons';

export function SearchOverlay() {
  const open = useUI((s) => s.searchOpen);
  const setOpen = useUI((s) => s.setSearchOpen);
  const recent = useShop((s) => s.recentSearches);
  const pushSearch = useShop((s) => s.pushSearch);
  const lang = useLang();
  const t = useT();
  const [q, setQ] = useState('');
  const dq = useDeferredValue(q);
  const root = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);

  const fuse = useMemo(
    () =>
      new Fuse(
        getAllProducts().map((p) => ({
          ...p,
          fabricHi: FABRIC_HI[p.fabric],
          colorHi: COLOR_FAMILIES[p.colorFamily]?.hi ?? '',
          occasionText: p.occasion.join(' '),
        })),
        {
          keys: [
            { name: 'name', weight: 3 },
            { name: 'nameHi', weight: 3 },
            { name: 'fabric', weight: 2 },
            { name: 'fabricHi', weight: 2 },
            { name: 'subcategory', weight: 2 },
            { name: 'colorFamily', weight: 2 },
            { name: 'colorHi', weight: 1 },
            { name: 'occasionText', weight: 1 },
            { name: 'category', weight: 1 },
            { name: 'description', weight: 0.5 },
          ],
          threshold: 0.38,
          ignoreLocation: true,
        },
      ),
    [],
  );
  const results = useMemo(() => (dq.trim() ? fuse.search(dq.trim()).slice(0, 12).map((r) => r.item) : []), [dq, fuse]);

  const commit = () => q.trim().length > 1 && pushSearch(q.trim());
  const close = () => {
    commit();
    setOpen(false);
  };

  // Scroll hold, focus trap, Escape and focus return (declared first: it notes the opener).
  useModal(open, root, close);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    if (open) {
      el.style.visibility = 'visible';
      gsap.fromTo(el, { opacity: 0 }, { opacity: 1, duration: 0.3, ease: 'power2.out', overwrite: true });
      gsap.fromTo(el.querySelector('[data-panel]'), { y: -24 }, { y: 0, duration: 0.45, ease: 'expo.out' });
      // Synchronously, not in a later frame: the keyboard opened by the tap (see
      // primeKeyboard) moves straight to the input.
      input.current?.focus({ preventScroll: true });
    } else if (el.style.visibility === 'visible') {
      gsap.to(el, { opacity: 0, duration: 0.2, overwrite: true, onComplete: () => void (el.style.visibility = 'hidden') });
    }
  }, [open]);

  const suggestions = lang === 'hi' ? ['बनारसी', 'अनारकली', 'लहरिया', 'शादी', 'लाल'] : ['Banarasi', 'Anarkali', 'Leheriya', 'Wedding', 'Red'];

  return (
    <div ref={root} className="fixed inset-0 z-[75] bg-bg/95" style={{ visibility: 'hidden', opacity: 0 }} role="dialog" aria-modal="true" aria-label={t('search')} aria-hidden={!open}>
      <div
        data-panel
        className="mx-auto flex h-full max-w-5xl flex-col pl-[max(1rem,env(safe-area-inset-left,0px))] pr-[max(1rem,env(safe-area-inset-right,0px))] pt-[calc(1rem+env(safe-area-inset-top,0px))] md:pl-[max(2rem,env(safe-area-inset-left,0px))] md:pr-[max(2rem,env(safe-area-inset-right,0px))] md:pt-[calc(2.5rem+env(safe-area-inset-top,0px))]"
      >
        <div className="flex items-center gap-3 border-b border-field-line pb-3">
          <IconSearch className="shrink-0 text-gold-text" size={26} />
          <label htmlFor="site-search" className="sr-only">{t('search')}</label>
          <input
            id="site-search"
            ref={input}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && commit()}
            placeholder={t('searchPlaceholder')}
            autoComplete="off"
            enterKeyHint="search"
            className="min-h-14 w-full bg-transparent font-editorial text-2xl text-fg outline-none placeholder:text-fg-muted md:text-4xl"
          />
          <button type="button" onClick={close} className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-fg hover:text-gold-text" aria-label={t('close')}>
            <IconClose />
          </button>
        </div>

        <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain pb-[calc(1.5rem+var(--safe-b))] pt-6" data-lenis-prevent>
          {!q.trim() && (
            <div className="space-y-6">
              {recent.length > 0 && (
                <section>
                  <h2 className="label mb-3 text-gold-text">{t('recent')}</h2>
                  <div className="flex flex-wrap gap-2">
                    {recent.map((r) => (
                      <button key={r} type="button" className="chip" onClick={() => setQ(r)}>{r}</button>
                    ))}
                  </div>
                </section>
              )}
              <div className="flex flex-wrap gap-2">
                {suggestions.map((s) => (
                  <button key={s} type="button" className="chip" onClick={() => setQ(s)} lang={lang === 'hi' ? 'hi' : undefined}>{s}</button>
                ))}
              </div>
            </div>
          )}
          {q.trim() && results.length === 0 && <p className="font-editorial text-xl italic text-fg-muted">{t('noResults')}</p>}
          <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4" aria-live="polite">
            {results.map((p) => (
              <li key={p.slug}>
                <Link href={`/product/${p.slug}`} onClick={close} className="group block">
                  <Image src={p.images[0]} alt={p.name} width={300} height={400} sizes="(min-width:1024px) 220px, 45vw" className="aspect-[3/4] w-full rounded-xl object-cover transition-transform duration-500 group-hover:scale-[1.02]" />
                  <p className="mt-2 text-sm text-fg group-hover:text-gold-text" lang={lang === 'hi' ? 'hi' : undefined}>{lang === 'hi' ? p.nameHi : p.name}</p>
                  <p className="text-xs text-gold-text tabular-nums">{formatINR(p.price)}</p>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
