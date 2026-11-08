'use client';
import Link from 'next/link';
import { useEffect, useRef } from 'react';
import { Section, ranges } from './Section';
import { brand } from '@/brand.config';
import { gsap, SplitText, useGSAP, prefersReducedMotion } from '@/lib/gsap';
import { film } from '../state';
import { useLang, useT } from '@/lib/i18n';

/**
 * The coin's preferred spot, as fractions of the viewport height — where it has always sat:
 * right of the headline on landscape screens (x = W/2 + dx·H), above it on portrait ones.
 * It keeps that spot whenever it fits, and otherwise shrinks and slides into the free space.
 */
const COIN = {
  wide: { dx: 0.479, y: 0.488, r: 0.247 },
  tall: { dx: 0, y: 0.316, r: 0.1365 },
};

/** Fit the coin into the space the hero copy leaves free (screen px at rest, scroll 0). */
function placeCoin(root: HTMLElement) {
  const W = window.innerWidth;
  const H = window.innerHeight;
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

export function Hero({ introDone }: { introDone: boolean }) {
  const root = useRef<HTMLElement>(null);
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
        if (c) Object.assign(film.coin, c);
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
    () => {
      if (!introDone || prefersReducedMotion()) return;
      const split = SplitText.create('[data-hero-title]', { type: 'words,lines', mask: 'lines', linesClass: 'mask-line', wordsClass: 'text-gold' });
      const tl = gsap.timeline();
      tl.from(split.words, { yPercent: 115, duration: 1.15, ease: 'expo.out', stagger: 0.06 })
        .from('[data-hero-hi]', { y: 24, opacity: 0, duration: 1, ease: 'expo.out' }, '-=0.8')
        .from('[data-hero-cta] > *', { y: 20, opacity: 0, duration: 0.8, ease: 'expo.out', stagger: 0.07 }, '-=0.8')
        .from('[data-hero-eyebrow]', { opacity: 0, duration: 0.8 }, '<');
      return () => split.revert();
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
        .to('[data-hero-copy]', { yPercent: -18, autoAlpha: 0, ease: 'power2.in', duration: 0.55 }, 0.1)
        .to('[data-scroll-cue]', { opacity: 0, duration: 0.2 }, 0);
    },
    { scope: root },
  );

  return (
    <Section index={0} ref={root}>
      <div className="sticky top-0 h-svh overflow-hidden">
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
            className="hero-title chapter-title max-w-[11ch] text-gold-glint text-[length:clamp(2.4rem,min(13vw,7.6svh),11.5rem)] md:text-[length:clamp(2.4rem,min(11vw,20svh),11.5rem)] short:text-[length:clamp(2.2rem,12svh,11.5rem)] md:short:text-[length:clamp(2.2rem,min(11vw,14svh),11.5rem)]"
          >
            {brand.copy.hero.en}
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
        {/* measures the tab bar + home indicator the coin must stay above */}
        <div data-hero-bottom aria-hidden className="pointer-events-none invisible absolute inset-x-0 bottom-0 h-[calc(var(--tabbar-h)+var(--safe-b))] md:h-0" />
      </div>
    </Section>
  );
}
