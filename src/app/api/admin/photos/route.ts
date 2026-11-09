import { randomUUID } from 'node:crypto';
import { isAdmin, json, sameOrigin } from '@/lib/admin/auth';
import { getStore } from '@/lib/admin/store';
import { InputError, NewPhotoSchema, decodePhoto } from '@/lib/admin/products';
import { putPhoto } from '@/lib/db';

export const maxDuration = 30;

/**
 * One photo, uploaded before the product is saved (Supabase only), so a save never carries more
 * than one photo's worth of data: no limit on how many new photos one save can add. The answer is
 * a name the save then refers to as `upload:<name>`. Photos never saved are cleaned up daily.
 */
export async function POST(req: Request) {
  if (!sameOrigin(req)) return json({ error: 'Bad origin.' }, 403);
  if (!(await isAdmin())) return json({ error: 'Please log in again.' }, 401);
  const store = getStore();
  if (!store?.separateUploads) return json({ error: 'Photos are sent with the save here.' }, 400);
  const parsed = NewPhotoSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return json({ error: 'That photo could not be read.' }, 400);
  try {
    const { buf, ext, type } = decodePhoto(parsed.data);
    const name = `${randomUUID()}.${ext}`;
    await putPhoto(`uploads/${name}`, buf, type);
    return json({ name });
  } catch (e) {
    if (e instanceof InputError) return json({ error: e.message }, 400);
    console.error('photo upload failed', e);
    return json({ error: 'Could not upload the photo. Please try again.' }, 502);
  }
}
