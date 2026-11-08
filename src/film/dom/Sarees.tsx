'use client';
import Image from 'next/image';
import Link from 'next/link';
import { useRef } from 'react';
import { Section, ranges } from './Section';
import { brand } from '@/brand.config';
import { getByCategory, type Product, productMedia } from '@/lib/catalog';
import { gsap, useGSAP, prefersReducedMotion } from '@/lib/gsap';
import { film } from '../state';
import { useLang, useT } from '@/lib/i18n';
import { useShop } from '@/lib/store';
import { threadToBag } from '@/lib/fx';
import { Price } from '@/components/Price';
import { WishlistButton } from '@/components/WishlistButton';
import { IconPlus } from '@/components/icons';

const SAREES = getByCategory('saree').slice(0, 8);

function Slide({ p, i }: { p: Product; i: number }) {
  const lang = useLang();
  const t = useT();
  const add = useShop((s) => s.add);
  const media = useRef<HTMLDivElement>(null);
  return (
    <article
      data-slide
      className="group relative w-full shrink-0 [perspective:900px] md:w-[26vw] md:min-w-[300px] md:max-w-[420px]"
      onPointerMove={(e) => {
        if (e.pointerType !== 'mouse') return;
        const r = e.currentTarget.getBoundingClientRect();
        gsap.to(e.currentTarget.querySelector('[data-tilt]'), {
          rotateY: ((e.clientX - r.left) / r.width - 0.5) * 10,
          rotateX: -((e.clientY - r.top) / r.height - 0.5) * 8,
          duration: 0.4,
          ease: 'power2.out',
        });
      }}
      onPointerLeave={(e) => gsap.to(e.currentTarget.querySelector('[data-tilt]'), { rotateX: 0, rotateY: 0, duration: 0.6, ease: 'power3.out' })}
    >
      <div data-tilt className="relative [transform-style:preserve-3d]">
        <Link href={`/product/${p.slug}`} data-cursor="View" className="block">
          <div ref={media} className="relative aspect-[3/4] overflow-hidden rounded-[18px] ring-1 ring-gold-line/50">
            <Image
              data-parallax
              src={productMedia(p)[0]}
              alt={`${p.name} — ${p.fabric} saree`}
              fill
              sizes="(min-width: 768px) 34vw, 95vw"
              className="scale-[1.18] object-cover"
              priority={i < 1}
            />
            <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-bg/80 to-transparent" />
          </div>
        </Link>
        <WishlistButton slug={p.slug} className="absolute right-3 top-3" />
        <button
          type="button"
          onClick={() => {
            add(p.slug);
            threadToBag(media.current);
          }}
          className="glass absolute bottom-3 right-3 flex min-h-11 items-center gap-1.5 rounded-full px-3.5 text-xs font-medium uppercase tracking-[0.08em] text-gold-text ring-1 ring-field-line hover:bg-cta-bg hover:text-cta-text"
          aria-label={`${t('quickAdd')}: ${p.name}`}
          data-cursor="Add"
        >
          <IconPlus size={16} /> {t('quickAdd')}
        </button>
      </div>
      <div className="mt-4 flex items-start justify-between gap-3">
        <div>
          <p className="label text-gold-text">{p.fabric}</p>
          <h3 className="mt-1 font-editorial text-xl font-medium text-fg" lang={lang === 'hi' ? 'hi' : undefined}>
            <Link href={`/product/${p.slug}`} className="hover:text-gold-text">{lang === 'hi' ? p.nameHi : p.name}</Link>
          </h3>
        </div>
        <Price price={p.price} mrp={p.mrp} size="sm" />
      </div>
    </article>
  );
}

export function Sarees() {
  const root = useRef<HTMLElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const t = useT();

  useGSAP(
    () => {
      const el = root.current!;
      if (prefersReducedMotion()) return;
      gsap.timeline({ scrollTrigger: ranges.pass(el) })
        .fromTo(film.u.ribbon, { show: 0 }, { show: 1, duration: 2, ease: 'none' }, 0)
        .fromTo(film.u.ribbon, { flow: 0 }, { flow: 1, duration: 10, ease: 'none' }, 0)
        .to(film.u.ribbon, { show: 0, duration: 2, ease: 'none' }, 8);
      const mm = gsap.matchMedia();
      mm.add('(min-width: 768px)', () => {
        const tr = track.current!;
        const dist = () => tr.scrollWidth - window.innerWidth + 48;
        const tl = gsap.timeline({ scrollTrigger: { ...ranges.pin(el), invalidateOnRefresh: true } });
        tl.to(tr, { x: () => -dist(), ease: 'none', duration: 1 }, 0)
          .fromTo('[data-parallax]', { xPercent: 6 }, { xPercent: -6, ease: 'none', duration: 1 }, 0);
      });
      mm.add('(max-width: 767px)', () => {
        const cards = gsap.utils.toArray<HTMLElement>('[data-stack]', el);
        cards.forEach((c, i) => {
          const next = cards[i + 1];
          if (!next) return;
          gsap.to(c.firstElementChild, {
            scale: 0.9,
            opacity: 0.5,
            ease: 'none',
            scrollTrigger: { trigger: next, start: 'top bottom', end: 'top 20%', scrub: true },
          });
        });
      });
      return () => mm.revert();
    },
    { scope: root },
  );

  const head = (
    <header className="mx-auto mb-8 max-w-[1600px] px-5 md:mb-10 md:px-12">
      <p className="label mb-3 text-gold-text">{t('sarees')} · {SAREES.length}+</p>
      <h2 className="font-editorial font-medium text-[clamp(2.6rem,7vw,7rem)] leading-[0.95] text-gold">{brand.copy.sarees.en}</h2>
      <p lang="hi" className="font-hindi-display mt-2 text-xl text-fg/80 md:text-2xl">{brand.copy.sarees.hi}</p>
    </header>
  );

  return (
    <Section index={3} ref={root} label="Six yards: sarees" className="max-md:!h-auto motion-reduce:!h-auto">
      {/* desktop: pinned horizontal gallery riding the ribbon */}
      <div className="sticky top-0 hidden h-svh flex-col justify-center overflow-hidden md:flex motion-reduce:static motion-reduce:h-auto motion-reduce:py-24">
        {head}
        <div ref={track} className="flex gap-8 pl-12 pr-[20vw] will-change-transform motion-reduce:overflow-x-auto motion-reduce:pr-12">
          {SAREES.map((p, i) => <Slide key={p.slug} p={p} i={i} />)}
          <Link href="/shop/sarees" className="grid aspect-[3/4] w-[22vw] min-w-[240px] shrink-0 place-items-center rounded-[18px] text-center ring-1 ring-field-line transition-colors hover:bg-surface" data-cursor="View">
            <span>
              <span className="font-editorial font-medium block text-3xl text-gold">{t('viewAll')}</span>
              <span className="label mt-2 block text-fg-muted">{t('sarees')} →</span>
            </span>
          </Link>
        </div>
      </div>
      {/* mobile: no horizontal pin — sticky cards scale down and stack */}
      <div className="py-20 md:hidden">
        {head}
        <div className="px-5">
          {SAREES.slice(0, 5).map((p, i) => (
            <div key={p.slug} data-stack className="sticky pb-6" style={{ top: `calc(var(--header-h) + ${i * 14}px)` }}>
              <div className="origin-top rounded-[22px] bg-bg/60 p-2">
                <Slide p={p} i={i} />
              </div>
            </div>
          ))}
          <Link href="/shop/sarees" className="btn btn-gold mt-4 w-full">{t('viewAll')} {t('sarees')}</Link>
        </div>
      </div>
    </Section>
  );
}
