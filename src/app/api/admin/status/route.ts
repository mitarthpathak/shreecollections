import { isAdmin, json } from '@/lib/admin/auth';
import { getStore, StoreError } from '@/lib/admin/store';

/** Whether a saved version is live yet (Vercel reports its build as a commit status on GitHub). */
export async function GET(req: Request) {
  if (!(await isAdmin())) return json({ error: 'Please log in.' }, 401);
  const store = getStore();
  const v = new URL(req.url).searchParams.get('v');
  if (!store || !v || !/^[\w.]+$/.test(v)) return json({ state: 'unknown' });
  try {
    return json({ state: await store.deployState(v) });
  } catch (e) {
    return json({ state: 'unknown', error: e instanceof StoreError ? e.message : 'Could not check.' });
  }
}
