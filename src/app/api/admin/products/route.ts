import { z } from 'zod';
import { isAdmin, json, sameOrigin } from '@/lib/admin/auth';
import { getStore, StoreError } from '@/lib/admin/store';
import { BulkPatchSchema, InputError, NewPhotoSchema, ProductInputSchema, bulkUpdate, remove, upsert } from '@/lib/admin/products';

export const maxDuration = 60;

function notReady() {
  return json({ error: 'Saving is not set up yet: add ADMIN_GITHUB_TOKEN in Vercel (see docs/admin.md).' }, 503);
}

/** The catalogue as it is now on the branch (including saves that are still building). */
export async function GET() {
  if (!(await isAdmin())) return json({ error: 'Please log in.' }, 401);
  const store = getStore();
  if (!store) return notReady();
  try {
    const { products, version } = await store.read();
    return json({ products, version, store: store.kind });
  } catch (e) {
    return json({ error: e instanceof StoreError ? e.message : 'Could not load the products.' }, 502);
  }
}

const Body = z.discriminatedUnion('op', [
  z.object({ op: z.literal('upsert'), product: ProductInputSchema, uploads: z.array(NewPhotoSchema).max(8) }),
  z.object({ op: z.literal('delete'), slugs: z.array(z.string().regex(/^[a-z0-9-]+$/)).min(1).max(5000) }),
  z.object({ op: z.literal('bulk'), slugs: z.array(z.string().regex(/^[a-z0-9-]+$/)).min(1).max(5000), patch: BulkPatchSchema }),
]);

export async function POST(req: Request) {
  if (!sameOrigin(req)) return json({ error: 'Bad origin.' }, 403);
  if (!(await isAdmin())) return json({ error: 'Please log in again.' }, 401);
  const store = getStore();
  if (!store) return notReady();
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return json({ error: `Please check the form: ${parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')}` }, 400);
  const body = parsed.data;
  try {
    // apply the change to the latest catalogue; if someone saved meanwhile, re-read and re-apply
    for (let attempt = 0; attempt < 4; attempt++) {
      const { products, version } = await store.read();
      const result =
        body.op === 'upsert'
          ? upsert(products, body.product, body.uploads)
          : body.op === 'delete'
            ? { ...remove(products, body.slugs), product: undefined }
            : { ...bulkUpdate(products, body.slugs, body.patch), product: undefined };
      const w = await store.write(version, result.files, result.message);
      if (w.ok) return json({ ok: true, version: w.version, products: result.products, slug: result.product?.slug, store: store.kind });
    }
    return json({ error: 'Someone else is saving at the same time. Please try again.' }, 409);
  } catch (e) {
    if (e instanceof InputError) return json({ error: e.message }, 400);
    if (e instanceof StoreError) return json({ error: e.message }, 502);
    console.error('admin save failed', e);
    return json({ error: 'Saving failed. Please try again.' }, 500);
  }
}
