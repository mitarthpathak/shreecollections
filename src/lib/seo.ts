import { brand } from '@/brand.config';
import type { Product } from './catalog';

export const absUrl = (path = '/') => new URL(path, brand.siteUrl).toString();

/** ClothingStore with the facts we know; unknowns are omitted until set in brand.config.ts. */
export function storeJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'ClothingStore',
    '@id': absUrl('/#store'),
    name: brand.name,
    alternateName: brand.nameHi,
    description: `Ladies' suits and sarees in ${brand.location.city}, ${brand.location.state}: Banarasi, Chanderi, Bandhani, Leheriya and more.`,
    url: absUrl('/'),
    image: absUrl('/opengraph-image'),
    logo: brand.logo.hasArtwork ? absUrl(brand.logo.src) : absUrl('/icon.svg'),
    address: {
      '@type': 'PostalAddress',
      ...(brand.location.streetAddress ? { streetAddress: brand.location.streetAddress } : {}),
      addressLocality: brand.location.city,
      addressRegion: brand.location.state,
      ...(brand.location.postalCode ? { postalCode: brand.location.postalCode } : {}),
      addressCountry: brand.location.country,
    },
    geo: { '@type': 'GeoCoordinates', latitude: brand.location.lat, longitude: brand.location.lng },
    hasMap: brand.location.mapsUrl,
    ...(brand.contact.phone ? { telephone: brand.contact.phone } : {}),
    ...(brand.hours ? { openingHours: brand.hours.map((h) => `${h.days} ${h.open}-${h.close}`) } : {}),
    sameAs: [brand.instagram.url],
    priceRange: '₹1,499 – ₹24,999',
    currenciesAccepted: 'INR',
  };
}

export function productJsonLd(p: Product) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: p.name,
    alternateName: p.nameHi,
    sku: p.id,
    image: p.images.map((i) => absUrl(i)),
    description: p.description,
    category: p.category === 'saree' ? 'Sarees' : 'Suits',
    material: p.fabric,
    color: p.colorFamily,
    brand: { '@type': 'Brand', name: brand.name },
    offers: {
      '@type': 'Offer',
      url: absUrl(`/product/${p.slug}`),
      priceCurrency: 'INR',
      price: p.price,
      availability: p.inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      itemCondition: 'https://schema.org/NewCondition',
      seller: { '@id': absUrl('/#store') },
    },
  };
}

export function breadcrumbJsonLd(items: { name: string; path: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({ '@type': 'ListItem', position: i + 1, name: it.name, item: absUrl(it.path) })),
  };
}

/** Safe JSON-LD: escape < so the payload can never close the script tag. */
export const ld = (o: unknown) => ({ __html: JSON.stringify(o).replace(/</g, '\\u003c') });
