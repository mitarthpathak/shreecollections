/**
 * Thin data layer: pure helpers over a product list. The list itself comes from the server
 * (src/lib/catalog.server.ts: Supabase when it is connected, else data/products.json) and
 * reaches components through useCatalog() (src/components/CatalogProvider.tsx).
 */
import { FABRICS, OCCASIONS, BADGES } from './catalog.constants';
import type { Product } from './catalog.schema';

export { FABRICS, OCCASIONS, BADGES };
export type { Product };
export type Category = Product['category'];
export type Fabric = (typeof FABRICS)[number];
export type Occasion = (typeof OCCASIONS)[number];

/** What to show for a product: its photos when it has any, otherwise the drawn placeholders. */
export const productMedia = (p: Product) => (p.photos?.length ? p.photos : p.images);
export const hasPhotos = (p: Product) => Boolean(p.photos?.length);

/** Display colours for each colour family (the Rang Chakra ring and filter swatches). */
export const COLOR_FAMILIES: Record<string, { hex: string; hi: string }> = {
  Red: { hex: '#B3122B', hi: 'लाल' },
  Pink: { hex: '#D63A7A', hi: 'गुलाबी' },
  Wine: { hex: '#7B1E3A', hi: 'वाइन' },
  Orange: { hex: '#E07B1A', hi: 'केसरिया' },
  Yellow: { hex: '#E0A800', hi: 'पीला' },
  Green: { hex: '#4F8A3C', hi: 'हरा' },
  Teal: { hex: '#0E7C7B', hi: 'मोरपंखी' },
  Blue: { hex: '#3A5BC7', hi: 'नीला' },
  Peach: { hex: '#F2A07B', hi: 'पीच' },
  Ivory: { hex: '#EFE6D2', hi: 'हाथीदांत' },
  Black: { hex: '#1B1720', hi: 'काला' },
};

export const FABRIC_HI: Record<string, string> = {
  Banarasi: 'बनारसी',
  Chanderi: 'चंदेरी',
  Georgette: 'जॉर्जेट',
  Cotton: 'कॉटन',
  Bandhani: 'बांधनी',
  Leheriya: 'लहरिया',
  Silk: 'सिल्क',
  Other: 'अन्य',
};

export const OCCASION_LABEL: Record<Occasion, { en: string; hi: string }> = {
  festive: { en: 'Festive', hi: 'त्योहार' },
  wedding: { en: 'Wedding', hi: 'शादी' },
  party: { en: 'Party', hi: 'पार्टी' },
  daily: { en: 'Daily', hi: 'रोज़ाना' },
  office: { en: 'Office', hi: 'ऑफ़िस' },
};

export const SORTS = {
  new: { en: 'New', hi: 'नया' },
  'price-asc': { en: 'Price: low–high', hi: 'कीमत: कम–ज़्यादा' },
  'price-desc': { en: 'Price: high–low', hi: 'कीमत: ज़्यादा–कम' },
  bestseller: { en: 'Bestseller', hi: 'बेस्टसेलर' },
} as const;
export type SortKey = keyof typeof SORTS;

export function sortProducts(list: Product[], sort: SortKey) {
  const l = [...list];
  if (sort === 'price-asc') return l.sort((a, b) => a.price - b.price);
  if (sort === 'price-desc') return l.sort((a, b) => b.price - a.price);
  const score = (p: Product, b: (typeof BADGES)[number]) => (p.badges?.includes(b) ? 1 : 0);
  if (sort === 'bestseller') return l.sort((a, b) => score(b, 'bestseller') - score(a, 'bestseller'));
  return l.sort((a, b) => score(b, 'new') - score(a, 'new'));
}

/** Recommendations for "Complete the look": same occasion, other category first. */
export function completeTheLook(p: Product, products: Product[], n = 4) {
  const others = products.filter((q) => q.slug !== p.slug);
  const share = (q: Product) => q.occasion.filter((o) => p.occasion.includes(o)).length;
  return others
    .map((q) => ({ q, s: share(q) * 2 + (q.category !== p.category ? 1 : 0) + (q.colorFamily === p.colorFamily ? 1 : 0) }))
    .sort((a, b) => b.s - a.s)
    .slice(0, n)
    .map((x) => x.q);
}

/** A product list with its lookups: what useCatalog() returns, and what server code uses. */
export function catalogOf(products: Product[]) {
  const bySlug = new Map(products.map((p) => [p.slug, p]));
  return {
    products,
    getAllProducts: () => products,
    getProduct: (slug: string) => bySlug.get(slug),
    getByCategory: (c: Category) => products.filter((p) => p.category === c),
    getBestsellers: (n = 6) => products.filter((p) => p.badges?.includes('bestseller')).slice(0, n),
    getByFabric: (f: string) => products.filter((p) => p.fabric === f),
    completeTheLook: (p: Product, n = 4) => completeTheLook(p, products, n),
    priceExtent: () => {
      const ps = products.map((p) => p.price);
      return [Math.min(...ps), Math.max(...ps)] as const;
    },
  };
}
export type Catalog = ReturnType<typeof catalogOf>;
