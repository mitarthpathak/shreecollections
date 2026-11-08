import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { Page, PageHeading } from '@/components/Page';
import { ShopView, ShopViewStatic } from '@/components/shop/ShopView';
import { breadcrumbJsonLd, ld } from '@/lib/seo';

const CATS = {
  sarees: {
    category: 'saree' as const,
    title: 'Sarees',
    titleHi: 'साड़ियाँ',
    line: 'Six yards of poetry — Banarasi, Chanderi, Bandhani, Leheriya, georgette and cotton.',
    description: 'Sarees in Banswara: Banarasi silk, Chanderi, Bandhani, Leheriya, georgette and Kota cotton sarees from Shree Collection. Order on WhatsApp.',
  },
  suits: {
    category: 'suit' as const,
    title: 'Suits',
    titleHi: 'सूट',
    line: 'Grace, tailored — Anarkali, Sharara, salwar suits, co-ords and unstitched suit pieces.',
    description: 'Ladies suits in Banswara: Anarkali, Sharara, salwar suits, co-ord sets and unstitched suit pieces from Shree Collection. Order on WhatsApp.',
  },
};

export const dynamicParams = false;
export function generateStaticParams() {
  return Object.keys(CATS).map((category) => ({ category }));
}

export async function generateMetadata({ params }: PageProps<'/shop/[category]'>): Promise<Metadata> {
  const { category } = await params;
  const c = CATS[category as keyof typeof CATS];
  if (!c) return {};
  return { title: `${c.title} in Banswara`, description: c.description, alternates: { canonical: `/shop/${category}` } };
}

export default async function CategoryPage({ params }: PageProps<'/shop/[category]'>) {
  const { category } = await params;
  const c = CATS[category as keyof typeof CATS];
  if (!c) notFound();
  return (
    <Page>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={ld(breadcrumbJsonLd([{ name: 'Shop', path: '/shop' }, { name: c.title, path: `/shop/${category}` }]))}
      />
      <PageHeading eyebrow="Shree Collection · Banswara" title={c.title} titleHi={c.titleHi}>
        <p className="mt-4 max-w-xl font-editorial text-xl italic text-ivory-dim">{c.line}</p>
      </PageHeading>
      <Suspense fallback={<ShopViewStatic category={c.category} />}>
        <ShopView category={c.category} />
      </Suspense>
    </Page>
  );
}
