import type { Metadata } from 'next';
import Image from 'next/image';
import { Page, PageHeading } from '@/components/Page';
import { brand } from '@/brand.config';
import { IconInstagram } from '@/components/icons';

export const metadata: Metadata = {
  title: 'Lookbook',
  description: 'The Shree Collection lookbook: sarees and suits from our Banswara store.',
  alternates: { canonical: '/lookbook' },
};

const LOOKS = Array.from({ length: 8 }, (_, i) => `/lookbook/look-${i + 1}.webp`);

export default function LookbookPage() {
  return (
    <Page>
      <PageHeading eyebrow={`@${brand.instagram.handle}`} title="Lookbook" titleHi="लुकबुक">
        <a href={brand.instagram.url} target="_blank" rel="noopener noreferrer" className="btn btn-ghost mt-6">
          <IconInstagram size={18} /> Follow @{brand.instagram.handle}
        </a>
      </PageHeading>
      <div className="mx-auto max-w-[1600px] columns-2 gap-4 px-4 pb-20 md:columns-3 md:px-8 xl:columns-4">
        {LOOKS.map((src, i) => (
          <Image
            key={src}
            src={src}
            alt={`Shree Collection lookbook ${i + 1}`}
            width={900}
            height={1200}
            sizes="(min-width: 1280px) 24vw, (min-width: 768px) 32vw, 48vw"
            className="mb-4 w-full rounded-[14px]"
          />
        ))}
      </div>
    </Page>
  );
}
