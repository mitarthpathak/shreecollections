'use client';
import Image from 'next/image';
import Link from 'next/link';
import { useRef } from 'react';
import { Section, ranges } from './Section';
import { brand } from '@/brand.config';
import { getByCategory, type Product } from '@/lib/catalog';
import { gsap, ScrollTrigger, useGSAP, prefersReducedMotion } from '@/lib/gsap';
import { useLang, useT } from '@/lib/i18n';
import { Price } from '@/components/Price';

const WORDS = ['Salwar', 'Anarkali', 'Sharara', 'Co-ord'] as const;
const WORDS_HI: Record<string, string> = { Salwar: 'सलवार', Anarkali: 'अनारकली', Sharara: 'शरारा', 'Co-ord': 'को-ऑर्ड' };

/** A Rajasthani jharokha arch (cusped, pointed) as a clip-path polygon in %. `open` 0..1 swings the doors. */
function archPolygon(open: number) {
  const pts: [number, number][] = [];
  const shoulder = 34; // % from top where the arch meets the jambs
  const N = 28;
  for (let i = 0; i <= N; i++) {
    const t = i / N; // left jamb → apex → right jamb
    const side = t < 0.5 ? -1 : 1;
    const k = t < 0.5 ? t * 2 : (1 - t) * 2; // 0 at jamb, 1 at apex
    const x = 50 + side * 50 * (1 - Math.pow(k, 1.6));
    const cusp = Math.sin(k * Math.PI * 3) * 2.2 * (1 - k);
    const y = shoulder - Math.pow(k, 0.7) * shoulder + cusp;
    pts.push([x, Math.max(0, y)]);
  }
  const all: [number, number][] = [[0, 100], ...pts, [100, 100]];
  return `polygon(${all.map(([x, y]) => `${(50 + (x - 50) * open).toFixed(2)}% ${y.toFixed(2)}%`).join(',')})`;
}

function ArchCard({ p }: { p: Product }) {
  const lang = useLang();
  return (
    <Link href={`/product/${p.slug}`} data-arch className="group block" data-cursor="View">
      <div className="relative">
        <div data-arch-img className="relative aspect-[3/4] overflow-hidden" style={{ clipPath: archPolygon(1) }}>
          <Image src={p.images[0]} alt={`${p.name} — ${p.subcategory}`} fill sizes="(min-width: 768px) 40vw, 90vw" className="object-cover transition-transform duration-700 group-hover:scale-[1.03]" />
        </div>
        <svg viewBox="0 0 100 133" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden>
          <polygon
            points={archPolygon(1).replace('polygon(', '').replace(')', '').split(',').map((pt) => pt.trim().split(' ').map((v, j) => (parseFloat(v) * (j ? 1.33 : 1)).toFixed(2)).join(',')).join(' ')}
            fill="none"
            stroke="url(#arch-gold)"
            strokeWidth="0.5"
            vectorEffect="non-scaling-stroke"
          />
          <defs>
            <linearGradient id="arch-gold" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" style={{ stopColor: 'var(--metal-hi)' }} />
              <stop offset="1" style={{ stopColor: 'var(--metal-lo)' }} />
            </linearGradient>
          </defs>
        </svg>
      </div>
      <div className="mt-4 flex items-start justify-between gap-3">
        <div>
          <p className="label text-gold-text">{p.subcategory}</p>
          <h3 className="mt-1 font-editorial text-xl font-medium text-fg group-hover:text-gold-text" lang={lang === 'hi' ? 'hi' : undefined}>{lang === 'hi' ? p.nameHi : p.name}</h3>
        </div>
        <Price price={p.price} mrp={p.mrp} size="sm" />
      </div>
    </Link>
  );
}

export function Suits() {
  const root = useRef<HTMLElement>(null);
  const t = useT();
  const suits = getByCategory('suit');
  const picks = WORDS.map((w) => suits.find((s) => s.subcategory === w)).filter(Boolean) as Product[];

  useGSAP(
    () => {
      const el = root.current!;
      if (prefersReducedMotion()) return;
      // temple doors: each arch opens from a slit as it enters
      gsap.utils.toArray<HTMLElement>('[data-arch-img]', el).forEach((a) => {
        const o = { v: 0 };
        gsap.to(o, {
          v: 1,
          ease: 'power2.out',
          onUpdate: () => void (a.style.clipPath = archPolygon(Math.max(0.0001, o.v))),
          scrollTrigger: { trigger: a, start: 'top 85%', end: 'top 35%', scrub: 0.8 },
        });
      });
      // the sticky word cycles with the image passing
      const words = gsap.utils.toArray<HTMLElement>('[data-word]', el);
      gsap.utils.toArray<HTMLElement>('[data-arch]', el).forEach((a, i) => {
        ScrollTriggerOn(a, () => words.forEach((w, j) => w.toggleAttribute('data-on', j === i)));
      });
      gsap.from('[data-suits-head] > *', { y: 40, opacity: 0, stagger: 0.08, scrollTrigger: { ...ranges.enter(el), end: 'top 30%' } });
    },
    { scope: root },
  );

  return (
    <Section index={5} ref={root} label="Suits" className="!h-auto">
      <div className="mx-auto max-w-[1600px] px-5 pb-24 pt-[20svh] md:px-12">
        <header data-suits-head className="mb-10 md:mb-16">
          <p className="label mb-3 text-gold-text">{t('suits')}</p>
          <h2 className="font-editorial font-medium text-[clamp(2.6rem,7vw,7rem)] leading-[0.95] text-gold">{brand.copy.suits.en}</h2>
          <p lang="hi" className="font-hindi-display mt-2 text-xl text-fg/80 md:text-2xl">{brand.copy.suits.hi}</p>
        </header>
        <div className="grid gap-10 md:grid-cols-[1fr_1fr] md:gap-16">
          {/* left: sticky giant words (a sticky top band on phones) */}
          <div className="sticky top-[var(--header-h)] z-10 -mx-5 bg-gradient-to-b from-bg via-bg/90 to-transparent px-5 pb-6 pt-2 md:top-[calc(var(--header-h)+10svh)] md:mx-0 md:h-fit md:bg-none md:px-0">
            <ul className="no-scrollbar flex gap-3 overflow-x-auto whitespace-nowrap md:block md:space-y-1 md:overflow-visible">
              {WORDS.map((w, i) => (
                <li key={w} data-word data-on={i === 0 ? '' : undefined} className="group/w">
                  <span className="font-editorial font-medium text-[clamp(0.95rem,4.4vw,1.4rem)] leading-none text-outline-gold transition-colors duration-500 group-data-[on]/w:text-gold-text group-data-[on]/w:[-webkit-text-stroke:0] md:text-[clamp(3rem,7vw,8rem)]">
                    {w}
                  </span>
                  <span lang="hi" className="font-hindi-display ml-3 hidden text-lg text-fg-muted opacity-0 transition-opacity duration-500 group-data-[on]/w:opacity-100 md:inline">
                    {WORDS_HI[w]}
                  </span>
                </li>
              ))}
            </ul>
            <Link href="/shop/suits" className="btn btn-ghost mt-8 hidden md:inline-flex" data-magnetic>{t('shopSuits')} →</Link>
          </div>
          {/* right: images scroll past inside opening jharokha arches */}
          <div className="space-y-16 md:space-y-28 md:pt-[20svh]">
            {picks.map((p) => <ArchCard key={p.slug} p={p} />)}
            <Link href="/shop/suits" className="btn btn-gold w-full md:hidden">{t('shopSuits')}</Link>
          </div>
        </div>
      </div>
    </Section>
  );
}

function ScrollTriggerOn(el: Element, fn: () => void) {
  ScrollTrigger.create({ trigger: el, start: 'top 60%', end: 'bottom 40%', onToggle: (s) => s.isActive && fn() });
}
