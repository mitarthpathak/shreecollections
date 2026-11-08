import type { MetadataRoute } from 'next';
import { getAllProducts, productMedia } from '@/lib/catalog';
import { absUrl } from '@/lib/seo';

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const pages = ['/', '/shop', '/shop/sarees', '/shop/suits', '/lookbook', '/visit', '/about', '/policies/shipping', '/policies/returns', '/policies/privacy'];
  return [
    ...pages.map((p) => ({ url: absUrl(p), lastModified: now, changeFrequency: 'weekly' as const, priority: p === '/' ? 1 : 0.7 })),
    ...getAllProducts().map((p) => ({ url: absUrl(`/product/${p.slug}`), lastModified: now, changeFrequency: 'weekly' as const, priority: 0.8, images: productMedia(p).map((i) => absUrl(i)) })),
  ];
}
