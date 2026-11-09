import Image from 'next/image';
import { useId } from 'react';
import { brand } from '@/brand.config';
import { PEACOCK_EYE } from '@/film/peacock';

/**
 * The circular badge. With the owner's artwork (brand.logo.hasArtwork) it shows that image
 * untouched; without it, a typographic stand-in: gold ring, a mor pankh eye, श्री and
 * COLLECTION. It never redraws the Krishna illustration.
 */
export function BadgeMark({ size = 44, className = '', priority = false }: { size?: number; className?: string; priority?: boolean }) {
  // Per-instance gradient ids: a shared id resolves to the first copy in the document,
  // which paints nothing if that copy sits inside display:none.
  const uid = useId().replace(/[^\w-]/g, '');
  const gold = `bm-gold-${uid}`;
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
          <stop offset="0" style={{ stopColor: 'var(--gold-100)' }} />
          <stop offset="0.4" style={{ stopColor: 'var(--gold-300)' }} />
          <stop offset="0.75" style={{ stopColor: 'var(--gold-500)' }} />
          <stop offset="1" style={{ stopColor: 'var(--gold-700)' }} />
        </linearGradient>
      </defs>
      <circle cx="100" cy="100" r="98" style={{ fill: 'var(--raat)' }} />
      <circle cx="100" cy="100" r="92" fill="none" stroke={`url(#${gold})`} strokeWidth="3" />
      <circle cx="100" cy="100" r="86" fill="none" strokeWidth="0.8" style={{ stroke: 'var(--gold-700)' }} />
      {/* mor pankh eye */}
      {PEACOCK_EYE.map((r) => (
        <ellipse key={r.token} cx="100" cy={52 + r.dy * 20} rx={14 * r.rx} ry={20 * r.ry} style={{ fill: `var(${r.token})` }} />
      ))}
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
