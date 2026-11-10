import { z } from 'zod';
import { FABRICS, OCCASIONS, BADGES } from './catalog.constants';

export const ProductSchema = z.object({
  id: z.string(),
  slug: z.string().regex(/^[a-z0-9-]+$/),
  name: z.string(),
  nameHi: z.string(),
  category: z.enum(['saree', 'suit']),
  subcategory: z.string(),
  fabric: z.enum(FABRICS),
  colorFamily: z.string(),
  colorHex: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  occasion: z.array(z.enum(OCCASIONS)).min(1),
  price: z.number().int().positive(),
  mrp: z.number().int().positive().optional(),
  /** Drawn placeholder art (the seed products; empty for products added in the admin panel). */
  images: z.array(z.string()),
  /** Real photographs, 4:5 (see docs/photo-guide.md). When present they replace `images`. */
  photos: z.array(z.string()).min(1).optional(),
  fabricTexture: z.string().optional(),
  sizes: z.array(z.string()).optional(),
  stitched: z.boolean(),
  inStock: z.boolean(),
  badges: z.array(z.enum(BADGES)).optional(),
  description: z.string(),
  care: z.array(z.string()),
  /** ISO times, set by the admin panel (absent on products that never went through it) */
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

/** A product must have something to show: photos, or the drawn placeholders. */
export const CatalogProductSchema = ProductSchema.refine((p) => p.images.length > 0 || (p.photos?.length ?? 0) > 0, {
  message: 'needs at least one photo or placeholder image',
});

export type Product = z.infer<typeof ProductSchema>;
