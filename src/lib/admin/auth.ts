import 'server-only';
import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';
import { dbConfigured, ensureDb, sql } from '@/lib/db';

/**
 * One shared admin password (ADMIN_PASSWORD, set in Vercel). A successful login gets a signed,
 * httpOnly, SameSite=Strict session cookie; changing the password signs everyone out.
 *
 * With Supabase connected, sessions are also kept in the database (so Log out really ends one,
 * and Log out everywhere ends them all) and wrong-password counts are shared by every server
 * instance. Without it, both work per instance, as before.
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

/** The database, when there is one; errors are logged and the caller falls back. */
async function withDb<T>(run: (db: ReturnType<typeof sql>) => Promise<T>): Promise<T | undefined> {
  if (!dbConfigured()) return undefined;
  try {
    await ensureDb();
    return await run(sql());
  } catch (e) {
    console.error('admin auth: database unavailable', e);
    return undefined;
  }
}

export async function newSession() {
  const exp = Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000;
  const id = randomBytes(16).toString('base64url');
  await withDb(async (db) => {
    await db`delete from shree.sessions where expires_at < now()`;
    await db`insert into shree.sessions (id, expires_at) values (${id}, ${new Date(exp)})`;
  });
  return { value: `${exp}.${id}.${sign(`${exp}.${id}`)}`, maxAge: SESSION_DAYS * 24 * 60 * 60 };
}

function parse(value: string | undefined) {
  if (!value || !adminConfigured()) return null;
  const [exp, id, mac] = value.split('.');
  if (!exp || !id || !mac || !/^\d+$/.test(exp) || Number(exp) < Date.now()) return null;
  return equal(mac, sign(`${exp}.${id}`)) ? { id } : null;
}

async function validSession(value: string | undefined) {
  const s = parse(value);
  if (!s) return false;
  // a signed cookie whose session was ended (Log out) no longer counts; if the database is
  // unreachable, the signature alone decides, so the panel stays usable
  const row = await withDb((db) => db`select 1 from shree.sessions where id = ${s.id} and expires_at > now()`);
  return row === undefined || row.length > 0;
}

export async function isAdmin() {
  return validSession((await cookies()).get(SESSION_COOKIE)?.value);
}

/** End this session (or every session) in the database. */
export async function endSession(value: string | undefined, everywhere = false) {
  const s = parse(value);
  if (!s) return;
  await withDb(async (db) => {
    if (everywhere) await db`delete from shree.sessions`;
    else await db`delete from shree.sessions where id = ${s.id}`;
  });
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

/* A brake on password guessing: 8 misses per address, then 15 minutes off. */
const MAX_MISSES = 8;
const PAUSE_MS = 15 * 60 * 1000;
const misses = new Map<string, { n: number; until: number }>();

export async function loginBlocked(ip: string) {
  const row = await withDb((db) => db<{ n: number }[]>`select n from shree.login_misses where ip = ${ip} and until > now()`);
  if (row) return (row[0]?.n ?? 0) >= MAX_MISSES;
  const m = misses.get(ip);
  return Boolean(m && m.n >= MAX_MISSES && m.until > Date.now());
}

export async function noteMiss(ip: string) {
  const until = new Date(Date.now() + PAUSE_MS);
  const done = await withDb(async (db) => {
    await db`delete from shree.login_misses where until < now()`;
    await db`insert into shree.login_misses (ip, n, until) values (${ip}, 1, ${until})
             on conflict (ip) do update set n = shree.login_misses.n + 1, until = ${until}`;
    return true;
  });
  if (done) return;
  if (misses.size > 5000) misses.clear();
  const m = misses.get(ip);
  const n = m && m.until > Date.now() ? m.n + 1 : 1;
  misses.set(ip, { n, until: until.getTime() });
}

export async function clearMisses(ip: string) {
  misses.delete(ip);
  await withDb((db) => db`delete from shree.login_misses where ip = ${ip}`);
}

export const noStore = { 'Cache-Control': 'no-store' };
export const json = (data: unknown, status = 200) => Response.json(data, { status, headers: noStore });
