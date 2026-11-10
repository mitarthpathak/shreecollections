import { cookies } from 'next/headers';
import { SESSION_COOKIE, cookieOptions, endSession, json, sameOrigin } from '@/lib/admin/auth';

/** Log out; with {"everywhere": true}, every device that is logged in is signed out too. */
export async function POST(req: Request) {
  if (!sameOrigin(req)) return json({ error: 'Bad origin.' }, 403);
  const body = (await req.json().catch(() => null)) as { everywhere?: unknown } | null;
  const jar = await cookies();
  await endSession(jar.get(SESSION_COOKIE)?.value, body?.everywhere === true);
  jar.set(SESSION_COOKIE, '', cookieOptions(0));
  return json({ ok: true });
}
