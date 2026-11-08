'use client';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { getAllProducts, getProduct, completeTheLook, FABRIC_HI, OCCASION_LABEL, COLOR_FAMILIES, type Product } from '@/lib/catalog';
import { useShop, useUI } from '@/lib/store';
import { useLang, useT } from '@/lib/i18n';
import { threadToBag } from '@/lib/fx';
import { buildWhatsAppOrder } from '@/lib/whatsapp';
import { ZoomGallery } from './ZoomGallery';
import { Price } from '../Price';
import { BadgeList, ProductCard } from '../ProductCard';
import { WishlistButton } from '../WishlistButton';
import { IconMinus, IconPlus, IconWhatsApp, IconChevron } from '../icons';

const FabricViewer = dynamic(() => import('./FabricViewer'), {
  ssr: false,
  loading: () => <div className="aspect-square w-full animate-pulse rounded-[18px] bg-lacquer" />,
});

function deliveryEstimate(pin: string, lang: 'en' | 'hi') {
  // Mock until the owner confirms shipping rules (TODO(brand): shipping policy).
  if (!/^[1-9]\d{5}$/.test(pin)) return lang === 'hi' ? 'कृपया सही 6 अंकों का पिनकोड डालें।' : 'Please enter a valid 6-digit pincode.';
  if (pin.startsWith('327')) return lang === 'hi' ? 'बांसवाड़ा: दुकान से लें या उसी दिन डिलीवरी (अनुमान)।' : 'Banswara: pick up in store or same-day delivery (estimate).';
  if (/^3[0-4]/.test(pin)) return lang === 'hi' ? 'राजस्थान: 2–4 दिन में (अनुमान)।' : 'Rajasthan: 2–4 days (estimate).';
  return lang === 'hi' ? 'पूरे भारत में: 4–7 दिन (अनुमान)।' : 'Across India: 4–7 days (estimate).';
}

export function ProductView({ slug }: { slug: string }) {
  const p = getProduct(slug)!;
  const lang = useLang();
  const t = useT();
  const tier = useUI((s) => s.tier);
  const hydrated = useUI((s) => s.hydrated);
  const add = useShop((s) => s.add);
  const pushViewed = useShop((s) => s.pushViewed);
  const viewed = useShop((s) => s.recentlyViewed);
  const customer = useShop((s) => s.customer);
  const [size, setSize] = useState<string | undefined>();
  const [qty, setQty] = useState(1);
  const [needSize, setNeedSize] = useState(false);
  const [feel, setFeel] = useState(false);
  const [pin, setPin] = useState('');
  const [pinMsg, setPinMsg] = useState('');
  const addBtn = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    pushViewed(slug);
  }, [slug, pushViewed]);

  const variants = useMemo(
    () => getAllProducts().filter((q) => q.category === p.category && q.subcategory === p.subcategory),
    [p],
  );
  const look = useMemo(() => completeTheLook(p, 4), [p]);
  const recent = useMemo(
    () => (hydrated ? viewed.filter((s) => s !== slug).map((s) => getProduct(s)).filter(Boolean).slice(0, 4) as Product[] : []),
    [hydrated, viewed, slug],
  );
  const name = lang === 'hi' ? p.nameHi : p.name;
  const sized = Boolean(p.sizes?.length);

  const addToBag = () => {
    if (sized && !size) {
      setNeedSize(true);
      document.getElementById('sizes')?.focus();
      return;
    }
    add(p.slug, size, qty);
    threadToBag(document.querySelector('[data-hero-media]') ?? addBtn.current);
  };

  const waHref = buildWhatsAppOrder([{ product: p, size, qty }], customer);

  return (
    <div className="mx-auto max-w-[1600px] px-4 md:px-8">
      <nav aria-label="Breadcrumb" className="py-5 text-xs text-ivory-dim">
        <ol className="flex flex-wrap gap-2">
          <li><Link href="/shop" className="hover:text-gold-100">{t('shop')}</Link> /</li>
          <li><Link href={`/shop/${p.category === 'saree' ? 'sarees' : 'suits'}`} className="hover:text-gold-100">{p.category === 'saree' ? t('sarees') : t('suits')}</Link> /</li>
          <li aria-current="page" className="text-ivory" lang={lang === 'hi' ? 'hi' : undefined}>{name}</li>
        </ol>
      </nav>

      <div className="grid gap-10 lg:grid-cols-[1.15fr_1fr] lg:gap-16">
        <div data-hero-media>
          <ZoomGallery images={p.images} alt={`${p.name} — ${p.fabric} ${p.category}`} slug={p.slug} />
        </div>

        <div className="lg:sticky lg:top-[calc(var(--header-h)+1rem)] lg:self-start">
          <BadgeList badges={p.badges} />
          <p className="label mt-4 text-gold-500">
            {lang === 'hi' ? FABRIC_HI[p.fabric] : p.fabric}
            {p.subcategory !== p.fabric && ` · ${p.subcategory}`}
          </p>
          <h1 className="mt-2 font-display text-[clamp(2rem,4vw,3.4rem)] leading-[1.02] text-gold" lang={lang === 'hi' ? 'hi' : undefined}>
            {name}
          </h1>
          {lang === 'en' && <p lang="hi" className="font-hindi-display mt-1 text-lg text-ivory-dim">{p.nameHi}</p>}
          <div className="mt-5">
            <Price price={p.price} mrp={p.mrp} size="lg" />
            <p className="mt-1 text-xs text-ivory-dim">Inclusive of all taxes</p>
          </div>

          <p className="mt-6 max-w-prose font-editorial text-xl leading-relaxed text-ivory/90">{p.description}</p>

          {variants.length > 1 && (
            <div className="mt-7">
              <p className="label mb-3 text-gold-500">{t('colour')}</p>
              <div className="flex flex-wrap gap-2">
                {variants.map((v) => (
                  <Link
                    key={v.slug}
                    href={`/product/${v.slug}`}
                    aria-current={v.slug === p.slug ? 'true' : undefined}
                    aria-label={`${v.name} — ${v.colorFamily}`}
                    title={v.name}
                    className="grid h-11 w-11 place-items-center rounded-full ring-1 ring-gold-700 aria-[current=true]:ring-2 aria-[current=true]:ring-gold-300"
                  >
                    <span className="h-7 w-7 rounded-full" style={{ background: v.colorHex }} />
                  </Link>
                ))}
              </div>
            </div>
          )}

          {sized ? (
            <fieldset className="mt-7">
              <legend className="label mb-3 text-gold-500">{t('size')}</legend>
              <div id="sizes" tabIndex={-1} role="radiogroup" aria-label={t('size')} className="flex flex-wrap gap-2">
                {p.sizes!.map((s) => (
                  <button key={s} type="button" role="radio" aria-checked={size === s} onClick={() => { setSize(s); setNeedSize(false); }} className="chip min-w-12 justify-center">
                    {s}
                  </button>
                ))}
              </div>
              {needSize && <p className="mt-2 text-sm text-sindoor" role="alert">{lang === 'hi' ? 'पहले साइज़ चुनें।' : 'Choose a size first.'}</p>}
            </fieldset>
          ) : p.category === 'suit' ? (
            <p className="mt-7 inline-flex rounded-full bg-mor/20 px-3 py-1.5 text-xs text-ivory ring-1 ring-mor/60">
              {p.stitched ? t('stitched') : t('unstitched')}
              {!p.stitched && (lang === 'hi' ? ' · अपनी नाप से सिलवाएँ' : ' · tailor to your measurements')}
            </p>
          ) : null}

          <div className="mt-7 flex flex-wrap items-center gap-3">
            <div className="flex items-center rounded-full ring-1 ring-gold-500/40" role="group" aria-label={t('qty')}>
              <button type="button" className="grid h-12 w-12 place-items-center disabled:opacity-30" disabled={qty <= 1} onClick={() => setQty(qty - 1)} aria-label="−1"><IconMinus size={18} /></button>
              <span className="w-6 text-center tabular-nums" aria-live="polite">{qty}</span>
              <button type="button" className="grid h-12 w-12 place-items-center disabled:opacity-30" disabled={qty >= 10} onClick={() => setQty(qty + 1)} aria-label="+1"><IconPlus size={18} /></button>
            </div>
            <button ref={addBtn} type="button" onClick={addToBag} disabled={!p.inStock} className="btn btn-gold flex-1" data-magnetic data-cursor="Add">
              {p.inStock ? t('addToBag') : t('outOfStock')}
            </button>
            <WishlistButton slug={p.slug} className="!h-12 !w-12 ring-1 ring-gold-500/40" size={22} />
          </div>
          <a
            href={waHref}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-ghost mt-3 w-full"
            onClick={(e) => {
              if (sized && !size) {
                e.preventDefault();
                setNeedSize(true);
              }
            }}
          >
            <IconWhatsApp size={18} /> {t('buyOnWhatsApp')}
          </a>

          <form
            className="mt-6 flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              setPinMsg(deliveryEstimate(pin, lang));
            }}
          >
            <label htmlFor="pin" className="sr-only">{t('pincode')}</label>
            <input
              id="pin"
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
              inputMode="numeric"
              placeholder={`${t('delivery')} — ${t('pincode')}`}
              className="min-h-11 flex-1 rounded-full bg-lacquer px-4 text-sm ring-1 ring-gold-500/30 placeholder:text-ivory-dim/50 focus:ring-gold-300"
            />
            <button type="submit" className="chip">{t('check')}</button>
          </form>
          {pinMsg && <p className="mt-2 text-sm text-gold-100" role="status">{pinMsg}</p>}

          <div className="mt-8 divide-y divide-gold-700/40 border-y border-gold-700/40">
            <details className="group py-1" open>
              <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between text-sm text-ivory">
                {t('details')} <IconChevron size={18} className="transition-transform group-open:rotate-180" />
              </summary>
              <dl className="grid grid-cols-[120px_1fr] gap-y-2 pb-4 text-sm">
                <dt className="text-ivory-dim">{t('fabric')}</dt><dd>{lang === 'hi' ? FABRIC_HI[p.fabric] : p.fabric}</dd>
                <dt className="text-ivory-dim">{t('colour')}</dt><dd>{lang === 'hi' ? COLOR_FAMILIES[p.colorFamily]?.hi : p.colorFamily}</dd>
                <dt className="text-ivory-dim">{t('occasion')}</dt><dd>{p.occasion.map((o) => OCCASION_LABEL[o][lang]).join(', ')}</dd>
                <dt className="text-ivory-dim">SKU</dt><dd className="tabular-nums">{p.id}</dd>
              </dl>
            </details>
            <details className="group py-1">
              <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between text-sm text-ivory">
                {t('fabricCare')} <IconChevron size={18} className="transition-transform group-open:rotate-180" />
              </summary>
              <ul className="list-disc space-y-1 pb-4 pl-5 text-sm text-ivory/90">
                {p.care.map((c) => <li key={c}>{c}</li>)}
              </ul>
            </details>
          </div>

          {tier >= 2 && p.fabricTexture && (
            <div className="mt-8">
              <button type="button" aria-expanded={feel} onClick={() => setFeel(!feel)} className="btn btn-ghost w-full">
                {t('feelFabric')}
              </button>
              {feel && (
                <div className="mt-4">
                  <FabricViewer src={p.fabricTexture} label={lang === 'hi' ? 'खींचकर लहर बनाइए' : 'Drag across the cloth to ripple it'} />
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <section className="mt-24" aria-labelledby="look">
        <h2 id="look" className="mb-8 font-display text-3xl text-gold md:text-5xl">{t('completeLook')}</h2>
        <div className="grid grid-cols-2 gap-x-3 gap-y-8 sm:gap-x-5 md:grid-cols-4">
          {look.map((q) => <ProductCard key={q.slug} product={q} sizes="(min-width: 768px) 24vw, 46vw" />)}
        </div>
      </section>

      {recent.length > 0 && (
        <section className="mt-20 pb-10" aria-labelledby="recent">
          <h2 id="recent" className="mb-8 font-display text-2xl text-gold md:text-4xl">{t('recentlyViewed')}</h2>
          <div className="grid grid-cols-2 gap-x-3 gap-y-8 sm:gap-x-5 md:grid-cols-4">
            {recent.map((q) => <ProductCard key={q.slug} product={q} sizes="(min-width: 768px) 24vw, 46vw" />)}
          </div>
        </section>
      )}
    </div>
  );
}
