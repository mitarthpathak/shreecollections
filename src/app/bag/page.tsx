import type { Metadata } from 'next';
import { Page, PageHeading } from '@/components/Page';
import { BagContents } from '@/components/BagDrawer';

export const metadata: Metadata = { title: 'Your bag', robots: { index: false } };

export default function BagPage() {
  return (
    <Page>
      <PageHeading eyebrow="Checkout on WhatsApp" title="Your Bag" titleHi="आपका बैग" />
      <div className="mx-auto flex max-w-[1200px] px-4 pb-20 md:px-8">
        <BagContents variant="page" />
      </div>
    </Page>
  );
}
