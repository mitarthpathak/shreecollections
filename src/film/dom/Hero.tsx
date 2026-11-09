'use client';
import Link from 'next/link';
import { Accent } from '@/components/Accent';
import { useEffect, useRef, useState } from 'react';
import { ProductCard } from '@/components/ProductCard';
import { getAllProducts } from '@/lib/catalog';
import type { HeroMedia } from '../Film';
import { Section, ranges } from './Section';
import { brand } from '@/brand.config';
import { gsap, useGSAP, prefersReducedMotion } from '@/lib/gsap';

// SplitText is only for the intro animation: fetched as the page hydrates, not before first paint.
const splitText = typeof window === 'undefined' ? null : import('@/lib/gsap-split').then((m) => m.SplitText);
import { film } from '../state';
import { useLang, useT } from '@/lib/i18n';

/**
 * The coin's preferred spot, as fractions of the viewport height — where it has always sat:
 * right of the headline on landscape screens (x = W/2 + dx·H), above it on portrait ones.
 * It keeps that spot whenever it fits, and otherwise shrinks and slides into the free space.
 * (A media slot when a hero drape video exists: the video takes the coin's place.)
 */
const COIN = {
  wide: { dx: 0.47, y: 0.48, r: 0.2 },
  tall: { dx: 0, y: 0.31, r: 0.115 },
};

/** "New arrivals" in the hero's last beat: the newest pieces, as real product cards. */
const NEW_ARRIVALS = getAllProducts()
  .filter((p) => p.badges?.includes('new'))
  .slice(0, 6);

function NewArrivals({
  className = '',
  title,
  viewAll,
  show = true,
  ...rest
}: { className?: string; title: string; viewAll: string; show?: boolean } & React.HTMLAttributes<HTMLElement>) {
  // nothing marked "new" in the catalogue (admin panel): no empty rail, the scroll beat stays
  if (!NEW_ARRIVALS.length) return <section aria-hidden className={className} {...rest} />;
  return (
    <section aria-label={title} className={className} {...rest}>
      <div className="mx-auto max-w-[1600px] px-safe md:px-safe-12">
        <div className="mb-3 flex items-baseline justify-between gap-4">
          <h2 className="label text-gold-text">{title}</h2>
          <Link href="/shop" className="label inline-flex min-h-11 items-center text-fg-muted underline decoration-gold-line underline-offset-4 hover:text-gold-text">
            {viewAll} →
          </Link>
        </div>
      </div>
      <div className="no-scrollbar flex snap-x gap-3 overflow-x-auto px-safe pb-1 md:gap-4 md:px-safe-12" data-lenis-prevent>
        {NEW_ARRIVALS.map((p) => (
          <div key={p.slug} className="w-[9.5rem] shrink-0 snap-start md:w-[11.5rem]">
            {/* until the rail is about to rise in, a same-size blank: no image requests at load */}
            {show ? <ProductCard product={p} sizes="184px" /> : <div className="aspect-[4/5] rounded-lg bg-surface" />}
          </div>
        ))}
      </div>
    </section>
  );
}

/**
 * The coin as a still, in the coin's slot, until the 3D stage is up (and for good without WebGL
 * or with reduced motion): the same face as the 3D coin, in a gold rim. It fades out as the 3D
 * coin fades in on top of it, so there is only ever one coin.
 */
function PosterCoin() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute z-0 rounded-full p-[calc(var(--slot-r,0px)*0.07)] shadow-[0_30px_80px_-30px_var(--shadow)] transition-opacity duration-1000 [[data-stage-ready=true]_&]:opacity-0"
      style={{
        left: 'calc(var(--slot-x, 0px) - var(--slot-r, 0px))',
        top: 'calc(var(--slot-y, 0px) - var(--slot-r, 0px))',
        width: 'calc(var(--slot-r, 0px) * 2)',
        height: 'calc(var(--slot-r, 0px) * 2)',
        background: 'radial-gradient(circle at 35% 30%, var(--gold-100), var(--gold-300) 35%, var(--gold-500) 65%, var(--gold-700))',
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- sized by CSS variables; one small webp */}
      <img src={brand.logo.coin} alt="" decoding="async" className="h-full w-full rounded-full" />
    </div>
  );
}

/** The hero drape video in the coin's slot: muted, looped, inline; loaded only after the page is up. */
function HeroVideo({ media }: { media: NonNullable<HeroMedia> }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const v = ref.current;
    if (!v || prefersReducedMotion()) return; // the poster stays as a still
    const ric = (window.requestIdleCallback ?? ((cb: () => void) => window.setTimeout(cb, 200))) as (cb: () => void) => number;
    const start = () =>
      ric(() => {
        v.src = media.video;
        v.play().catch(() => {});
      });
    if (document.readyState === 'complete') start();
    else window.addEventListener('load', start, { once: true });
    return () => window.removeEventListener('load', start);
  }, [media.video]);
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute z-0 overflow-hidden rounded-lg bg-surface shadow-[0_30px_80px_-30px_var(--shadow)]"
      style={{ left: 'calc(var(--slot-x) - var(--slot-r) * 0.8)', top: 'calc(var(--slot-y) - var(--slot-r))', width: 'calc(var(--slot-r) * 1.6)', height: 'calc(var(--slot-r) * 2)' }}
    >
      <video ref={ref} muted loop playsInline preload="none" poster={media.poster ?? undefined} className="h-full w-full object-cover" />
    </div>
  );
}

/** Fit the coin into the space the hero copy leaves free (screen px at rest, scroll 0). */
function placeCoin(root: HTMLElement) {
  const W = window.innerWidth;
  // the sticky stage is 100svh: stable while a phone's URL bar comes and goes
  const H = root.querySelector<HTMLElement>('[data-hero-stage]')?.offsetHeight || window.innerHeight;
  const copy = root.querySelector<HTMLElement>('[data-hero-copy]');
  const eyebrow = root.querySelector<HTMLElement>('[data-hero-eyebrow]');
  if (!copy || !eyebrow || !W || !H) return null;
  const header = document.querySelector<HTMLElement>('header');
  const bottomBar = root.querySelector<HTMLElement>('[data-hero-bottom]')?.offsetHeight ?? 0;
  const gap = 10 + 0.012 * H; // the coin bobs a little; never let it touch the copy
  const side = W < 768 ? 22 : 28; // clear of the chapter dots / screen edge
  const portrait = H >= W;
  const pref = portrait ? COIN.tall : COIN.wide;
  let r = pref.r * H;
  let x = W / 2 + pref.dx * H;
  let y = pref.y * H;
  const T = (header?.offsetHeight ?? 64) + gap;
  let L = side;
  const R = W - side;
  let B: number;
  if (portrait) {
    // above the eyebrow (offsets: layout position, unaffected by the scroll / intro transforms)
    B = copy.offsetTop + eyebrow.offsetTop - gap;
  } else {
    // right of the widest line of copy (text extents, not the full-width blocks)
    const range = document.createRange();
    let right = 0;
    for (const el of Array.from(copy.children)) {
      range.selectNodeContents(el);
      right = Math.max(right, range.getBoundingClientRect().right);
    }
    L = right + 2 * gap;
    B = H - bottomBar - gap;
  }
  r = Math.max(0, Math.min(r, (R - L) / 2, (B - T) / 2));
  x = Math.min(Math.max(x, L + r), R - r);
  y = Math.min(Math.max(y, T + r), B - r);
  return { x, y, r };
}

export function Hero({ introDone, media = null }: { introDone: boolean; media?: HeroMedia }) {
  const root = useRef<HTMLElement>(null);
  // The rail's cards (and their images) mount just before it rises in, or in idle time after
  // load — never with the first paint.
  const [railOn, setRailOn] = useState(false);
  useEffect(() => {
    const ric = (window.requestIdleCallback ?? ((cb: () => void) => window.setTimeout(cb, 1500))) as (cb: () => void, o?: { timeout: number }) => number;
    let t = 0;
    const later = () => (t = window.setTimeout(() => ric(() => setRailOn(true), { timeout: 4000 }), 2500));
    if (document.readyState === 'complete') later();
    else window.addEventListener('load', later, { once: true });
    return () => {
      window.removeEventListener('load', later);
      window.clearTimeout(t);
    };
  }, []);
  const t = useT();
  const lang = useLang();

  // Keep the 3D coin out of the copy at every size, language and font state.
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    let raf = 0;
    const measure = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const c = placeCoin(el);
        if (!c) return;
        Object.assign(film.coin, c);
        // the media slot (video) sits where the coin would
        el.style.setProperty('--slot-x', `${c.x.toFixed(1)}px`);
        el.style.setProperty('--slot-y', `${c.y.toFixed(1)}px`);
        el.style.setProperty('--slot-r', `${c.r.toFixed(1)}px`);
      });
    };
    measure();
    const ro = new ResizeObserver(measure);
    el.querySelectorAll('[data-hero-copy] > *').forEach((c) => ro.observe(c));
    window.addEventListener('resize', measure);
    document.fonts?.ready.then(measure);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [lang]);
  useEffect(
    () => () => {
      film.coin.r = 0;
    },
    [],
  );

  // Word-by-word rise through line masks once the preloader hands over.
  useGSAP(
    (_, contextSafe) => {
      if (!introDone || prefersReducedMotion() || !splitText || !contextSafe) return;
      let alive = true;
      let split: { revert: () => void } | null = null;
      splitText.then(
        contextSafe((SplitText: typeof import('gsap/SplitText').SplitText) => {
          if (!alive) return;
          const s = SplitText.create('[data-hero-title]', { type: 'words,lines', mask: 'lines', linesClass: 'mask-line', wordsClass: 'hero-word' });
          split = s;
          gsap
            .timeline()
            .from(s.words, { yPercent: 115, duration: 1.15, ease: 'expo.out', stagger: 0.06 })
            .from('[data-hero-hi]', { y: 24, opacity: 0, duration: 1, ease: 'expo.out' }, '-=0.8')
            .from('[data-hero-cta] > *', { y: 20, opacity: 0, duration: 0.8, ease: 'expo.out', stagger: 0.07 }, '-=0.8')
            .from('[data-hero-eyebrow]', { opacity: 0, duration: 0.8 }, '<');
        }),
      );
      return () => {
        alive = false;
        split?.revert();
      };
    },
    { scope: root, dependencies: [introDone] },
  );

  // Scroll: the coin turns edge-on, the headline lifts away (and stops taking clicks).
  useGSAP(
    () => {
      const el = root.current!;
      if (prefersReducedMotion()) return;
      gsap
        .timeline({ scrollTrigger: ranges.pin(el) })
        .to(film.u.hero, { turn: 1, lift: 1, ease: 'power3.inOut', duration: 1 }, 0)
        .to('[data-hero-copy]', { yPercent: -18, autoAlpha: 0, ease: 'power2.in', duration: 0.5 }, 0.05)
        .to('[data-scroll-cue]', { opacity: 0, duration: 0.2 }, 0)
        // the last beat is never empty: new arrivals rise in as the headline leaves
        .call(() => setRailOn(true), undefined, 0.2)
        .fromTo('[data-new-arrivals]', { autoAlpha: 0, y: 40 }, { autoAlpha: 1, y: 0, ease: 'power2.out', duration: 0.3 }, 0.45);
    },
    { scope: root },
  );

  return (
    <Section index={0} ref={root}>
      <div data-hero-stage className="sticky top-0 h-svh overflow-hidden">
        {media ? <HeroVideo media={media} /> : brand.logo.hasArtwork && <PosterCoin />}
        {/* copy sits at the bottom on portrait screens (the coin above it), centred beside the coin on landscape ones */}
        <div
          data-hero-copy
          className="relative z-10 mx-auto flex h-full max-w-[1600px] flex-col justify-end px-safe pb-[calc(var(--tabbar-h)+var(--safe-b)+clamp(1rem,3.5svh,2.25rem))] md:justify-center md:px-safe-12 md:pb-0 md:portrait:justify-end md:portrait:pb-[13svh] md:short:pt-[var(--header-h)]"
        >
          <p data-hero-eyebrow className="label mb-3 text-gold-text md:mb-5 short:mb-2 short:text-xs short:tracking-[0.08em] md:short:mb-2">
            {brand.tagline} · {brand.location.city}
          </p>
          <h1
            data-hero-title
            className="hero-title chapter-title max-w-[11ch] text-fg text-[length:clamp(2.4rem,min(13vw,7.6svh),11.5rem)] md:text-[length:clamp(2.4rem,min(11vw,20svh),11.5rem)] short:text-[length:clamp(2.2rem,12svh,11.5rem)] md:short:text-[length:clamp(2.2rem,min(11vw,14svh),11.5rem)]"
          >
            <Accent text={brand.copy.hero.en} word="Devotion" />
          </h1>
          <p
            data-hero-hi
            lang="hi"
            className="font-hindi-display mt-[clamp(0.5rem,2svh,1rem)] text-[length:clamp(1.05rem,3.2svh,1.25rem)] text-fg/90 md:mt-4 md:text-[length:clamp(1.25rem,min(2.4vw,4svh),2.2rem)] short:mt-1 md:short:mt-1"
          >
            {brand.copy.hero.hi}
          </p>
          <div data-hero-cta className="mt-[clamp(1rem,4svh,2rem)] flex flex-wrap items-center gap-x-3 gap-y-2 md:mt-8 short:mt-3 md:short:mt-3">
            <Link href="/shop/sarees" className="btn btn-gold max-xs:px-4 max-xs:tracking-[0.08em] short:min-h-11" data-magnetic>{t('shopSarees')}</Link>
            <Link href="/shop/suits" className="btn btn-ghost max-xs:px-4 max-xs:tracking-[0.08em] short:min-h-11" data-magnetic>{t('shopSuits')}</Link>
            <Link href="/shop" className="label ml-1 inline-flex min-h-11 items-center rounded-full px-3 text-fg-muted underline decoration-gold-line underline-offset-[6px] hover:text-gold-text">
              {t('skipToShop')} →
            </Link>
          </div>
        </div>
        <div data-scroll-cue aria-hidden className="absolute bottom-[calc(var(--tabbar-h)+var(--safe-b)+1rem)] left-1/2 hidden -translate-x-1/2 flex-col items-center gap-2 text-xs uppercase tracking-[0.08em] text-fg-muted md:bottom-8 md:flex md:short:hidden">
          Scroll
          <span className="h-10 w-px animate-pulse bg-gradient-to-b from-gold-text to-transparent" />
        </div>
        <NewArrivals
          title={t('newArrivals')}
          viewAll={t('viewAll')}
          show={railOn}
          data-new-arrivals="" className="invisible absolute inset-x-0 bottom-[calc(var(--tabbar-h)+var(--safe-b)+0.75rem)] z-20 opacity-0 motion-reduce:hidden md:bottom-8"
        />
        {/* measures the tab bar + home indicator the coin must stay above */}
        <div data-hero-bottom aria-hidden className="pointer-events-none invisible absolute inset-x-0 bottom-0 h-[calc(var(--tabbar-h)+var(--safe-b))] md:h-0" />
      </div>
      {/* reduced motion: no scroll choreography, so the rail simply follows the hero */}
      <NewArrivals title={t('newArrivals')} viewAll={t('viewAll')} className="relative z-10 hidden py-10 motion-reduce:block" />
    </Section>
  );
}
