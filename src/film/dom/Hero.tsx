'use client';
import Link from 'next/link';
import { useRef } from 'react';
import { Section, ranges } from './Section';
import { brand } from '@/brand.config';
import { gsap, SplitText, useGSAP, prefersReducedMotion } from '@/lib/gsap';
import { film } from '../state';
import { useT } from '@/lib/i18n';

export function Hero({ introDone }: { introDone: boolean }) {
  const root = useRef<HTMLElement>(null);
  const t = useT();

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

  // Scroll: the coin turns edge-on, the headline lifts away.
  useGSAP(
    () => {
      const el = root.current!;
      if (prefersReducedMotion()) return;
      gsap.timeline({ scrollTrigger: ranges.pin(el) })
        .to(film.u.hero, { turn: 1, lift: 1, ease: 'power3.inOut', duration: 1 }, 0)
        .to('[data-hero-copy]', { yPercent: -18, opacity: 0, ease: 'power2.in', duration: 0.55 }, 0.1)
        .to('[data-scroll-cue]', { opacity: 0, duration: 0.2 }, 0);
    },
    { scope: root },
  );

  return (
    <Section index={0} ref={root}>
      <div className="sticky top-0 h-svh overflow-hidden">
        <div data-hero-copy className="relative z-10 mx-auto flex h-full max-w-[1600px] flex-col justify-end px-5 pb-[calc(var(--tabbar-h)+var(--safe-b)+4.25rem)] md:justify-center md:px-12 md:pb-0">
          <p data-hero-eyebrow className="label mb-3 text-gold-500 md:mb-5">
            {brand.tagline} · {brand.location.city}
          </p>
          <h1 data-hero-title className="chapter-title max-w-[11ch] text-gold-glint !text-[clamp(3.2rem,11vw,11.5rem)]">
            {brand.copy.hero.en}
          </h1>
          <p data-hero-hi lang="hi" className="font-hindi-display mt-4 text-[clamp(1.25rem,2.4vw,2.2rem)] text-ivory/90">
            {brand.copy.hero.hi}
          </p>
          <div data-hero-cta className="mt-8 flex flex-wrap items-center gap-3">
            <Link href="/shop/sarees" className="btn btn-gold" data-magnetic>{t('shopSarees')}</Link>
            <Link href="/shop/suits" className="btn btn-ghost" data-magnetic>{t('shopSuits')}</Link>
            <Link href="/shop" className="ml-1 inline-flex min-h-11 items-center rounded-full px-3 text-xs uppercase tracking-[0.2em] text-ivory-dim underline decoration-gold-700 underline-offset-[6px] hover:text-gold-100">
              {t('skipToShop')} →
            </Link>
          </div>
        </div>
        <div data-scroll-cue aria-hidden className="absolute bottom-[calc(var(--tabbar-h)+var(--safe-b)+1rem)] left-1/2 hidden -translate-x-1/2 flex-col items-center gap-2 text-[10px] uppercase tracking-[0.3em] text-ivory-dim md:bottom-8 md:flex">
          Scroll
          <span className="h-10 w-px animate-pulse bg-gradient-to-b from-gold-300 to-transparent" />
        </div>
      </div>
    </Section>
  );
}
