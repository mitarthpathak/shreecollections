import type { Metadata } from 'next';
import { ViewTransition } from 'react';
import { Film } from '@/film/Film';
import { brand } from '@/brand.config';

export const metadata: Metadata = {
  title: { absolute: `${brand.name} — Sarees & Ladies Suits in Banswara, Rajasthan` },
  description:
    'Draped in Devotion. Banarasi, Chanderi, Bandhani and Leheriya sarees; Anarkali, Sharara and salwar suits. Shree Collection, Banswara — shop online and order on WhatsApp.',
  alternates: { canonical: '/' },
};

export default function Home() {
  return (
    <ViewTransition enter="page" exit="page" default="none">
      <main id="main" className="relative">
        <Film />
      </main>
    </ViewTransition>
  );
}
