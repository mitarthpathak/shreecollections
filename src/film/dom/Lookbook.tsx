'use client';
import Image from 'next/image';
import { useRef } from 'react';
import { Section, ranges } from './Section';
import { brand } from '@/brand.config';
import { gsap, useGSAP, prefersReducedMotion } from '@/lib/gsap';
import { film } from '../state';
import { IconInstagram } from '@/components/icons';
import { useT } from '@/lib/i18n';

const LOOKS = Array.from({ length: 8 }, (_, i) => `/lookbook/look-${i + 1}.webp`);

/**
 * Desktop + tier ≥ 2: a 3D cylindrical wall behind this section. Elsewhere: a flat, swipeable reel.
 * `wall3D` is true only while that wall is actually on stage (Film knows the tier, the phone
 * layout — which can change with rotation — and whether the stage is ready).
 */
export function Lookbook({ wall3D }: { wall3D: boolean }) {
  const root = useRef<HTMLElement>(null);
  const t = useT();

  useGSAP(
    () => {
      const el = root.current!;
      if (prefersReducedMotion()) return;
      gsap.timeline({ scrollTrigger: ranges.pass(el) })
        .fromTo(film.u.lookbook, { show: 0 }, { show: 1, duration: 2.5, ease: 'none' }, 0)
        .fromTo(film.u.lookbook, { spin: 0 }, { spin: 1, duration: 10, ease: 'none' }, 0)
        .to(film.u.lookbook, { show: 0, duration: 2, ease: 'none' }, 8);
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
      <div className="sticky top-0 flex h-svh flex-col justify-end pb-16 max-md:static max-md:h-auto max-md:py-[14svh] md:short:pb-4">
        <div className="mx-auto w-full max-w-[1600px] px-safe md:px-safe-12">
          <p className="label mb-3 text-gold-text short:mb-1">{t('lookbook')}</p>
          <h2 className="font-display text-[length:clamp(2.6rem,min(7vw,13svh),7rem)] leading-[0.95] text-gold">Lookbook</h2>
          <p className="mt-2 max-w-md text-fg-muted md:short:hidden">Curated from our store in {brand.location.city}. More every week on Instagram.</p>
        </div>
        {/* flat reel: phones, lower tiers, reduced motion */}
        <div className={`no-scrollbar mt-8 flex snap-x snap-mandatory gap-4 overflow-x-auto px-safe md:px-safe-12 short:mt-3 ${wall3D ? 'md:hidden' : ''}`} data-cursor="Drag">
          {LOOKS.map((src, i) => (
            <Image key={src} src={src} alt={`Lookbook ${i + 1}`} width={600} height={800} sizes="(min-width: 768px) 22vw, 70vw" className="aspect-[3/4] w-[70vw] shrink-0 snap-center rounded-[16px] object-cover md:w-[22vw] short:w-[min(70vw,56svh)] md:short:w-[26svh]" />
          ))}
        </div>
        <div className="mx-auto mt-8 w-full max-w-[1600px] px-safe md:px-safe-12 short:mt-3">{cta}</div>
      </div>
    </Section>
  );
}
