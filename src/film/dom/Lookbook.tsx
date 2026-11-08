'use client';
import Image from 'next/image';
import { useRef } from 'react';
import { Section, ranges } from './Section';
import { brand } from '@/brand.config';
import { gsap, useGSAP, prefersReducedMotion } from '@/lib/gsap';
import { film } from '../state';
import { useUI } from '@/lib/store';
import { IconInstagram } from '@/components/icons';
import { useT } from '@/lib/i18n';

const LOOKS = Array.from({ length: 8 }, (_, i) => `/lookbook/look-${i + 1}.webp`);

/** Desktop + tier ≥ 2: a 3D cylindrical wall behind this section. Elsewhere: a flat, swipeable reel. */
export function Lookbook({ stageReady }: { stageReady: boolean }) {
  const root = useRef<HTMLElement>(null);
  const tier = useUI((s) => s.tier);
  const t = useT();
  const wall3D = stageReady && tier >= 2;

  useGSAP(
    () => {
      const el = root.current!;
      if (prefersReducedMotion()) return;
      gsap.fromTo(film.u.lookbook, { show: 0 }, { show: 1, ease: 'none', scrollTrigger: ranges.enter(el) });
      gsap.fromTo(film.u.lookbook, { spin: 0 }, { spin: 1, ease: 'none', scrollTrigger: ranges.pin(el) });
      gsap.to(film.u.lookbook, { show: 0, ease: 'none', scrollTrigger: ranges.exit(el), immediateRender: false });
    },
    { scope: root },
  );

  const cta = (
    <a href={brand.instagram.url} target="_blank" rel="noopener noreferrer" className="btn btn-gold" data-magnetic>
      <IconInstagram size={18} /> {t('follow')} @{brand.instagram.handle}
    </a>
  );

  return (
    <Section index={8} ref={root} label="Lookbook" className="max-md:!h-auto">
      <div className="sticky top-0 flex h-svh flex-col justify-end pb-16 max-md:static max-md:h-auto max-md:py-[14svh]">
        <div className="mx-auto w-full max-w-[1600px] px-5 md:px-12">
          <p className="label mb-3 text-gold-500">{t('lookbook')}</p>
          <h2 className="font-display text-[clamp(2.6rem,7vw,7rem)] leading-[0.95] text-gold">Lookbook</h2>
          <p className="mt-2 max-w-md text-ivory-dim">Curated from our store in {brand.location.city}. More every week on Instagram.</p>
        </div>
        {/* flat reel: phones, lower tiers, reduced motion */}
        <div className={`no-scrollbar mt-8 flex snap-x snap-mandatory gap-4 overflow-x-auto px-5 md:px-12 ${wall3D ? 'md:hidden' : ''}`} data-cursor="Drag">
          {LOOKS.map((src, i) => (
            <Image key={src} src={src} alt={`Lookbook ${i + 1}`} width={600} height={800} sizes="(min-width: 768px) 22vw, 70vw" className="aspect-[3/4] w-[70vw] shrink-0 snap-center rounded-[16px] object-cover md:w-[22vw]" />
          ))}
        </div>
        <div className="mx-auto mt-8 w-full max-w-[1600px] px-5 md:px-12">{cta}</div>
      </div>
    </Section>
  );
}
