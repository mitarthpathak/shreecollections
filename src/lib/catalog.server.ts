import 'server-only';
import { z } from 'zod';
import raw from '../../data/products.json';
import { CatalogProductSchema } from './catalog.schema';

/** Throws at build / render time if data/products.json is malformed. Server-only: Zod never ships to the browser. */
export function validateCatalog() {
  const parsed = z.array(CatalogProductSchema).safeParse(raw);
  if (!parsed.success) throw new Error(`data/products.json is invalid:\n${parsed.error.message}`);
  const slugs = new Set<string>();
  for (const p of parsed.data) {
    if (slugs.has(p.slug)) throw new Error(`Duplicate product slug: ${p.slug}`);
    slugs.add(p.slug);
  }
  return parsed.data.length;
}
