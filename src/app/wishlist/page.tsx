import type { Metadata } from 'next';
import { Page, PageHeading } from '@/components/Page';
import { WishlistGrid } from '@/components/WishlistGrid';

export const metadata: Metadata = { title: 'Wishlist', robots: { index: false } };

export default function WishlistPage() {
  return (
    <Page>
      <PageHeading eyebrow="Saved for later" title="Wishlist" titleHi="पसंदीदा" />
      <WishlistGrid />
    </Page>
  );
}
