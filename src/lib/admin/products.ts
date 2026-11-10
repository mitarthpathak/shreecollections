import 'server-only';
import { z } from 'zod';
import { CatalogProductSchema, type Product } from '@/lib/catalog.schema';
import { FABRICS, OCCASIONS, BADGES } from '@/lib/catalog.constants';
import { COLOR_FAMILIES } from '@/lib/catalog';

/**
 * What the admin form sends. Photos, in order: kept refs, `new:<i>` for the i-th file sent with
 * the save, and `upload:<name>` for a photo uploaded before it (/api/admin/photos, Supabase only).
 */
export const ProductInputSchema = z.object({
  slug: z.string().regex(/^[a-z0-9-]+$/).optional(),
  /** the product's updatedAt when the form was opened: a save over someone else's change is refused */
  baseUpdatedAt: z.string().max(40).optional(),
  name: z.string().trim().min(2).max(120),
  nameHi: z.string().trim().max(120).optional(),
  category: z.enum(['saree', 'suit']),
  subcategory: z.string().trim().min(1).max(60),
  fabric: z.enum(FABRICS),
  colorFamily: z.string().refine((c) => c in COLOR_FAMILIES, 'unknown colour'),
  occasion: z.array(z.enum(OCCASIONS)).min(1),
  price: z.number().int().positive().max(10_000_000),
  mrp: z.number().int().positive().max(10_000_000).optional(),
  sizes: z.array(z.string().trim().min(1).max(20)).max(20).optional(),
  stitched: z.boolean(),
  inStock: z.boolean(),
  badges: z.array(z.enum(BADGES)).optional(),
  description: z.string().trim().max(2000),
  care: z.array(z.string().trim().min(1).max(200)).max(12),
  photos: z.array(z.string().max(500)).max(8),
});
export type ProductInput = z.infer<typeof ProductInputSchema>;

export const NewPhotoSchema = z.object({ type: z.enum(['image/webp', 'image/jpeg']), data: z.string().max(4_000_000) });
export type NewPhoto = z.infer<typeof NewPhotoSchema>;

const MAX_PHOTO_BYTES = 1_500_000;
export const UPLOAD_NAME = /^[a-f0-9-]{36}\.(webp|jpg)$/;

export class InputError extends Error {}

/** Where photos live: the repository's public/products/ (GitHub, local) or Supabase Storage. */
export type PhotoHost = {
  /** the ref (site path or URL) for a new photo file of `slug` */
  ref(slug: string, file: string): string;
  /** the ref of a photo uploaded before the save, or null when this host takes none */
  uploaded(name: string): string | null;
};

/** One save: the whole new catalogue, plus what changed. Each store writes it its own way. */
export type Change = {
  products: Product[];
  /** slugs added or changed */
  touched: string[];
  /** new photo files sent with the save */
  added: { ref: string; data: Buffer; type: string }[];
  /** photos no longer used, with the product they belonged to */
  dropped: { slug: string; ref: string }[];
  message: string;
  product?: Product;
};

const latin = (s: string) =>
  s
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 70);

/** A URL slug; a name with no Latin letters (Hindi only) is named after its type and category. */
export const slugify = (name: string, fallback = '') => latin(name) || latin(fallback) || 'product';

function uniqueSlug(base: string, taken: Set<string>) {
  let s = base;
  for (let i = 2; taken.has(s); i++) s = `${base}-${i}`;
  return s;
}

function nextId(products: Product[]) {
  const n = products.reduce((m, p) => Math.max(m, Number(/^SC-(\d+)$/.exec(p.id)?.[1] ?? 0)), 0);
  return `SC-${String(n + 1).padStart(3, '0')}`;
}

/** Decode an uploaded photo and check it really is a WebP or JPEG of a sane size. */
export function decodePhoto(p: NewPhoto) {
  const buf = Buffer.from(p.data, 'base64');
  if (buf.length < 100 || buf.length > MAX_PHOTO_BYTES) throw new InputError('Each photo must be under 1.5 MB.');
  const webp = buf.subarray(0, 4).toString('latin1') === 'RIFF' && buf.subarray(8, 12).toString('latin1') === 'WEBP';
  const jpeg = buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
  if (p.type === 'image/webp' ? !webp : !jpeg) throw new InputError('Photos must be WebP or JPEG images.');
  return { buf, ext: webp ? 'webp' : 'jpg', type: webp ? 'image/webp' : 'image/jpeg' };
}

const MIN_LEFT = 1;

function checkCategoriesLeft(products: Product[]) {
  for (const c of ['saree', 'suit'] as const) {
    if (products.filter((p) => p.category === c).length < MIN_LEFT) {
      throw new InputError(`Keep at least one ${c} on the site: the home page and shop are built around both.`);
    }
  }
}

/** Add a product, or update the one with `input.slug`. */
export function upsert(products: Product[], input: ProductInput, uploads: NewPhoto[], host: PhotoHost): Change {
  const existing = input.slug ? products.find((p) => p.slug === input.slug) : undefined;
  if (input.slug && !existing) throw new InputError('That product no longer exists (it may have been removed).');
  if (existing && input.baseUpdatedAt && existing.updatedAt && existing.updatedAt !== input.baseUpdatedAt) {
    throw new InputError('Someone changed this product after you opened it. Close the form and open it again to see the latest, then make your change.');
  }
  if (input.mrp && input.mrp <= input.price) throw new InputError('MRP must be higher than the price (or left empty).');

  const slug = existing?.slug ?? uniqueSlug(slugify(input.name, `${input.subcategory} ${input.category}`), new Set(products.map((p) => p.slug)));
  const stamp = Date.now().toString(36);
  const added: Change['added'] = [];
  const used = new Set<number>();
  const photos = input.photos.map((ref) => {
    const m = /^new:(\d+)$/.exec(ref);
    if (m) {
      const i = Number(m[1]);
      const up = uploads[i];
      if (!up || used.has(i)) throw new InputError('A new photo is missing; please add it again.');
      used.add(i);
      const { buf, ext, type } = decodePhoto(up);
      const r = host.ref(slug, `photo-${stamp}-${i + 1}.${ext}`);
      added.push({ ref: r, data: buf, type });
      return r;
    }
    const u = /^upload:(.+)$/.exec(ref);
    if (u) {
      const r = UPLOAD_NAME.test(u[1]) ? host.uploaded(u[1]) : null;
      if (!r) throw new InputError('A new photo is missing; please add it again.');
      return r;
    }
    if (!existing?.photos?.includes(ref)) throw new InputError('A photo in the list does not belong to this product.');
    return ref;
  });
  if (new Set(photos).size !== photos.length) throw new InputError('The same photo is in the list twice.');

  const images = existing?.images ?? [];
  if (!photos.length && !images.length) throw new InputError('Add at least one photo.');

  const now = new Date().toISOString();
  const product: Product = {
    id: existing?.id ?? nextId(products),
    slug,
    name: input.name,
    nameHi: input.nameHi || input.name,
    category: input.category,
    subcategory: input.subcategory,
    fabric: input.fabric,
    colorFamily: input.colorFamily,
    colorHex: COLOR_FAMILIES[input.colorFamily].hex,
    occasion: input.occasion,
    price: input.price,
    ...(input.mrp ? { mrp: input.mrp } : {}),
    images,
    ...(photos.length ? { photos } : {}),
    ...(existing?.fabricTexture ? { fabricTexture: existing.fabricTexture } : {}),
    ...(input.sizes?.length ? { sizes: input.sizes } : {}),
    stitched: input.stitched,
    inStock: input.inStock,
    ...(input.badges?.length ? { badges: input.badges } : {}),
    description: input.description,
    care: input.care,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };
  const checked = CatalogProductSchema.safeParse(product);
  if (!checked.success) throw new InputError(`Invalid product: ${checked.error.issues.map((i) => `${i.path.join('.')} ${i.message}`).join('; ')}`);

  // photos taken off the product are deleted
  const dropped = existing ? (existing.photos ?? []).filter((x) => !photos.includes(x)).map((ref) => ({ slug, ref })) : [];
  const next = existing ? products.map((p) => (p.slug === slug ? product : p)) : [product, ...products];
  const message = `${existing ? 'Update' : 'Add'} ${product.category}: ${product.name} (admin)`;
  return { products: next, product, touched: [slug], added, dropped, message };
}

/** Remove products (and their files). */
export function remove(products: Product[], slugs: string[]): Change {
  const gone = products.filter((p) => slugs.includes(p.slug));
  if (!gone.length) throw new InputError('Those products no longer exist.');
  const next = products.filter((p) => !slugs.includes(p.slug));
  checkCategoriesLeft(next);
  const dropped = gone.flatMap((p) => [...p.images, ...(p.photos ?? []), ...(p.fabricTexture ? [p.fabricTexture] : [])].map((ref) => ({ slug: p.slug, ref })));
  const message = gone.length === 1 ? `Remove ${gone[0].category}: ${gone[0].name} (admin)` : `Remove ${gone.length} products (admin)`;
  return { products: next, touched: [], added: [], dropped, message };
}

/** Quick changes to many products at once (stock, badges), from the list's bulk bar. */
export const BulkPatchSchema = z
  .object({ inStock: z.boolean().optional(), addBadge: z.enum(BADGES).optional(), removeBadge: z.enum(BADGES).optional() })
  .refine((p) => p.inStock !== undefined || p.addBadge || p.removeBadge, 'nothing to change');
export type BulkPatch = z.infer<typeof BulkPatchSchema>;

export function bulkUpdate(products: Product[], slugs: string[], patch: BulkPatch): Change {
  const set = new Set(slugs);
  const hit = products.filter((p) => set.has(p.slug));
  if (!hit.length) throw new InputError('Those products no longer exist.');
  const now = new Date().toISOString();
  const next = products.map((p) => {
    if (!set.has(p.slug)) return p;
    const q: Product = { ...p, updatedAt: now };
    if (patch.inStock !== undefined) q.inStock = patch.inStock;
    let badges = [...(p.badges ?? [])];
    if (patch.addBadge && !badges.includes(patch.addBadge)) badges.push(patch.addBadge);
    if (patch.removeBadge) badges = badges.filter((b) => b !== patch.removeBadge);
    if (badges.length) q.badges = badges;
    else delete q.badges;
    return q;
  });
  const what =
    patch.inStock !== undefined ? (patch.inStock ? 'in stock' : 'out of stock') : patch.addBadge ? `badge ${patch.addBadge} added` : `badge ${patch.removeBadge} removed`;
  const message = hit.length === 1 ? `${hit[0].name}: ${what} (admin)` : `${hit.length} products: ${what} (admin)`;
  return { products: next, touched: hit.map((p) => p.slug), added: [], dropped: [], message };
}
