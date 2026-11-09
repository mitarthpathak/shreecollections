import type { Metadata } from 'next';
import Link from 'next/link';
import { Page } from '@/components/Page';
import { brand } from '@/brand.config';

export const metadata: Metadata = {
  title: 'Page not found',
  description: brand.copy.notFound.en,
};

export default function NotFound() {
  return (
    <Page className="flex items-center">
      <div className="mx-auto flex max-w-3xl flex-col items-center px-6 py-16 text-center">
        <svg viewBox="0 0 320 200" className="w-full max-w-[420px]" role="img" aria-label="A tipped-over matki with makhan spilling out">
          <defs>
            <linearGradient id="nf-clay" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#B4553E" />
              <stop offset="1" stopColor="#5E2519" />
            </linearGradient>
            <linearGradient id="nf-gold" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor="#8A6418" />
              <stop offset="0.5" stopColor="#FFF1C1" />
              <stop offset="1" stopColor="#C9962E" />
            </linearGradient>
          </defs>
          <ellipse cx="160" cy="176" rx="140" ry="10" fill="#000" opacity="0.6" />
          {/* spilled makhan */}
          <path d="M196 150 C 220 140, 262 146, 290 160 C 300 166, 280 174, 250 172 C 228 171, 206 168, 196 160 Z" fill="#F3EAD8" />
          <circle cx="262" cy="150" r="7" fill="#FFF8E6" />
          <circle cx="282" cy="158" r="4" fill="#FFF8E6" />
          {/* matki on its side */}
          <g transform="rotate(-78 130 120)">
            <path d="M100 60 C 60 80, 52 150, 100 178 C 120 190, 160 190, 180 178 C 228 150, 220 80, 180 60 Z" fill="url(#nf-clay)" />
            <path d="M108 60 h 64 v -12 c 0 -6 -64 -6 -64 0 Z" fill="#7A3324" />
            <ellipse cx="140" cy="48" rx="34" ry="7" fill="#3a160f" stroke="url(#nf-gold)" strokeWidth="2" />
            <path d="M74 104 C 110 116, 170 116, 206 104" stroke="url(#nf-gold)" strokeWidth="3" fill="none" />
            <path d="M70 132 C 110 144, 170 144, 210 132" stroke="url(#nf-gold)" strokeWidth="1.5" fill="none" strokeDasharray="3 5" />
          </g>
        </svg>
        <p className="label mt-8 text-gold-500">404</p>
        <h1 className="mt-3 font-editorial text-3xl italic leading-snug text-ivory md:text-4xl">{brand.copy.notFound.en}</h1>
        <p lang="hi" className="font-hindi-display mt-3 text-lg text-ivory-dim">{brand.copy.notFound.hi}</p>
        <div className="mt-10 flex flex-wrap justify-center gap-3">
          <Link href="/shop" className="btn btn-gold">Back to the shop</Link>
          <Link href="/" className="btn btn-ghost">Back to the film</Link>
        </div>
      </div>
    </Page>
  );
}
