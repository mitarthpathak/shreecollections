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
import { SiteOnly } from '@/components/SiteChrome';
import { storeJsonLd, ld } from '@/lib/seo';
import { getCatalog } from '@/lib/catalog.server';
import { CatalogProvider } from '@/components/CatalogProvider';

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

export default async function RootLayout({ children }: LayoutProps<'/'>) {
  // validated on the server (Supabase when connected, else data/products.json); every page shares it
  const products = await getCatalog();
  return (
    <html lang="en-IN" className={fontVars} data-tier="2" suppressHydrationWarning>
      <body>
        <a href="#main" className="sr-only z-[200] rounded-full bg-cta-bg px-4 py-3 text-cta-text focus:not-sr-only focus:fixed focus:left-4 focus:top-4">
          Skip to content
        </a>
        <SiteOnly>
          <Link href="/shop" className="sr-only z-[200] rounded-full bg-cta-bg px-4 py-3 text-cta-text focus:not-sr-only focus:fixed focus:left-4 focus:top-4">
            Skip to shop
          </Link>
        </SiteOnly>
        <Themes>
        <CatalogProvider products={products}>
        <Providers>
          {/* the admin panel (/admin) has its own top bar and none of the storefront's chrome */}
          <SiteOnly>
            <Header />
          </SiteOnly>
          {children}
          <SiteOnly>
            <Footer />
            <TabBar />
            <LazyBag />
            <LazySearch />
            <Cursor />
            <RouteCurtain />
          </SiteOnly>
        </Providers>
        </CatalogProvider>
        </Themes>
        <SiteOnly>
          <div className="grain" aria-hidden />
          <div className="vignette" aria-hidden />
        </SiteOnly>
        <script type="application/ld+json" dangerouslySetInnerHTML={ld(storeJsonLd())} />
      </body>
    </html>
  );
}
