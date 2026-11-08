import type { NextConfig } from 'next';

// Choice: Cache Components is left off. With it on, Next keeps visited routes mounted
// inside a hidden <Activity>, which would keep a WebGL context and pinned scroll
// timelines alive behind the shop pages. The brief wants the stage fully unmounted
// there, and every page here is static anyway.
const nextConfig: NextConfig = {
  reactStrictMode: true,
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
  },
};

export default nextConfig;
