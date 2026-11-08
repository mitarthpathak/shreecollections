import type { MetadataRoute } from 'next';
import { brand } from '@/brand.config';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: brand.name,
    short_name: 'Shree',
    description: brand.tagline,
    start_url: '/',
    display: 'standalone',
    background_color: '#07060A',
    theme_color: '#07060A',
    icons: [{ src: '/icon.svg', sizes: 'any', type: 'image/svg+xml' }],
  };
}
