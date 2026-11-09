import { cookies } from 'next/headers';
import { SESSION_COOKIE, cookieOptions, json, sameOrigin } from '@/lib/admin/auth';

export async function POST(req: Request) {
  if (!sameOrigin(req)) return json({ error: 'Bad origin.' }, 403);
  (await cookies()).set(SESSION_COOKIE, '', cookieOptions(0));
  return json({ ok: true });
}
