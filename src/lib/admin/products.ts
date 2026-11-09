import 'server-only';
import { z } from 'zod';
import { CatalogProductSchema, type Product } from '@/lib/catalog.schema';
import { FABRICS, OCCASIONS, BADGES } from '@/lib/catalog.constants';
import { COLOR_FAMILIES } from '@/lib/catalog';
import { CATALOG_PATH, type FileChange } from './store';

/** What the admin form sends. Photos: kept paths and `new:<i>` for the i-th uploaded file, in order. */
export const ProductInputSchema = z.object({
  slug: z.string().regex(/^[a-z0-9-]+$/).optional(),
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
  photos: z.array(z.string()).max(8),
});
export type ProductInput = z.infer<typeof ProductInputSchema>;

export const NewPhotoSchema = z.object({ type: z.enum(['image/webp', 'image/jpeg']), data: z.string().max(4_000_000) });
export type NewPhoto = z.infer<typeof NewPhotoSchema>;

const MAX_PHOTO_BYTES = 1_500_000;

export class InputError extends Error {}

export const slugify = (s: string) =>
  s
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 70) || 'product';

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
function decodePhoto(p: NewPhoto) {
  const buf = Buffer.from(p.data, 'base64');
  if (buf.length < 100 || buf.length > MAX_PHOTO_BYTES) throw new InputError('Each photo must be under 1.5 MB.');
  const webp = buf.subarray(0, 4).toString('latin1') === 'RIFF' && buf.subarray(8, 12).toString('latin1') === 'WEBP';
  const jpeg = buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
  if (p.type === 'image/webp' ? !webp : !jpeg) throw new InputError('Photos must be WebP or JPEG images.');
  return { buf, ext: webp ? 'webp' : 'jpg' };
}

/** Repository files that belong to a product (only ever under public/products/<slug>/). */
function ownFiles(p: Product, paths: string[]) {
  const prefix = `/products/${p.slug}/`;
  return paths.filter((x) => x.startsWith(prefix) && !x.includes('..')).map((x) => `public${x}`);
}

const MIN_LEFT = 1;

function checkCategoriesLeft(products: Product[]) {
  for (const c of ['saree', 'suit'] as const) {
    if (products.filter((p) => p.category === c).length < MIN_LEFT) {
      throw new InputError(`Keep at least one ${c} on the site: the home page and shop are built around both.`);
    }
  }
}

const catalogFile = (products: Product[]): FileChange => ({ path: CATALOG_PATH, data: Buffer.from(`${JSON.stringify(products, null, 2)}\n`) });

/** Add a product, or update the one with `input.slug`. Returns the new catalogue and the files to commit. */
export function upsert(products: Product[], input: ProductInput, uploads: NewPhoto[]) {
  const existing = input.slug ? products.find((p) => p.slug === input.slug) : undefined;
  if (input.slug && !existing) throw new InputError('That product no longer exists (it may have been deleted).');
  if (input.mrp && input.mrp <= input.price) throw new InputError('MRP must be higher than the price (or left empty).');

  const slug = existing?.slug ?? uniqueSlug(slugify(input.name), new Set(products.map((p) => p.slug)));
  const stamp = Date.now().toString(36);
  const files: FileChange[] = [];
  const used = new Set<number>();
  const photos = input.photos.map((ref) => {
    const m = /^new:(\d+)$/.exec(ref);
    if (!m) {
      if (!existing?.photos?.includes(ref)) throw new InputError('A photo in the list does not belong to this product.');
      return ref;
    }
    const i = Number(m[1]);
    const up = uploads[i];
    if (!up || used.has(i)) throw new InputError('A new photo is missing; please add it again.');
    used.add(i);
    const { buf, ext } = decodePhoto(up);
    const p = `/products/${slug}/photo-${stamp}-${i + 1}.${ext}`;
    files.push({ path: `public${p}`, data: buf });
    return p;
  });

  const images = existing?.images ?? [];
  if (!photos.length && !images.length) throw new InputError('Add at least one photo.');

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
  };
  const checked = CatalogProductSchema.safeParse(product);
  if (!checked.success) throw new InputError(`Invalid product: ${checked.error.issues.map((i) => `${i.path.join('.')} ${i.message}`).join('; ')}`);

  // photos taken off the product are deleted from the repository
  if (existing) for (const f of ownFiles(existing, (existing.photos ?? []).filter((x) => !photos.includes(x)))) files.push({ path: f, data: null });

  const next = existing ? products.map((p) => (p.slug === slug ? product : p)) : [product, ...products];
  files.push(catalogFile(next));
  const message = `${existing ? 'Update' : 'Add'} ${product.category}: ${product.name} (admin)`;
  return { products: next, product, files, message };
}

/** Remove products (and their files). */
export function remove(products: Product[], slugs: string[]) {
  const gone = products.filter((p) => slugs.includes(p.slug));
  if (!gone.length) throw new InputError('Those products no longer exist.');
  const next = products.filter((p) => !slugs.includes(p.slug));
  checkCategoriesLeft(next);
  const files: FileChange[] = gone.flatMap((p) =>
    ownFiles(p, [...p.images, ...(p.photos ?? []), ...(p.fabricTexture ? [p.fabricTexture] : [])]).map((f) => ({ path: f, data: null })),
  );
  files.push(catalogFile(next));
  const message = gone.length === 1 ? `Remove ${gone[0].category}: ${gone[0].name} (admin)` : `Remove ${gone.length} products (admin)`;
  return { products: next, files, message };
}
