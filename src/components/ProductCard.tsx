'use client';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useRef, useState, ViewTransition } from 'react';
import type { Product } from '@/lib/catalog';
import { FABRIC_HI } from '@/lib/catalog';
import { Price } from './Price';
import { WishlistButton } from './WishlistButton';
import { IconClose, IconPlus } from './icons';
import { useShop } from '@/lib/store';
import { useLang, useT } from '@/lib/i18n';
import { threadToBag } from '@/lib/fx';

export function BadgeList({ badges }: { badges?: Product['badges'] }) {
  const t = useT();
  if (!badges?.length) return null;
  return (
    <ul className="flex flex-wrap gap-1.5">
      {badges.map((b) => (
        <li
          key={b}
          className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase leading-none tracking-[0.12em] ${
            b === 'bestseller' ? 'bg-badge-bg text-badge-text' : 'bg-surface-2 text-fg'
          }`}
        >
          {t(b)}
        </li>
      ))}
    </ul>
  );
}

export function ProductCard({
  product: p,
  morph = false,
  priority = false,
  sizes = '(min-width: 1280px) 22vw, (min-width: 768px) 30vw, 46vw',
}: {
  product: Product;
  morph?: boolean;
  priority?: boolean;
  sizes?: string;
}) {
  const lang = useLang();
  const t = useT();
  const add = useShop((s) => s.add);
  const media = useRef<HTMLDivElement>(null);
  const picker = useRef<HTMLDivElement>(null);
  const plus = useRef<HTMLButtonElement>(null);
  const refocus = useRef(false);
  const [picking, setPicking] = useState(false);
  const [slide, setSlide] = useState(0);
  const name = lang === 'hi' ? p.nameHi : p.name;
  const shots = p.images.slice(0, 2);

  const quickAdd = (size?: string) => {
    add(p.slug, size);
    threadToBag(media.current);
    // Don't drop keyboard focus on <body> when the chosen size button unmounts.
    refocus.current = Boolean(picker.current?.contains(document.activeElement));
    setPicking(false);
  };

  // The size picker closes on a tap or click anywhere else, on its × and on Esc.
  useEffect(() => {
    if (!picking) {
      if (refocus.current) plus.current?.focus({ preventScroll: true });
      refocus.current = false;
      return;
    }
    picker.current?.querySelector<HTMLElement>('button')?.focus({ preventScroll: true });
    const onDown = (e: PointerEvent) => {
      if (!picker.current?.contains(e.target as Node)) setPicking(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      refocus.current = true;
      setPicking(false);
    };
    document.addEventListener('pointerdown', onDown, true);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown, true);
      document.removeEventListener('keydown', onKey);
    };
  }, [picking]);

  const img = (
    <div
      ref={media}
      onScroll={(e) => {
        const el = e.currentTarget;
        const i = el.clientWidth ? Math.round(el.scrollLeft / el.clientWidth) : 0;
        if (i !== slide) setSlide(i);
      }}
      className="no-scrollbar relative flex aspect-[3/4] snap-x snap-mandatory overflow-x-auto overflow-y-hidden rounded-[14px] bg-surface [@media(hover:hover)]:overflow-hidden"
    >
      {shots.map((src, i) => (
        <Image
          key={src}
          src={src}
          alt={i === 0 ? `${p.name} — ${p.fabric} ${p.category}` : `${p.name}, fabric detail`}
          width={600}
          height={800}
          sizes={sizes}
          priority={priority && i === 0}
          quality={75}
          className={`h-full w-full shrink-0 snap-center object-cover transition-[opacity,transform] duration-700 [transition-timing-function:var(--ease-out-expo)] ${
            i === 1
              ? '[@media(hover:hover)]:absolute [@media(hover:hover)]:inset-0 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100'
              : '[@media(hover:hover)]:group-hover:scale-[1.04]'
          }`}
        />
      ))}
    </div>
  );

  return (
    <article className="group relative" data-flip-id={p.slug}>
      <div className="relative">
        <Link href={`/product/${p.slug}`} data-cursor="View" className="block rounded-[14px]" aria-label={name}>
          {morph ? (
            <ViewTransition name={`img-${p.slug}`} share="morph" default="none">
              {img}
            </ViewTransition>
          ) : (
            img
          )}
        </Link>
        <div className="pointer-events-none absolute inset-x-2 top-2 flex items-start justify-between">
          <BadgeList badges={p.badges} />
        </div>
        <WishlistButton slug={p.slug} className="absolute right-2 top-2" />
        {/* swipe hint dots (touch only): the current image is the long gold one */}
        {shots.length > 1 && (
          <div aria-hidden className="pointer-events-none absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-1 [@media(hover:hover)]:hidden">
            {shots.map((src, i) => (
              <span
                key={src}
                data-on={i === slide}
                className="h-1 w-1.5 rounded-full bg-fg-muted/40 transition-all duration-300 data-[on=true]:w-3 data-[on=true]:bg-gold-text"
              />
            ))}
          </div>
        )}
        {p.inStock && (
          <div className="absolute inset-x-2 bottom-2 flex justify-end [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:transition-opacity [@media(hover:hover)]:group-focus-within:opacity-100 [@media(hover:hover)]:group-hover:opacity-100">
            {picking && p.sizes ? (
              <div ref={picker} className="glass flex flex-wrap justify-center gap-1 rounded-2xl p-1.5" role="group" aria-label={`${t('size')}: ${name}`}>
                {p.sizes.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => quickAdd(s)}
                    className="min-h-11 min-w-11 rounded-full text-xs text-fg ring-1 ring-field-line hover:bg-cta-bg hover:text-cta-text"
                  >
                    {s}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    refocus.current = true;
                    setPicking(false);
                  }}
                  className="grid min-h-11 min-w-11 place-items-center rounded-full text-fg-muted hover:text-gold-text"
                  aria-label={t('close')}
                >
                  <IconClose size={16} />
                </button>
              </div>
            ) : (
              <button
                ref={plus}
                type="button"
                data-cursor="Add"
                onClick={() => (p.sizes ? setPicking(true) : quickAdd())}
                className="glass flex min-h-11 items-center gap-1.5 rounded-full px-3.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-gold-text ring-1 ring-field-line hover:bg-cta-bg hover:text-cta-text"
                aria-label={`${t('quickAdd')}: ${name}`}
              >
                <IconPlus size={16} />
                <span className="hidden sm:inline">{t('quickAdd')}</span>
              </button>
            )}
          </div>
        )}
      </div>
      <div className="mt-3 space-y-1 px-0.5">
        <p className="label text-[0.7rem] text-gold-text">
          {lang === 'hi' ? FABRIC_HI[p.fabric] : p.fabric}
          {p.subcategory !== p.fabric && ` · ${p.subcategory}`}
          {p.category === 'suit' && !p.stitched && ` · ${t('unstitched')}`}
        </p>
        <h3 className="text-[0.95rem] leading-snug text-fg" lang={lang === 'hi' ? 'hi' : undefined}>
          <Link href={`/product/${p.slug}`} className="hover:text-gold-text">
            {name}
          </Link>
        </h3>
        <Price price={p.price} mrp={p.mrp} size="sm" />
        {!p.inStock && <p className="text-xs text-danger">{t('outOfStock')}</p>}
      </div>
    </article>
  );
}
