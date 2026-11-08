import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Page } from '@/components/Page';
import { ProductView } from '@/components/product/ProductView';
import { getAllProducts, getProduct } from '@/lib/catalog';
import { breadcrumbJsonLd, productJsonLd, ld } from '@/lib/seo';
import { formatINR } from '@/lib/format';

export const dynamicParams = false;
export function generateStaticParams() {
  return getAllProducts().map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: PageProps<'/product/[slug]'>): Promise<Metadata> {
  const { slug } = await params;
  const p = getProduct(slug);
  if (!p) return {};
  const description = `${p.description} ${formatINR(p.price)} at Shree Collection, Banswara.`;
  return {
    title: p.name,
    description,
    alternates: { canonical: `/product/${p.slug}` },
    openGraph: { title: p.name, description, images: [{ url: p.images[0], width: 900, height: 1200, alt: p.name }] },
  };
}

export default async function ProductPage({ params }: PageProps<'/product/[slug]'>) {
  const { slug } = await params;
  const p = getProduct(slug);
  if (!p) notFound();
  const cat = p.category === 'saree' ? { name: 'Sarees', path: '/shop/sarees' } : { name: 'Suits', path: '/shop/suits' };
  return (
    <Page>
      <script type="application/ld+json" dangerouslySetInnerHTML={ld(productJsonLd(p))} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={ld(breadcrumbJsonLd([{ name: 'Shop', path: '/shop' }, cat, { name: p.name, path: `/product/${p.slug}` }]))}
      />
      <ProductView slug={p.slug} />
    </Page>
  );
}
