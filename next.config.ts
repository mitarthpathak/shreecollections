import type { NextConfig } from 'next';

// Choice: Cache Components is left off. With it on, Next keeps visited routes mounted
// inside a hidden <Activity>, which would keep a WebGL context and pinned scroll
// timelines alive behind the shop pages. The brief wants the stage fully unmounted
// there, and every page here is static anyway.
/**
 * The site's canonical origin: NEXT_PUBLIC_SITE_URL, else Vercel's production domain, else the
 * vercel.app URL. Inlined as NEXT_PUBLIC_SITE_URL so server and client agree.
 */
const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : 'https://shreecollections.vercel.app')
).replace(/\/$/, '');

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Always inlined, so ?debug / ?capture code is dead-code-eliminated from normal production builds.
  env: {
    NEXT_PUBLIC_FILM_DEBUG: process.env.NEXT_PUBLIC_FILM_DEBUG ?? '0',
    NEXT_PUBLIC_SITE_URL: SITE_URL,
    // whether the owner set a domain explicitly (for the owner checklist only)
    NEXT_PUBLIC_SITE_URL_SET: process.env.NEXT_PUBLIC_SITE_URL ? '1' : '',
  },
  poweredByHeader: false,
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [360, 414, 640, 768, 1024, 1280, 1536, 1920],
    imageSizes: [64, 96, 128, 200, 256, 320, 400],
    qualities: [70, 75, 80],
  },
  turbopack: {
    rules: {
      '*.css': {
        loaders: ['@tailwindcss/turbopack'],
        as: '*.css',
      },
    },
  },
  experimental: {
    optimizePackageImports: ['@react-three/drei', 'gsap'],
    // ~17 KB of Tailwind CSS arrives with the HTML instead of a render-blocking request:
    // first paint no longer waits one more round trip on slow mobile networks.
    inlineCss: true,
  },
};

export default nextConfig;
