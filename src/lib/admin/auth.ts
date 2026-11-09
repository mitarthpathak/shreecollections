import 'server-only';
import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';

/**
 * One shared admin password (ADMIN_PASSWORD, set in Vercel). A successful login gets a signed,
 * httpOnly, SameSite=Strict session cookie; changing the password signs everyone out.
 */
export const SESSION_COOKIE = 'sc_admin';
const SESSION_DAYS = 7;

const password = () => process.env.ADMIN_PASSWORD ?? '';
export const adminConfigured = () => password().length >= 8;

const key = () => createHash('sha256').update(`shree-collection-admin:${password()}`).digest();
const sign = (payload: string) => createHmac('sha256', key()).update(payload).digest('base64url');

function equal(a: string, b: string) {
  // compare digests, so neither the length nor the content leaks through timing
  const ha = createHash('sha256').update(a).digest();
  const hb = createHash('sha256').update(b).digest();
  return timingSafeEqual(ha, hb);
}

export const passwordMatches = (attempt: string) => adminConfigured() && equal(attempt, password());

export function newSession() {
  const exp = Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000;
  return { value: `${exp}.${sign(String(exp))}`, maxAge: SESSION_DAYS * 24 * 60 * 60 };
}

function validSession(value: string | undefined) {
  if (!value || !adminConfigured()) return false;
  const [exp, mac] = value.split('.');
  if (!exp || !mac || !/^\d+$/.test(exp) || Number(exp) < Date.now()) return false;
  return equal(mac, sign(exp));
}

export async function isAdmin() {
  return validSession((await cookies()).get(SESSION_COOKIE)?.value);
}

export const cookieOptions = (maxAge: number) => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  path: '/',
  maxAge,
});

/** Writes must come from this site (the cookie is SameSite=Strict too). */
export function sameOrigin(req: Request) {
  const origin = req.headers.get('origin');
  if (!origin) return false;
  try {
    return new URL(origin).host === new URL(req.url).host || new URL(origin).host === req.headers.get('host');
  } catch {
    return false;
  }
}

/** A slow, per-instance brake on password guessing: 8 misses per address, then 15 minutes off. */
const misses = new Map<string, { n: number; until: number }>();
export function loginBlocked(ip: string) {
  const m = misses.get(ip);
  return Boolean(m && m.n >= 8 && m.until > Date.now());
}
export function noteMiss(ip: string) {
  const m = misses.get(ip);
  const n = m && m.until > Date.now() ? m.n + 1 : 1;
  misses.set(ip, { n, until: Date.now() + 15 * 60 * 1000 });
}
export const clearMisses = (ip: string) => void misses.delete(ip);

export const noStore = { 'Cache-Control': 'no-store' };
export const json = (data: unknown, status = 200) => Response.json(data, { status, headers: noStore });
