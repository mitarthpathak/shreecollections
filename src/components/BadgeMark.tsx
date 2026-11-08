import Image from 'next/image';
import { useId } from 'react';
import { brand } from '@/brand.config';

/**
 * The circular badge. With the owner's corrected artwork in /public/brand/logo.png
 * (brand.logo.hasArtwork = true) it shows that image untouched. Until then it shows a
 * typographic stand-in: gold ring, a mor pankh eye, श्री and COLLECTION. It never
 * redraws the Krishna illustration, and never shows the GARAIENTS tagline.
 */
export function BadgeMark({ size = 44, className = '', priority = false }: { size?: number; className?: string; priority?: boolean }) {
  // Per-instance gradient ids: a shared id resolves to the first copy in the document,
  // which paints nothing if that copy sits inside display:none.
  const uid = useId().replace(/[^\w-]/g, '');
  const gold = `bm-gold-${uid}`;
  const eye = `bm-eye-${uid}`;
  if (brand.logo.hasArtwork) {
    return (
      <Image
        src={brand.logo.src}
        alt={brand.logo.alt}
        width={size}
        height={size}
        priority={priority}
        className={`rounded-full ${className}`}
      />
    );
  }
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      role="img"
      aria-label={`${brand.name} badge`}
      className={className}
    >
      <defs>
        <linearGradient id={gold} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#FFF1C1" />
          <stop offset="0.4" stopColor="#E9C46A" />
          <stop offset="0.75" stopColor="#C9962E" />
          <stop offset="1" stopColor="#8A6418" />
        </linearGradient>
        <radialGradient id={eye} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#1B2C7A" />
          <stop offset="0.45" stopColor="#0E7C7B" />
          <stop offset="0.75" stopColor="#E9C46A" />
          <stop offset="1" stopColor="#0E7C7B" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="100" cy="100" r="98" fill="#07060A" />
      <circle cx="100" cy="100" r="92" fill="none" stroke={`url(#${gold})`} strokeWidth="3" />
      <circle cx="100" cy="100" r="86" fill="none" stroke="#8A6418" strokeWidth="0.8" />
      {/* mor pankh eye */}
      <ellipse cx="100" cy="52" rx="14" ry="20" fill={`url(#${eye})`} />
      <path d="M100 74 C 98 90, 100 98, 100 104" stroke={`url(#${gold})`} strokeWidth="1.5" fill="none" />
      <text
        x="100"
        y="128"
        textAnchor="middle"
        fill={`url(#${gold})`}
        style={{ fontFamily: 'var(--font-tiro), serif', fontSize: 50 }}
      >
        श्री
      </text>
      <text
        x="100"
        y="152"
        textAnchor="middle"
        fill={`url(#${gold})`}
        style={{ fontFamily: 'var(--font-cinzel), serif', fontSize: 15, letterSpacing: 3.4 }}
      >
        COLLECTION
      </text>
      {/* leaf flourishes */}
      <path d="M58 160 q 18 -8 34 2 M142 160 q -18 -8 -34 2" stroke={`url(#${gold})`} strokeWidth="1.4" fill="none" />
      <path d="M62 158 q 4 -7 10 -6 q -2 6 -10 6Z M138 158 q -4 -7 -10 -6 q 2 6 10 6Z" fill={`url(#${gold})`} />
    </svg>
  );
}

/** Always inline-flex: to hide it at some widths, wrap it (a `hidden` class here would lose to inline-flex). */
export function Wordmark({ className = '' }: { className?: string }) {
  return (
    <span className={`inline-flex items-baseline gap-2 ${className}`}>
      <span lang="hi" className="text-gold font-hindi-display text-[1.35em] leading-none">
        {brand.wordmark.hi}
      </span>
      <span className="text-gold font-display tracking-[0.3em] text-[0.8em]">{brand.wordmark.en}</span>
    </span>
  );
}
