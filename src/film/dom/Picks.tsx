'use client';
import { useRef } from 'react';
import { Section, ranges } from './Section';
import { brand } from '@/brand.config';
import { getBestsellers } from '@/lib/catalog';
import { gsap, useGSAP, prefersReducedMotion } from '@/lib/gsap';
import { film } from '../state';
import { ProductCard } from '@/components/ProductCard';
import { useT } from '@/lib/i18n';
import Link from 'next/link';

/** Makhan Chor Picks: the matki tilts and pours gold into the bestseller cards. */
export function Picks() {
  const root = useRef<HTMLElement>(null);
  const t = useT();
  const items = getBestsellers(4);
  useGSAP(
    () => {
      const el = root.current!;
      if (prefersReducedMotion()) return;
      gsap.fromTo(film.u.picks, { show: 0 }, { show: 1, ease: 'none', scrollTrigger: ranges.enter(el) });
      gsap.fromTo(film.u.picks, { pour: 0 }, { pour: 1, ease: 'none', scrollTrigger: { trigger: el, start: 'top 60%', end: 'bottom bottom', scrub: 1 } });
      gsap.to(film.u.picks, { show: 0, ease: 'none', scrollTrigger: ranges.exit(el), immediateRender: false });
      gsap.from('[data-pick]', { y: 60, opacity: 0, stagger: 0.08, ease: 'expo.out', scrollTrigger: { trigger: '[data-picks-grid]', start: 'top 85%', end: 'top 45%', scrub: 1 } });
    },
    { scope: root },
  );
  return (
    <Section index={7} ref={root} label="Makhan Chor Picks: bestsellers" className="!h-auto min-h-[var(--m)] md:min-h-[var(--d)]">
      <div className="mx-auto max-w-[1600px] px-5 py-[18svh] md:px-12">
        <header className="mb-12 max-w-4xl md:ml-auto md:text-right">
          <p className="label mb-3 text-gold-500">Makhan Chor Picks · {t('bestseller')}</p>
          <h2 className="font-display text-[clamp(2.2rem,5.5vw,5.5rem)] leading-[0.98] text-gold">{brand.copy.bestsellers.en}</h2>
          <p lang="hi" className="font-hindi-display mt-3 text-xl text-ivory/80 md:text-2xl">{brand.copy.bestsellers.hi}</p>
        </header>
        <div data-picks-grid className="grid grid-cols-2 gap-x-3 gap-y-10 sm:gap-x-5 md:grid-cols-4">
          {items.map((p) => (
            <div key={p.slug} data-pick>
              <ProductCard product={p} sizes="(min-width: 768px) 24vw, 46vw" />
            </div>
          ))}
        </div>
        <div className="mt-10 text-center">
          <Link href="/shop?sort=bestseller" className="btn btn-ghost" data-magnetic>{t('viewAll')} {t('bestseller')} →</Link>
        </div>
      </div>
    </Section>
  );
}
