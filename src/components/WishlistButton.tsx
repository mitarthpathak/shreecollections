'use client';
import { useRef } from 'react';
import { IconHeart } from './icons';
import { useShop, useUI } from '@/lib/store';
import { useT } from '@/lib/i18n';
import { goldBurst } from '@/lib/fx';
import { gsap } from '@/lib/gsap';

export function WishlistButton({ slug, className = '', size = 20 }: { slug: string; className?: string; size?: number }) {
  const ref = useRef<HTMLButtonElement>(null);
  const on = useShop((s) => s.wishlist.includes(slug));
  const hydrated = useUI((s) => s.hydrated);
  const toggle = useShop((s) => s.toggleWish);
  const t = useT();
  const active = hydrated && on;
  return (
    <button
      ref={ref}
      type="button"
      aria-pressed={active}
      aria-label={t('wishlist')}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        const nowOn = toggle(slug);
        if (ref.current) {
          gsap.fromTo(ref.current, { scale: 0.8 }, { scale: 1, duration: 0.4, ease: 'back.out(3)' });
          if (nowOn) goldBurst(ref.current);
        }
      }}
      className={`grid h-11 w-11 place-items-center rounded-full bg-raat/55 transition-colors ${active ? 'text-sindoor' : 'text-ivory hover:text-gold-100'} ${className}`}
    >
      <IconHeart size={size} filled={active} />
    </button>
  );
}
