import type { Metadata, Viewport } from 'next';
import Link from 'next/link';
import './globals.css';
import { fontVars } from '@/lib/fonts';
import { brand } from '@/brand.config';
import { Providers } from '@/components/Providers';
import { Themes } from '@/components/Theme';
import { Header } from '@/components/Header';
import { TabBar } from '@/components/TabBar';
import { Footer } from '@/components/Footer';
import { LazySearch, LazyBag } from '@/components/LazySearch';
import { Cursor } from '@/components/Cursor';
import { RouteCurtain } from '@/components/RouteCurtain';
import { storeJsonLd, ld } from '@/lib/seo';
import { validateCatalog } from '@/lib/catalog.server';

validateCatalog();

export const metadata: Metadata = {
  metadataBase: new URL(brand.siteUrl),
  title: {
    default: `${brand.name} — Sarees & Ladies Suits in Banswara`,
    template: `%s · ${brand.name}`,
  },
  description:
    'Shree Collection, Banswara: Banarasi, Chanderi, Bandhani and Leheriya sarees, Anarkali, Sharara and salwar suits. Shop online and order on WhatsApp, or visit us in Banswara, Rajasthan.',
  applicationName: brand.name,
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    siteName: brand.name,
    locale: 'en_IN',
    alternateLocale: ['hi_IN'],
  },
  twitter: { card: 'summary_large_image' },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  // Static values: metadata can't read CSS. Kept equal to --kagaz / --raat (check:contrast verifies).
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#FAF5EC' },
    { media: '(prefers-color-scheme: dark)', color: '#07060A' },
  ],
  colorScheme: 'light dark',
  viewportFit: 'cover',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="en-IN" className={fontVars} data-tier="2" suppressHydrationWarning>
      <body>
        <a href="#main" className="sr-only z-[200] rounded-full bg-cta-bg px-4 py-3 text-cta-text focus:not-sr-only focus:fixed focus:left-4 focus:top-4">
          Skip to content
        </a>
        <Link href="/shop" className="sr-only z-[200] rounded-full bg-cta-bg px-4 py-3 text-cta-text focus:not-sr-only focus:fixed focus:left-4 focus:top-4">
          Skip to shop
        </Link>
        <Themes>
        <Providers>
          <Header />
          {children}
          <Footer />
          <TabBar />
          <LazyBag />
          <LazySearch />
          <Cursor />
          <RouteCurtain />
        </Providers>
        </Themes>
        <div className="grain" aria-hidden />
        <div className="vignette" aria-hidden />
        <script type="application/ld+json" dangerouslySetInnerHTML={ld(storeJsonLd())} />
      </body>
    </html>
  );
}
