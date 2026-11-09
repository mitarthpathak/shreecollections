'use client';
import Link from 'next/link';
import { useRef } from 'react';
import { Section, ranges } from './Section';
import { CHAPTERS } from '../chapters';
import { WEAVE_FABRICS } from '../fabrics';
import { gsap, useGSAP, prefersReducedMotion } from '@/lib/gsap';
import '@/lib/gsap-silk';
import { film } from '../state';
import { useT } from '@/lib/i18n';

const SPAN = CHAPTERS[2].span;

/** The Weave: the thread becomes warp and weft, then silk; scroll cycles six fabrics. */
export function Weave() {
  const root = useRef<HTMLElement>(null);
  const t = useT();

  useGSAP(
    () => {
      const el = root.current!;
      if (prefersReducedMotion()) return;
      const panels = gsap.utils.toArray<HTMLElement>('[data-fabric]', el);
      const n = panels.length;
      const mm = gsap.matchMedia();
      mm.add({ mobile: '(max-width: 767px)', desktop: '(min-width: 768px)' }, (ctx) => {
        // One timeline across the whole pass, measured in svh of scroll:
        // entering (0 → 100), pinned (100 → span), leaving (span → span + 100).
        // The warp and weft assemble as the chapter scrolls in; every fabric then gets an
        // equal stretch of the pinned range, so each one is read while it is on screen.
        const span = ctx.conditions?.mobile ? SPAN.m : SPAN.d;
        const pin0 = 100;
        const end = span + 100;
        const slot = (span - pin0) / n;
        gsap.set(panels, { autoAlpha: 0, y: 0 });
        gsap.set(panels[0], { autoAlpha: 1 });
        const tl = gsap.timeline({ scrollTrigger: ranges.pass(el) });
        tl.fromTo(film.u.weave, { assemble: 0 }, { assemble: 1, duration: 80, ease: 'none' }, 0)
          .fromTo(film.u.weave, { sheet: 0 }, { sheet: 1, duration: 30, ease: 'silk' }, 65)
          .fromTo(film.u.weave, { fabric: 0 }, { fabric: 0, duration: 1, ease: 'none' }, 0)
          .from(panels[0].querySelectorAll('[data-rise]'), { yPercent: 110, stagger: 3, duration: 18, ease: 'expo.out' }, 75);
        panels.forEach((p, i) => {
          if (i === 0) return;
          const at = pin0 + slot * i; // panel i holds from here for one slot
          const blend = Math.min(10, slot * 0.4);
          tl.fromTo(film.u.weave, { fabric: i - 1 }, { fabric: i, duration: blend, ease: 'power1.inOut', immediateRender: false }, at - blend / 2)
            .to(panels[i - 1], { autoAlpha: 0, y: -40, duration: 4, ease: 'power2.in' }, at - 4)
            .fromTo(p, { autoAlpha: 0, y: 40 }, { autoAlpha: 1, y: 0, duration: 6, ease: 'expo.out' }, at)
            .from(p.querySelectorAll('[data-rise]'), { yPercent: 110, stagger: 1.5, duration: 7, ease: 'expo.out' }, at);
        });
        tl.to(film.u.weave, { sheet: 0, duration: 30, ease: 'power1.in' }, end - 30);
      });
      return () => mm.revert();
    },
    { scope: root },
  );

  return (
    <Section index={2} ref={root} label="The Weave: six fabrics" className="motion-reduce:!h-auto">
      <div className="sticky top-0 h-svh overflow-hidden motion-reduce:static motion-reduce:h-auto">
        <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-[55svh] bg-gradient-to-t from-bg via-bg/70 to-transparent motion-reduce:hidden" />
        <div className="relative mx-auto h-full max-w-[1600px] px-safe md:px-safe-12 motion-reduce:h-auto motion-reduce:space-y-20 motion-reduce:py-24">
          {WEAVE_FABRICS.map((f, i) => (
            <article
              key={f.kind}
              data-fabric
              className="absolute bottom-[calc(var(--tabbar-h)+var(--safe-b)+2rem)] left-[max(1.25rem,var(--safe-l))] right-[max(1.25rem,var(--safe-r))] md:bottom-16 md:left-[max(3rem,var(--safe-l))] md:right-[max(3rem,var(--safe-r))] short:bottom-[calc(var(--tabbar-h)+var(--safe-b)+0.75rem)] md:short:bottom-5 motion-reduce:relative motion-reduce:inset-auto"
            >
              <p className="label mb-3 text-gold-text tabular-nums short:mb-1">
                {String(i + 1).padStart(2, '0')} / {String(WEAVE_FABRICS.length).padStart(2, '0')} · The Weave
              </p>
              <h2 className="flex flex-wrap items-baseline gap-x-6">
                <span className="mask-line">
                  <span data-rise className="chapter-title block text-fg">{f.kind}</span>
                </span>
                <span className="mask-line">
                  <span data-rise lang="hi" className="font-hindi-display block text-[length:clamp(1.6rem,min(5vw,9svh),5rem)] text-fg/80">{f.hi}</span>
                </span>
              </h2>
              <p className="mask-line mt-3 max-w-xl short:mt-1">
                <span data-rise className="block font-editorial text-[clamp(1.2rem,2vw,1.7rem)] italic text-fg/90">{f.line}</span>
              </p>
              <Link href={`/shop?fabric=${f.kind}`} className="btn btn-ghost mt-6 short:mt-2 short:min-h-11" data-magnetic>
                {t('shopThisFabric')} →
              </Link>
            </article>
          ))}
        </div>
      </div>
    </Section>
  );
}
