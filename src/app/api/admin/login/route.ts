import { cookies } from 'next/headers';
import { SESSION_COOKIE, adminConfigured, clearMisses, cookieOptions, json, loginBlocked, newSession, noteMiss, passwordMatches, sameOrigin } from '@/lib/admin/auth';

export async function POST(req: Request) {
  if (!sameOrigin(req)) return json({ error: 'Bad origin.' }, 403);
  if (!adminConfigured()) return json({ error: 'The admin password is not set up yet (ADMIN_PASSWORD in Vercel).' }, 503);
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local';
  if (await loginBlocked(ip)) return json({ error: 'Too many wrong passwords. Try again in 15 minutes.' }, 429);
  const body = (await req.json().catch(() => null)) as { password?: unknown } | null;
  const attempt = typeof body?.password === 'string' ? body.password : '';
  if (!passwordMatches(attempt)) {
    await noteMiss(ip);
    await new Promise((r) => setTimeout(r, 600));
    return json({ error: 'Wrong password.' }, 401);
  }
  await clearMisses(ip);
  const s = await newSession();
  (await cookies()).set(SESSION_COOKIE, s.value, cookieOptions(s.maxAge));
  return json({ ok: true });
}
