'use client';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useLayoutEffect, useMemo, useRef, useState, useEffect } from 'react';
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
import { IconClose, IconFilter } from '../icons';
import { useLang, useT } from '@/lib/i18n';
import { gsap, Flip, prefersReducedMotion } from '@/lib/gsap';
import { lockScroll } from '@/lib/clock';

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
  const [sheet, setSheet] = useState(false);
  const sheetRef = useRef<HTMLDivElement>(null);

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
    const q = new URLSearchParams(sp.toString());
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
    if (!el) return;
    if (sheet) {
      el.style.visibility = 'visible';
      lockScroll(true);
      gsap.fromTo(el.querySelector('[data-sheet]'), { yPercent: 100 }, { yPercent: 0, duration: 0.45, ease: 'power3.out' });
    } else if (el.style.visibility === 'visible') {
      lockScroll(false);
      gsap.to(el.querySelector('[data-sheet]'), { yPercent: 100, duration: 0.3, ease: 'power2.in', onComplete: () => void (el.style.visibility = 'hidden') });
    }
  }, [sheet]);

  const active = f.fabric.length + f.color.length + f.occasion.length + (f.price ? 1 : 0);
  const qs = sp.toString() ? `?${sp.toString()}` : '';

  const panel = (
    <div className="space-y-8">
      <fieldset>
        <legend className="label mb-3 text-gold-500">{t('category')}</legend>
        <div className="flex flex-wrap gap-2">
          {([['/shop', t('all')], ['/shop/sarees', t('sarees')], ['/shop/suits', t('suits')]] as const).map(([href, l]) => (
            <Link key={href} href={href + qs} scroll={false} className="chip" data-on={pathname === href}>
              {l}
            </Link>
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend className="label mb-3 text-gold-500">{t('fabric')}</legend>
        <div className="flex flex-wrap gap-2">
          {FABRICS.filter((fb) => base.some((p) => p.fabric === fb)).map((fb) => (
            <button key={fb} type="button" className="chip" aria-pressed={f.fabric.includes(fb)} onClick={() => toggle('fabric', fb)}>
              <span lang={lang === 'hi' ? 'hi' : undefined}>{lang === 'hi' ? FABRIC_HI[fb] : fb}</span>
            </button>
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend className="label mb-3 text-gold-500">{t('colour')}</legend>
        <MiniChakra counts={colorCounts} selected={f.color} onToggle={(c) => toggle('color', c)} label={t('colour')} />
      </fieldset>
      <fieldset>
        <legend className="label mb-3 text-gold-500">{t('occasion')}</legend>
        <div className="flex flex-wrap gap-2">
          {OCCASIONS.map((o) => (
            <button key={o} type="button" className="chip" aria-pressed={f.occasion.includes(o)} onClick={() => toggle('occasion', o)}>
              <span lang={lang === 'hi' ? 'hi' : undefined}>{OCCASION_LABEL[o][lang]}</span>
            </button>
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend className="label mb-3 text-gold-500">{t('price')}</legend>
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
      {active > 0 && (
        <button type="button" className="text-sm text-gold-300 underline underline-offset-4" onClick={() => update((q) => ['fabric', 'color', 'occasion', 'min', 'max'].forEach((k) => q.delete(k)))}>
          {t('clear')}
        </button>
      )}
    </div>
  );

  return (
    <div className="mx-auto grid max-w-[1600px] gap-10 px-4 md:px-8 lg:grid-cols-[300px_1fr]">
      <aside className="hidden lg:block">
        <div className="sticky top-[calc(var(--header-h)+1.5rem)] max-h-[calc(100svh-var(--header-h)-3rem)] overflow-y-auto pb-8 pr-2 no-scrollbar" data-lenis-prevent>
          {panel}
        </div>
      </aside>

      <section aria-label="Products">
        <div className="mb-6 flex items-center justify-between gap-3">
          <p className="text-sm text-ivory-dim" aria-live="polite">
            <span className="text-gold-100 tabular-nums">{filtered.length}</span> {t('results')}
          </p>
          <div className="flex items-center gap-2">
            <button type="button" className="chip lg:hidden" onClick={() => setSheet(true)}>
              <IconFilter size={18} /> {t('filters')}
              {active > 0 && <span className="grid h-5 min-w-5 place-items-center rounded-full bg-gold-300 px-1 text-[10px] text-raat">{active}</span>}
            </button>
            <label className="sr-only" htmlFor="sort">{t('sort')}</label>
            <select
              id="sort"
              value={f.sort}
              onChange={(e) => update((q) => (e.target.value === 'new' ? q.delete('sort') : q.set('sort', e.target.value)))}
              className="chip appearance-none bg-lacquer pr-8"
            >
              {(Object.keys(SORTS) as SortKey[]).map((k) => (
                <option key={k} value={k}>
                  {SORTS[k][lang]}
                </option>
              ))}
            </select>
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
        <div className="absolute inset-0 bg-raat/70" onClick={() => setSheet(false)} />
        <div data-sheet className="absolute inset-x-0 bottom-0 flex max-h-[88svh] flex-col rounded-t-3xl bg-lacquer">
          <div className="flex items-center justify-between border-b border-gold-700/40 px-5 py-3">
            <h2 className="font-display tracking-[0.2em] text-gold-300">{t('filters')}</h2>
            <button type="button" onClick={() => setSheet(false)} className="grid h-11 w-11 place-items-center" aria-label={t('close')}>
              <IconClose />
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-6" data-lenis-prevent>
            {panel}
          </div>
          <div className="border-t border-gold-700/40 p-4 pb-[calc(1rem+var(--safe-b))]">
            <button type="button" className="btn btn-gold w-full" onClick={() => setSheet(false)}>
              {filtered.length} {t('results')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
