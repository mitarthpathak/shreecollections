import type { Metadata } from 'next';
import { Suspense } from 'react';
import { Page, PageHeading } from '@/components/Page';
import { ShopView } from '@/components/shop/ShopView';
import { GridSkeleton } from '@/components/shop/GridSkeleton';

export const metadata: Metadata = {
  title: 'Shop sarees & suits',
  description: 'Banarasi, Chanderi, Bandhani and Leheriya sarees; Anarkali, Sharara, salwar suits and co-ords from Shree Collection, Banswara. Filter by fabric, colour, occasion and price.',
  alternates: { canonical: '/shop' },
};

export default function ShopPage() {
  return (
    <Page>
      <PageHeading eyebrow="Shree Collection · Banswara" title="The Collection" titleHi="पूरा कलेक्शन">
        <p className="mt-4 max-w-xl font-editorial text-xl italic text-ivory-dim">
          Sarees and suits woven, tied and dyed across India, chosen by hand in Banswara.
        </p>
      </PageHeading>
      <Suspense fallback={<GridSkeleton />}>
        <ShopView />
      </Suspense>
    </Page>
  );
}
