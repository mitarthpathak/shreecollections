'use client';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useLayoutEffect, useMemo, useRef, useState, useEffect } from 'react';
import {
  getAllProducts,
  sortProducts,
  FABRICS,
  OCCASIONS,
  OCCASION_LABEL,
  FABRIC_HI,
  SORTS,
  type Category,
  type SortKey,
} from '@/lib/catalog';
import { ProductCard } from '../ProductCard';
import { PriceHistogram } from './PriceHistogram';
import { MiniChakra } from './MiniChakra';
import { IconChevron, IconClose, IconFilter } from '../icons';
import { useLang, useT } from '@/lib/i18n';
import { gsap, Flip, prefersReducedMotion } from '@/lib/gsap';
import { lockScroll } from '@/lib/clock';
import { trapFocus } from '../Header';

const list = (sp: Pick<URLSearchParams, 'get'>, k: string) => (sp.get(k) ? sp.get(k)!.split(',').filter(Boolean) : []);

/** Reads the filters from the URL (needs a Suspense boundary for static rendering). */
export function ShopView({ category }: { category?: Category }) {
  const sp = useSearchParams();
  return <ShopGrid category={category} sp={sp} morph />;
}

/** The same grid with no filters, prerendered as the Suspense fallback so images are in the static HTML. */
export function ShopViewStatic({ category }: { category?: Category }) {
  return <ShopGrid category={category} sp={EMPTY} />;
}

const EMPTY = new URLSearchParams();

function ShopGrid({ category, sp, morph = false }: { category?: Category; sp: Pick<URLSearchParams, 'get' | 'toString'>; morph?: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const lang = useLang();
  const t = useT();
  const grid = useRef<HTMLDivElement>(null);
  const flipState = useRef<Flip.FlipState | null>(null);
  // The sheet remembers the page it was opened on, so navigating (e.g. a category chip) closes it.
  const [sheetAt, setSheetAt] = useState<string | null>(null);
  const sheet = sheetAt === pathname;
  const setSheet = useCallback((open: boolean) => setSheetAt(open ? pathname : null), [pathname]);
  const sheetRef = useRef<HTMLDivElement>(null);
  const filtersBtn = useRef<HTMLButtonElement>(null);
  const locked = useRef(false);

  const base = useMemo(() => (category ? getAllProducts().filter((p) => p.category === category) : getAllProducts()), [category]);
  const f = {
    fabric: list(sp, 'fabric'),
    color: list(sp, 'color'),
    occasion: list(sp, 'occasion'),
    price: sp.get('min') && sp.get('max') ? ([Number(sp.get('min')), Number(sp.get('max'))] as [number, number]) : null,
    sort: (sp.get('sort') as SortKey) in SORTS ? (sp.get('sort') as SortKey) : 'new',
  };

  const filtered = useMemo(() => {
    const r = base.filter(
      (p) =>
        (!f.fabric.length || f.fabric.includes(p.fabric)) &&
        (!f.color.length || f.color.includes(p.colorFamily)) &&
        (!f.occasion.length || p.occasion.some((o) => f.occasion.includes(o))) &&
        (!f.price || (p.price >= f.price[0] && p.price <= f.price[1])),
    );
    return sortProducts(r, f.sort);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [base, sp]);

  const colorCounts = useMemo(() => {
    const c: Record<string, number> = {};
    base.forEach((p) => (c[p.colorFamily] = (c[p.colorFamily] ?? 0) + 1));
    return c;
  }, [base]);

  const update = (mut: (q: URLSearchParams) => void) => {
    if (grid.current && !prefersReducedMotion()) flipState.current = Flip.getState(grid.current.querySelectorAll('[data-flip-id]'));
    // Start from the live URL, not a render's snapshot, so no other filter is ever dropped.
    const q = new URLSearchParams(typeof window === 'undefined' ? sp.toString() : window.location.search);
    mut(q);
    const s = q.toString();
    router.replace(s ? `${pathname}?${s}` : pathname, { scroll: false });
  };
  const toggle = (k: string, v: string) =>
    update((q) => {
      const cur = list(q, k);
      const next = cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v];
      if (next.length) q.set(k, next.join(','));
      else q.delete(k);
    });

  // Reflow cards with Flip after the filtered list renders.
  useLayoutEffect(() => {
    const state = flipState.current;
    if (!state || !grid.current) return;
    flipState.current = null;
    Flip.from(state, {
      targets: grid.current.querySelectorAll('[data-flip-id]'),
      duration: 0.6,
      ease: 'power2.inOut',
      stagger: 0.02,
      absolute: true,
      onEnter: (els) => gsap.fromTo(els, { opacity: 0, scale: 0.94 }, { opacity: 1, scale: 1, duration: 0.5, ease: 'power2.out' }),
    });
  }, [filtered]);

  useEffect(() => {
    const el = sheetRef.current;
    const panelEl = el?.querySelector<HTMLElement>('[data-sheet]');
    if (!el || !panelEl) return;
    if (sheet) {
      el.style.visibility = 'visible';
      if (!locked.current) {
        lockScroll(true);
        locked.current = true;
      }
      gsap.fromTo(panelEl, { yPercent: 100 }, { yPercent: 0, duration: 0.45, ease: 'power3.out', overwrite: true });
      panelEl.querySelector<HTMLElement>('[data-autofocus]')?.focus({ preventScroll: true });
      const onKey = (e: KeyboardEvent) => {
        if (e.key === 'Escape') setSheet(false);
        else trapFocus(e, panelEl);
      };
      // The sheet only exists below lg; growing past it closes it.
      const wide = window.matchMedia('(min-width: 1024px)');
      const onWide = () => wide.matches && setSheet(false);
      window.addEventListener('keydown', onKey);
      wide.addEventListener('change', onWide);
      return () => {
        window.removeEventListener('keydown', onKey);
        wide.removeEventListener('change', onWide);
      };
    }
    if (!locked.current) return;
    lockScroll(false);
    locked.current = false;
    const a = document.activeElement;
    if (!a || a === document.body || panelEl.contains(a)) filtersBtn.current?.focus({ preventScroll: true });
    gsap.to(panelEl, { yPercent: 100, duration: 0.3, ease: 'power2.in', overwrite: true, onComplete: () => void (el.style.visibility = 'hidden') });
  }, [sheet, setSheet]);

  // Leaving the page with the sheet open (its category chips are links) must not keep the scroll locked.
  useEffect(() => {
    const l = locked;
    return () => {
      if (l.current) lockScroll(false);
    };
  }, []);

  const active = f.fabric.length + f.color.length + f.occasion.length + (f.price ? 1 : 0);
  const qs = sp.toString() ? `?${sp.toString()}` : '';

  const panel = (
    <div className="space-y-8">
      <fieldset>
        <legend className="label mb-3 text-gold-text">{t('category')}</legend>
        <div className="flex flex-wrap gap-2">
          {([['/shop', t('all')], ['/shop/sarees', t('sarees')], ['/shop/suits', t('suits')]] as const).map(([href, l]) => (
            <Link key={href} href={href + qs} scroll={false} className="chip" data-on={pathname === href} aria-current={pathname === href ? 'page' : undefined} onClick={() => setSheet(false)}>
              {l}
            </Link>
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend className="label mb-3 text-gold-text">{t('price')}</legend>
        <PriceHistogram
          prices={base.map((p) => p.price)}
          value={f.price}
          label={t('price')}
          onChange={(v) =>
            update((q) => {
              if (v) {
                q.set('min', String(v[0]));
                q.set('max', String(v[1]));
              } else {
                q.delete('min');
                q.delete('max');
              }
            })
          }
        />
      </fieldset>
      <fieldset>
        <legend className="label mb-3 text-gold-text">{t('fabric')}</legend>
        <div className="flex flex-wrap gap-2">
          {FABRICS.filter((fb) => base.some((p) => p.fabric === fb)).map((fb) => (
            <button key={fb} type="button" className="chip" aria-pressed={f.fabric.includes(fb)} onClick={() => toggle('fabric', fb)}>
              <span lang={lang === 'hi' ? 'hi' : undefined}>{lang === 'hi' ? FABRIC_HI[fb] : fb}</span>
            </button>
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend className="label mb-3 text-gold-text">{t('colour')}</legend>
        <MiniChakra counts={colorCounts} selected={f.color} onToggle={(c) => toggle('color', c)} label={t('colour')} />
      </fieldset>
      <fieldset>
        <legend className="label mb-3 text-gold-text">{t('occasion')}</legend>
        <div className="flex flex-wrap gap-2">
          {OCCASIONS.map((o) => (
            <button key={o} type="button" className="chip" aria-pressed={f.occasion.includes(o)} onClick={() => toggle('occasion', o)}>
              <span lang={lang === 'hi' ? 'hi' : undefined}>{OCCASION_LABEL[o][lang]}</span>
            </button>
          ))}
        </div>
      </fieldset>
      {active > 0 && (
        <button type="button" className="text-sm text-gold-text underline underline-offset-4" onClick={() => update((q) => ['fabric', 'color', 'occasion', 'min', 'max'].forEach((k) => q.delete(k)))}>
          {t('clear')}
        </button>
      )}
    </div>
  );

  return (
    <div className="mx-auto grid max-w-[1600px] gap-10 px-4 md:px-8 lg:grid-cols-[300px_1fr]">
      <aside className="hidden lg:block">
        <div className="sticky top-[calc(var(--header-h)+1.5rem)] max-h-[calc(100svh-var(--header-h)-3rem)] overflow-y-auto pb-8 pr-3 [scrollbar-color:var(--gold-700)_transparent] [scrollbar-width:thin]" data-lenis-prevent>
          {panel}
        </div>
      </aside>

      <section aria-labelledby="products-h">
        <h2 id="products-h" className="sr-only">Products</h2>
        <div className="mb-6 flex flex-wrap items-center justify-between gap-x-3 gap-y-3">
          <p className="whitespace-nowrap text-sm text-fg-muted" aria-live="polite">
            <span className="text-gold-text tabular-nums">{filtered.length}</span> {t(filtered.length === 1 ? 'piece' : 'results')}
          </p>
          <div className="ml-auto flex items-center gap-2">
            <button ref={filtersBtn} type="button" className="chip lg:hidden" aria-haspopup="dialog" aria-expanded={sheet} onClick={() => setSheet(true)}>
              <IconFilter size={18} /> {t('filters')}
              {active > 0 && <span className="grid h-5 min-w-5 place-items-center rounded-full bg-cta-bg px-1 text-[11px] font-semibold text-cta-text">{active}</span>}
            </button>
            <label className="sr-only" htmlFor="sort">{t('sort')}</label>
            <span className="relative">
              {/* 16px below md so iOS doesn't zoom the page when the picker opens */}
              <select
                id="sort"
                value={f.sort}
                onChange={(e) => update((q) => (e.target.value === 'new' ? q.delete('sort') : q.set('sort', e.target.value)))}
                className="chip appearance-none bg-surface pr-9 text-base md:text-[0.85rem]"
              >
                {(Object.keys(SORTS) as SortKey[]).map((k) => (
                  <option key={k} value={k}>
                    {SORTS[k][lang]}
                  </option>
                ))}
              </select>
              <IconChevron size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gold-text" />
            </span>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="panel flex flex-col items-center gap-4 rounded-3xl px-6 py-20 text-center">
            <p className="font-editorial text-2xl italic">{t('noResults')}</p>
            <button type="button" className="btn btn-ghost" onClick={() => update((q) => ['fabric', 'color', 'occasion', 'min', 'max'].forEach((k) => q.delete(k)))}>
              {t('clear')}
            </button>
          </div>
        ) : (
          <div ref={grid} className="grid grid-cols-2 gap-x-3 gap-y-8 sm:gap-x-5 md:grid-cols-3 xl:grid-cols-4">
            {filtered.map((p, i) => (
              <ProductCard key={p.slug} product={p} morph={morph} priority={i < 2} />
            ))}
          </div>
        )}
      </section>

      <div ref={sheetRef} className="fixed inset-0 z-[72] lg:hidden" style={{ visibility: 'hidden' }} role="dialog" aria-modal="true" aria-label={t('filters')}>
        <div className="absolute inset-0 bg-scrim" onClick={() => setSheet(false)} />
        <div data-sheet className="absolute inset-x-0 bottom-0 flex max-h-[88svh] flex-col rounded-t-3xl bg-surface">
          <div className="flex items-center justify-between border-b border-divider px-5 py-3">
            <h2 className="font-display tracking-[0.2em] text-gold-text">{t('filters')}</h2>
            <button type="button" data-autofocus onClick={() => setSheet(false)} className="grid h-11 w-11 place-items-center rounded-full" aria-label={t('close')}>
              <IconClose />
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-6" data-lenis-prevent>
            {panel}
          </div>
          <div className="border-t border-divider p-4 pb-[calc(1rem+var(--safe-b))]">
            <button type="button" className="btn btn-gold w-full" onClick={() => setSheet(false)}>
              {filtered.length} {t(filtered.length === 1 ? 'piece' : 'results')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
