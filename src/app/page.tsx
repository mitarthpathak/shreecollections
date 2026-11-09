import type { Metadata } from 'next';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { ViewTransition } from 'react';
import { Film } from '@/film/Film';
import { brand } from '@/brand.config';

export const metadata: Metadata = {
  title: { absolute: `${brand.name} — Sarees & Ladies Suits in Banswara, Rajasthan` },
  description:
    'Draped in Devotion. Banarasi, Chanderi, Bandhani and Leheriya sarees; Anarkali, Sharara and salwar suits. Shree Collection, Banswara — shop online and order on WhatsApp.',
  alternates: { canonical: '/' },
};

/** Optional hero drape video (docs/photo-guide.md). Checked at build time; absent → the 3D coin. */
function heroMedia() {
  const dir = join(process.cwd(), 'public', 'media');
  if (!existsSync(join(dir, 'hero-drape.mp4'))) return null;
  return { video: '/media/hero-drape.mp4', poster: existsSync(join(dir, 'hero-drape.webp')) ? '/media/hero-drape.webp' : null };
}

export default function Home() {
  return (
    <ViewTransition enter="page" exit="page" default="none">
      <main id="main" className="relative">
        <Film heroMedia={heroMedia()} />
      </main>
    </ViewTransition>
  );
}
