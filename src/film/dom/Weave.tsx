'use client';
import Link from 'next/link';
import { useRef } from 'react';
import { Section, ranges } from './Section';
import { WEAVE_FABRICS } from '../fabrics';
import { gsap, useGSAP, prefersReducedMotion } from '@/lib/gsap';
import { film } from '../state';
import { useT } from '@/lib/i18n';


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
      gsap.set(panels, { autoAlpha: 0 });
      gsap.set(panels[0], { autoAlpha: 1 });
      // One timeline across the whole pass (enter → pin → exit), duration 10.
      const tl = gsap.timeline({ scrollTrigger: ranges.pass(el) });
      tl.fromTo(film.u.weave, { assemble: 0 }, { assemble: 1, duration: 2.4, ease: 'none' }, 0)
        .fromTo(film.u.weave, { sheet: 0 }, { sheet: 1, duration: 0.9, ease: 'silk' }, 2.0)
        .fromTo(film.u.weave, { fabric: 0 }, { fabric: n - 1, duration: 5, ease: 'none' }, 2.8)
        .to(film.u.weave, { sheet: 0, duration: 1, ease: 'power1.in' }, 9);
      panels.forEach((p, i) => {
        if (i === 0) {
          tl.from(p.querySelectorAll('[data-rise]'), { yPercent: 110, stagger: 0.1, duration: 0.8, ease: 'expo.out' }, 1.6);
          return;
        }
        const at = 2.8 + (5 / (n - 1)) * i - 0.45;
        tl.to(panels[i - 1], { autoAlpha: 0, y: -40, duration: 0.3, ease: 'power2.in' }, at)
          .fromTo(p, { autoAlpha: 0, y: 40 }, { autoAlpha: 1, y: 0, duration: 0.4, ease: 'expo.out' }, at + 0.3)
          .from(p.querySelectorAll('[data-rise]'), { yPercent: 110, stagger: 0.05, duration: 0.5, ease: 'expo.out' }, at + 0.3);
      });
    },
    { scope: root },
  );

  return (
    <Section index={2} ref={root} label="The Weave: six fabrics" className="motion-reduce:!h-auto">
      <div className="sticky top-0 h-svh overflow-hidden motion-reduce:static motion-reduce:h-auto">
        <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-[55svh] bg-gradient-to-t from-raat via-raat/70 to-transparent motion-reduce:hidden" />
        <div className="relative mx-auto h-full max-w-[1600px] px-5 md:px-12 motion-reduce:h-auto motion-reduce:space-y-20 motion-reduce:py-24">
          {WEAVE_FABRICS.map((f, i) => (
            <article
              key={f.kind}
              data-fabric
              className="absolute inset-x-5 bottom-[calc(var(--tabbar-h)+var(--safe-b)+2rem)] md:inset-x-12 md:bottom-16 motion-reduce:relative motion-reduce:inset-auto"
            >
              <p className="label mb-3 text-gold-500 tabular-nums">
                {String(i + 1).padStart(2, '0')} / {String(WEAVE_FABRICS.length).padStart(2, '0')} · The Weave
              </p>
              <h2 className="flex flex-wrap items-baseline gap-x-6">
                <span className="mask-line">
                  <span data-rise className="chapter-title block text-gold">{f.kind}</span>
                </span>
                <span className="mask-line">
                  <span data-rise lang="hi" className="font-hindi-display block text-[clamp(1.8rem,5vw,5rem)] text-ivory/80">{f.hi}</span>
                </span>
              </h2>
              <p className="mask-line mt-3 max-w-xl">
                <span data-rise className="block font-editorial text-[clamp(1.2rem,2vw,1.7rem)] italic text-ivory/90">{f.line}</span>
              </p>
              <Link href={`/shop?fabric=${f.kind}`} className="btn btn-ghost mt-6" data-magnetic>
                {t('shopThisFabric')} →
              </Link>
            </article>
          ))}
        </div>
      </div>
    </Section>
  );
}
