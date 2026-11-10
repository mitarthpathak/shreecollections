import 'server-only';
import { unstable_cache } from 'next/cache';
import { z } from 'zod';
import raw from '../../data/products.json';
import { CatalogProductSchema, type Product } from './catalog.schema';
import { catalogOf } from './catalog';
import { dbConfigured, readCatalog } from './db';

/** Tag on every cached read of the catalogue: an admin save revalidates it. */
export const CATALOG_TAG = 'catalog';
/** "New" comes off by itself this long after a product was added. */
const NEW_FOR_DAYS = 45;

/** Throws at build / render time if data/products.json is malformed. Server-only: Zod never ships to the browser. */
export function validateCatalog(list: unknown = raw): Product[] {
  const parsed = z.array(CatalogProductSchema).safeParse(list);
  if (!parsed.success) throw new Error(`data/products.json is invalid:\n${parsed.error.message}`);
  const slugs = new Set<string>();
  for (const p of parsed.data) {
    if (slugs.has(p.slug)) throw new Error(`Duplicate product slug: ${p.slug}`);
    slugs.add(p.slug);
  }
  return parsed.data;
}

/** Rows from the database: a bad row is left out (and logged) instead of taking the shop down. */
function checkRows(list: Product[]) {
  return list.filter((p) => {
    const ok = CatalogProductSchema.safeParse(p).success;
    if (!ok) console.error(`catalogue: skipping invalid product ${p.slug}`);
    return ok;
  });
}

/** What visitors see: the "New" badge expires on its own. */
function forShop(list: Product[]) {
  const cutoff = Date.now() - NEW_FOR_DAYS * 24 * 60 * 60 * 1000;
  return list.map((p) =>
    p.badges?.includes('new') && p.createdAt && Date.parse(p.createdAt) < cutoff ? { ...p, badges: p.badges.filter((b) => b !== 'new') } : p,
  );
}

const fromDb = unstable_cache(async () => checkRows((await readCatalog()).products), ['catalog-v1'], {
  tags: [CATALOG_TAG],
  // also refreshed every hour, which keeps a free Supabase project awake while the site has visitors
  revalidate: 3600,
});

let fromFile: Product[] | null = null;

/** The storefront's catalogue, newest first. */
export async function getCatalog(): Promise<Product[]> {
  if (dbConfigured()) return forShop(await fromDb());
  fromFile ??= validateCatalog();
  return forShop(fromFile);
}

/** getProduct, getByCategory… for server components and metadata. */
export async function getServerCatalog() {
  return catalogOf(await getCatalog());
}
