import type { MetadataRoute } from 'next';
import { productMedia } from '@/lib/catalog';
import { getCatalog } from '@/lib/catalog.server';
import { absUrl } from '@/lib/seo';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const pages = ['/', '/shop', '/shop/sarees', '/shop/suits', '/lookbook', '/visit', '/about', '/policies/shipping', '/policies/returns', '/policies/privacy'];
  return [
    ...pages.map((p) => ({ url: absUrl(p), lastModified: now, changeFrequency: 'weekly' as const, priority: p === '/' ? 1 : 0.7 })),
    ...(await getCatalog()).map((p) => ({ url: absUrl(`/product/${p.slug}`), lastModified: p.updatedAt ? new Date(p.updatedAt) : now, changeFrequency: 'weekly' as const, priority: 0.8, images: productMedia(p).map((i) => absUrl(i)) })),
  ];
}
