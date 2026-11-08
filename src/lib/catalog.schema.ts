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
  /** Drawn placeholder art (always present; the fallback). */
  images: z.array(z.string()).min(1),
  /** Real photographs, 4:5 (see docs/photo-guide.md). When present they replace `images`. */
  photos: z.array(z.string()).min(1).optional(),
  fabricTexture: z.string().optional(),
  sizes: z.array(z.string()).optional(),
  stitched: z.boolean(),
  inStock: z.boolean(),
  badges: z.array(z.enum(BADGES)).optional(),
  description: z.string(),
  care: z.array(z.string()),
});

export type Product = z.infer<typeof ProductSchema>;
