import type { MetadataRoute } from 'next';
import { absUrl } from '@/lib/seo';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: ['/bag', '/wishlist', '/admin', '/api/'] }],
    sitemap: absUrl('/sitemap.xml'),
  };
}
