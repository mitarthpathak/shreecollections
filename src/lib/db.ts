import 'server-only';
import postgres from 'postgres';
import seed from '../../data/products.json';
import type { Product } from './catalog.schema';

/**
 * Supabase, when it is connected (Vercel → Storage → Supabase sets these variables on its own):
 * Postgres holds the catalogue, Storage holds the photos. Nothing has to be created by hand:
 * the first read creates the tables (schema `shree`, never exposed to the public API) and copies
 * data/products.json into them; the first photo upload creates the public `catalog` bucket.
 *
 * Not connected (local development, or before setup): the site and the panel work exactly as
 * before, from data/products.json (and GitHub for the panel's saves).
 */
export function supabaseEnv() {
  const e = process.env;
  const url = (e.SUPABASE_URL || e.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/$/, '');
  const key = e.SUPABASE_SECRET_KEY || e.SUPABASE_SERVICE_ROLE_KEY || '';
  // the pooled URL suits serverless functions; the others are fallbacks for a hand-made setup
  const db = e.POSTGRES_URL || e.DATABASE_URL || e.POSTGRES_URL_NON_POOLING || '';
  return { url, key, db };
}

/** The catalogue lives in Postgres (Supabase, or any Postgres for testing). */
export const dbConfigured = () => Boolean(supabaseEnv().db);
/** Photos go to Supabase Storage. */
export const storageConfigured = () => Boolean(supabaseEnv().url && supabaseEnv().key);

let client: postgres.Sql | null = null;

export function sql() {
  if (client) return client;
  const raw = supabaseEnv().db;
  if (!raw) throw new Error('No database configured.');
  // drop provider hints (?sslmode=…&supa=…) that are not Postgres startup parameters
  const u = new URL(raw);
  const local = ['localhost', '127.0.0.1', '::1'].includes(u.hostname);
  u.search = '';
  client = postgres(u.toString(), {
    ssl: local ? false : 'require',
    // Supabase's pooler runs in transaction mode: no prepared statements
    prepare: false,
    max: 3,
    idle_timeout: 20,
    connect_timeout: 15,
    onnotice: () => {},
  });
  return client;
}

/* ───────────────────────── schema and first import ───────────────────────── */

const SCHEMA = [
  `create schema if not exists shree`,
  `create table if not exists shree.products (
     slug text primary key,
     position bigint not null,
     data jsonb not null,
     created_at timestamptz not null default now(),
     updated_at timestamptz not null default now()
   )`,
  `create index if not exists products_position on shree.products (position desc)`,
  `create table if not exists shree.meta (id int primary key default 1 check (id = 1), version bigint not null)`,
  `create table if not exists shree.sessions (id text primary key, expires_at timestamptz not null)`,
  `create table if not exists shree.login_misses (ip text primary key, n int not null, until timestamptz not null)`,
  // Supabase exposes `public` through its API, not `shree`; row level security as a second lock
  `alter table shree.products enable row level security`,
  `alter table shree.meta enable row level security`,
  `alter table shree.sessions enable row level security`,
  `alter table shree.login_misses enable row level security`,
  `do $$ begin
     if exists (select 1 from pg_roles where rolname = 'anon') then revoke all on schema shree from anon; end if;
     if exists (select 1 from pg_roles where rolname = 'authenticated') then revoke all on schema shree from authenticated; end if;
   end $$`,
];

let ready: Promise<void> | null = null;

/** Tables exist and hold the catalogue. Runs once per server instance; safe when many start at once. */
export function ensureDb(): Promise<void> {
  ready ??= (async () => {
    const db = sql();
    const [found] = await db`select to_regclass('shree.meta') as t`;
    if (found?.t) {
      const [m] = await db`select 1 from shree.meta where id = 1`;
      if (m) return;
    }
    await db.begin(async (tx) => {
      // one instance sets up; any other waits here, then finds it done
      await tx`select pg_advisory_xact_lock(7243100)`;
      for (const stmt of SCHEMA) await tx.unsafe(stmt);
      const [m] = await tx`select 1 from shree.meta where id = 1`;
      if (m) return;
      const products = seed as Product[];
      const now = new Date().toISOString();
      for (const [i, p] of products.entries()) {
        const data = { ...p, createdAt: p.createdAt ?? now, updatedAt: p.updatedAt ?? now };
        await tx`insert into shree.products (slug, position, data) values (${p.slug}, ${products.length - i}, ${tx.json(data as unknown as postgres.JSONValue)})
                 on conflict (slug) do nothing`;
      }
      await tx`insert into shree.meta (id, version) values (1, 1)`;
    });
  })().catch((e) => {
    ready = null;
    throw e;
  });
  return ready;
}

/** The whole catalogue, newest first, and its version (for safe concurrent saves). */
export async function readCatalog(): Promise<{ products: Product[]; version: string }> {
  await ensureDb();
  const db = sql();
  const [rows, [meta]] = await Promise.all([
    db<{ data: Product; created_at: Date; updated_at: Date }[]>`select data, created_at, updated_at from shree.products order by position desc`,
    db<{ version: string }[]>`select version::text from shree.meta where id = 1`,
  ]);
  const products = rows.map((r) => ({
    ...r.data,
    createdAt: r.data.createdAt ?? r.created_at.toISOString(),
    updatedAt: r.data.updatedAt ?? r.updated_at.toISOString(),
  }));
  return { products, version: meta.version };
}

/* ───────────────────────── storage (photos) ───────────────────────── */

export const BUCKET = 'catalog';
/** Where a stored photo is served from. */
export const publicBase = () => `${supabaseEnv().url}/storage/v1/object/public/${BUCKET}`;

function storageHeaders(extra: Record<string, string> = {}) {
  const { key } = supabaseEnv();
  // new-style secret keys (sb_secret_…) go in apikey only; legacy JWT keys go in both
  return { apikey: key, ...(key.startsWith('sb_') ? {} : { Authorization: `Bearer ${key}` }), ...extra };
}

let bucketReady: Promise<void> | null = null;
function ensureBucket() {
  bucketReady ??= (async () => {
    const res = await fetch(`${supabaseEnv().url}/storage/v1/bucket`, {
      method: 'POST',
      headers: storageHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ id: BUCKET, name: BUCKET, public: true, file_size_limit: 2_000_000, allowed_mime_types: ['image/webp', 'image/jpeg'] }),
      cache: 'no-store',
    });
    // 409 / "already exists" is the usual answer after the first time
    if (!res.ok && res.status !== 409 && !/exist|duplicate/i.test(await res.text())) throw new Error(`Could not create the photo storage (${res.status}).`);
  })().catch((e) => {
    bucketReady = null;
    throw e;
  });
  return bucketReady;
}

/** Store a photo at `key` in the bucket. */
export async function putPhoto(key: string, data: Buffer, type: string) {
  const send = () =>
    fetch(`${supabaseEnv().url}/storage/v1/object/${BUCKET}/${key}`, {
      method: 'POST',
      headers: storageHeaders({ 'Content-Type': type, 'cache-control': 'max-age=31536000', 'x-upsert': 'true' }),
      body: new Uint8Array(data),
      cache: 'no-store',
    });
  await ensureBucket();
  let res = await send();
  // the bucket went missing (deleted in the dashboard): make it again, once
  if (res.status === 404 || (res.status === 400 && /bucket/i.test(await res.clone().text()))) {
    bucketReady = null;
    await ensureBucket();
    res = await send();
  }
  if (!res.ok) throw new Error(`Could not store the photo (${res.status}).`);
}

/** Delete stored photos (keys inside the bucket). Missing ones are fine. */
export async function deletePhotos(keys: string[]) {
  if (!keys.length) return;
  const res = await fetch(`${supabaseEnv().url}/storage/v1/object/${BUCKET}`, {
    method: 'DELETE',
    headers: storageHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ prefixes: keys }),
    cache: 'no-store',
  });
  if (!res.ok && res.status !== 404) console.error('photo delete failed', res.status);
}

/** Photo keys under a prefix, with their age (for cleaning up uploads that were never saved). */
export async function listPhotos(prefix: string): Promise<{ name: string; created_at: string }[]> {
  const res = await fetch(`${supabaseEnv().url}/storage/v1/object/list/${BUCKET}`, {
    method: 'POST',
    headers: storageHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ prefix, limit: 1000, offset: 0 }),
    cache: 'no-store',
  });
  return res.ok ? ((await res.json()) as { name: string; created_at: string }[]) : [];
}
