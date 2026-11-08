import type { Metadata } from 'next';
import { Page, PageHeading } from '@/components/Page';
import { VisitView } from '@/components/visit/VisitView';
import { brand } from '@/brand.config';

export const metadata: Metadata = {
  title: 'Visit us in Banswara',
  description: `Visit Shree Collection in ${brand.location.city}, ${brand.location.state} for sarees and ladies suits. Directions, hours and WhatsApp.`,
  alternates: { canonical: '/visit' },
};

export default function VisitPage() {
  return (
    <Page>
      <PageHeading eyebrow="Banswara · Rajasthan" title="Visit Us" titleHi={brand.copy.visit.hi}>
        <p className="mt-4 max-w-xl font-editorial text-xl italic text-fg-muted">{brand.copy.visit.en}</p>
      </PageHeading>
      <VisitView />
    </Page>
  );
}
