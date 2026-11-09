import type { Metadata } from 'next';
import { Page, PageHeading } from '@/components/Page';
import { brand } from '@/brand.config';

export const metadata: Metadata = {
  title: 'About',
  description: `${brand.name} is a ladies' garments store in ${brand.location.city}, ${brand.location.state}, for suits and sarees.`,
  alternates: { canonical: '/about' },
};

export default function AboutPage() {
  return (
    <Page>
      <PageHeading eyebrow={brand.tagline} title="Our Story" titleHi="हमारी कहानी" />
      <div className="mx-auto max-w-3xl space-y-6 px-4 pb-20 md:px-8">
        {brand.ownerStory ? (
          brand.ownerStory.map((p) => (
            <p key={p} className="font-editorial text-2xl leading-relaxed text-fg/90">{p}</p>
          ))
        ) : (
          <p className="font-editorial text-2xl leading-relaxed text-fg/90">
            {brand.name} is a ladies&apos; garments store in {brand.location.city}, {brand.location.state}, for suits and sarees —
            Banarasi and Chanderi, Bandhani and Leheriya, Anarkali and Sharara.
          </p>
        )}
      </div>
    </Page>
  );
}
