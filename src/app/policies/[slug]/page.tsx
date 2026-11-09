import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Page, PageHeading } from '@/components/Page';
import { brand } from '@/brand.config';

const POLICIES = {
  shipping: {
    title: 'Shipping',
    titleHi: 'शिपिंग',
    body: brand.policies.shipping,
    interim: ['Orders are confirmed on WhatsApp, where we share the shipping charge and delivery time for your pincode.'],
  },
  returns: {
    title: 'Returns & Exchanges',
    titleHi: 'वापसी और बदलाव',
    body: brand.policies.returns,
    interim: ['Return and exchange terms are confirmed on WhatsApp before you pay.'],
  },
  privacy: {
    title: 'Privacy',
    titleHi: 'गोपनीयता',
    body: brand.policies.privacy,
    interim: [
      'This site stores your bag, wishlist and language choice only in your own browser. It uses no tracking cookies.',
      'When you order on WhatsApp, the message you choose to send (items, name and pincode) goes to us through WhatsApp and is used only to fulfil your order.',
    ],
  },
} as const;

export const dynamicParams = false;
export function generateStaticParams() {
  return Object.keys(POLICIES).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps<'/policies/[slug]'>): Promise<Metadata> {
  const { slug } = await params;
  const p = POLICIES[slug as keyof typeof POLICIES];
  return p ? { title: `${p.title} policy`, alternates: { canonical: `/policies/${slug}` } } : {};
}

export default async function PolicyPage({ params }: PageProps<'/policies/[slug]'>) {
  const { slug } = await params;
  const p = POLICIES[slug as keyof typeof POLICIES];
  if (!p) notFound();
  const body = p.body ?? p.interim;
  return (
    <Page>
      <PageHeading eyebrow="Policies" title={p.title} titleHi={p.titleHi} />
      <div className="mx-auto max-w-3xl space-y-5 px-4 pb-20 md:px-8">
        {body.map((para) => (
          <p key={para} className="text-lg leading-relaxed text-fg/90">{para}</p>
        ))}
      </div>
    </Page>
  );
}
