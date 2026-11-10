import { json } from '@/lib/admin/auth';
import { dbConfigured, deletePhotos, ensureDb, listPhotos, readCatalog, sql, storageConfigured } from '@/lib/db';

/**
 * Daily (vercel.json): keeps a free Supabase project from pausing for inactivity, and removes
 * photos that were uploaded in the panel but never saved with a product (older than a day).
 * Harmless to call by hand. With CRON_SECRET set in Vercel, only Vercel's scheduler may call it.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get('authorization') !== `Bearer ${secret}`) return json({ error: 'Not allowed.' }, 401);
  if (!dbConfigured()) return json({ ok: true, database: 'not connected' });
  await ensureDb();
  await sql()`select 1`;
  let removed = 0;
  if (storageConfigured()) {
    const { products } = await readCatalog();
    const used = new Set(products.flatMap((p) => p.photos ?? []).map((u) => u.split('/').pop()));
    const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
    const stale = (await listPhotos('uploads')).filter((f) => !used.has(f.name) && Date.parse(f.created_at) < dayAgo).map((f) => `uploads/${f.name}`);
    await deletePhotos(stale);
    removed = stale.length;
  }
  return json({ ok: true, removed });
}
