import 'server-only';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import type { Product } from '@/lib/catalog.schema';
import { dbConfigured, deletePhotos, publicBase, putPhoto, readCatalog, sql, storageConfigured } from '@/lib/db';
import type { Change, PhotoHost } from './products';

/**
 * Where the catalogue lives for the admin panel, best first:
 *
 * Supabase (when connected): products in Postgres, photos in Storage. A save is live on the
 * site in seconds (the pages are revalidated); nothing is rebuilt and nothing is committed.
 *
 * GitHub: data/products.json and the photos in public/products/ are read from and committed to
 * the repository (ADMIN_GITHUB_TOKEN, ADMIN_GITHUB_REPO, ADMIN_GITHUB_BRANCH). Every save is one
 * commit; Vercel then rebuilds the site with it (about 2 minutes).
 *
 * Local (development only, when neither is set): the same files on this machine's disk.
 */
export const CATALOG_PATH = 'data/products.json';

export type Snapshot = { products: Product[]; version: string };
export type Store = {
  kind: 'supabase' | 'github' | 'local';
  /** a save shows on the site without a rebuild */
  live: boolean;
  /** photos are uploaded one by one before the save (no request-size limit on a save) */
  separateUploads: boolean;
  host: PhotoHost;
  read(): Promise<Snapshot>;
  /** Apply the change on top of `version`; false if the catalogue moved on meanwhile. */
  write(version: string, change: Change): Promise<{ ok: true; version: string } | { ok: false }>;
  /** The deploy state of a version: building, live, failed or unknown. */
  deployState(version: string): Promise<'pending' | 'success' | 'failure' | 'unknown'>;
};

export class StoreError extends Error {}

type FileChange = { path: string; data: Buffer | null };

/** Repository photos: site paths under /products/<slug>/. */
const repoHost: PhotoHost = { ref: (slug, file) => `/products/${slug}/${file}`, uploaded: () => null };

/** A change as repository files: the photos, the deleted photos and the catalogue JSON. */
function repoFiles(change: Change): FileChange[] {
  const own = ({ slug, ref }: { slug: string; ref: string }) => ref.startsWith(`/products/${slug}/`) && !ref.includes('..');
  return [
    ...change.added.map((a) => ({ path: `public${a.ref}`, data: a.data })),
    ...change.dropped.filter(own).map((d) => ({ path: `public${d.ref}`, data: null })),
    { path: CATALOG_PATH, data: Buffer.from(`${JSON.stringify(change.products, null, 2)}\n`) },
  ];
}

/* ───────────────────────── Supabase ───────────────────────── */

function supabaseStore(): Store | null {
  if (!dbConfigured() || !storageConfigured()) return null;
  const base = () => publicBase();
  const keyOf = (ref: string) => (ref.startsWith(`${base()}/`) ? ref.slice(base().length + 1) : null);
  return {
    kind: 'supabase',
    live: true,
    separateUploads: true,
    host: {
      ref: (slug, file) => `${base()}/products/${slug}/${file}`,
      uploaded: (name) => `${base()}/uploads/${name}`,
    },
    async read() {
      try {
        return await readCatalog();
      } catch (e) {
        console.error('catalogue read failed', e);
        throw new StoreError('Could not reach the database. Please try again in a minute.');
      }
    },
    async write(version, change) {
      // new photos first: a failed save leaves at most an unused file, never a product without its photo
      try {
        await Promise.all(change.added.map((a) => putPhoto(keyOf(a.ref)!, a.data, a.type)));
      } catch (e) {
        throw new StoreError(e instanceof Error ? e.message : 'Could not store the photos.');
      }
      const bySlug = new Map(change.products.map((p) => [p.slug, p]));
      let next: string | null = null;
      try {
        next = await sql().begin(async (tx) => {
          const [meta] = await tx<{ version: string }[]>`select version::text from shree.meta where id = 1 for update`;
          if (meta.version !== version) return null;
          const have = new Set((await tx<{ slug: string }[]>`select slug from shree.products`).map((r) => r.slug));
          const gone = [...have].filter((s) => !bySlug.has(s));
          if (gone.length) await tx`delete from shree.products where slug = any(${gone})`;
          const [{ max }] = await tx<{ max: string }[]>`select coalesce(max(position), 0)::text as max from shree.products`;
          let pos = Number(max);
          // the list is newest first: the first new product gets the highest position
          for (const p of change.products.filter((x) => !have.has(x.slug)).reverse()) {
            await tx`insert into shree.products (slug, position, data) values (${p.slug}, ${++pos}, ${tx.json(p as never)})`;
          }
          for (const slug of change.touched) {
            const p = bySlug.get(slug);
            if (p && have.has(slug)) await tx`update shree.products set data = ${tx.json(p as never)}, updated_at = now() where slug = ${slug}`;
          }
          const [v] = await tx<{ version: string }[]>`update shree.meta set version = version + 1 where id = 1 returning version::text`;
          return v.version;
        });
      } catch (e) {
        console.error('catalogue write failed', e);
        throw new StoreError('Could not save to the database. Please try again.');
      }
      if (!next) {
        await deletePhotos(change.added.map((a) => keyOf(a.ref)!));
        return { ok: false };
      }
      // photos no longer used go once the save has landed (only ones in our storage)
      await deletePhotos(change.dropped.map((d) => keyOf(d.ref)).filter((k): k is string => Boolean(k))).catch(() => {});
      return { ok: true, version: next };
    },
    async deployState() {
      return 'success';
    },
  };
}

/* ───────────────────────── GitHub ───────────────────────── */

const encodePath = (p: string) => p.split('/').map(encodeURIComponent).join('/');

function githubStore(): Store | null {
  const token = process.env.ADMIN_GITHUB_TOKEN;
  if (!token) return null;
  const env = process.env;
  const repo =
    env.ADMIN_GITHUB_REPO || (env.VERCEL_GIT_REPO_OWNER && env.VERCEL_GIT_REPO_SLUG ? `${env.VERCEL_GIT_REPO_OWNER}/${env.VERCEL_GIT_REPO_SLUG}` : 'mitarthpathak/shreecollections');
  // Save to the branch this deployment was built from (Vercel sets it), so a save always lands
  // where the live site is built: production saves go to the production branch, a preview's
  // to its own branch. ADMIN_GITHUB_BRANCH overrides it.
  const branch = env.ADMIN_GITHUB_BRANCH || env.VERCEL_GIT_COMMIT_REF || 'main';
  const api = (process.env.ADMIN_GITHUB_API || 'https://api.github.com').replace(/\/$/, '');

  async function gh<T>(method: string, url: string, body?: unknown, accept = 'application/vnd.github+json'): Promise<{ status: number; data: T }> {
    const res = await fetch(`${api}/repos/${repo}${url}`, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: accept,
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'shree-collection-admin',
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      cache: 'no-store',
    });
    const text = await res.text();
    let data: unknown = text;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      /* raw file content */
    }
    if (res.status === 401 || res.status === 403) throw new StoreError('GitHub refused the token (check ADMIN_GITHUB_TOKEN: Contents read and write on this repository).');
    if (res.status === 404 && method === 'GET' && url.startsWith('/git/ref')) throw new StoreError(`Branch "${branch}" not found in ${repo}.`);
    return { status: res.status, data: data as T };
  }

  async function head() {
    const r = await gh<{ object: { sha: string } }>('GET', `/git/ref/heads/${encodeURIComponent(branch)}`);
    if (r.status !== 200) throw new StoreError(`Could not read branch ${branch} (${r.status}).`);
    return r.data.object.sha;
  }

  return {
    kind: 'github',
    live: false,
    separateUploads: false,
    host: repoHost,
    async read() {
      const version = await head();
      const r = await gh<string | Product[]>('GET', `/contents/${encodePath(CATALOG_PATH)}?ref=${version}`, undefined, 'application/vnd.github.raw+json');
      if (r.status !== 200) throw new StoreError(`Could not read ${CATALOG_PATH} (${r.status}).`);
      const products = typeof r.data === 'string' ? (JSON.parse(r.data) as Product[]) : r.data;
      return { products, version };
    },
    async write(version, change) {
      const base = await gh<{ tree: { sha: string } }>('GET', `/git/commits/${version}`);
      if (base.status !== 200) throw new StoreError(`Could not read commit ${version} (${base.status}).`);
      // the files' blobs upload side by side
      const tree = await Promise.all(
        repoFiles(change).map(async (c) => {
          if (c.data === null) return { path: c.path, mode: '100644', type: 'blob', sha: null };
          const blob = await gh<{ sha: string }>('POST', '/git/blobs', { content: c.data.toString('base64'), encoding: 'base64' });
          if (blob.status !== 201) throw new StoreError(`Could not upload ${c.path} (${blob.status}).`);
          return { path: c.path, mode: '100644', type: 'blob', sha: blob.data.sha };
        }),
      );
      const t = await gh<{ sha: string }>('POST', '/git/trees', { base_tree: base.data.tree.sha, tree });
      if (t.status !== 201) throw new StoreError(`Could not build the commit (${t.status}).`);
      const commit = await gh<{ sha: string }>('POST', '/git/commits', { message: change.message, tree: t.data.sha, parents: [version] });
      if (commit.status !== 201) throw new StoreError(`Could not create the commit (${commit.status}).`);
      // not forced: if someone else committed meanwhile, GitHub refuses and the caller retries
      const ref = await gh('PATCH', `/git/refs/heads/${encodeURIComponent(branch)}`, { sha: commit.data.sha, force: false });
      if (ref.status === 422 || ref.status === 409) return { ok: false };
      if (ref.status !== 200) throw new StoreError(`Could not update ${branch} (${ref.status}).`);
      return { ok: true, version: commit.data.sha };
    },
    async deployState(version) {
      const r = await gh<{ state?: string; total_count?: number }>('GET', `/commits/${version}/status`);
      if (r.status !== 200 || !r.data.total_count) return 'unknown';
      return r.data.state === 'success' ? 'success' : r.data.state === 'pending' ? 'pending' : 'failure';
    },
  };
}

/* ───────────────────────── local files (development) ───────────────────────── */

function localStore(): Store {
  // turbopackIgnore: development-only disk access; keeps the project out of the deployed function
  const root = process.cwd();
  const file = path.join(/*turbopackIgnore: true*/ root, CATALOG_PATH);
  const versionOf = async () => String((await fs.stat(file)).mtimeMs);
  return {
    kind: 'local',
    live: false,
    separateUploads: false,
    host: repoHost,
    async read() {
      return { products: JSON.parse(await fs.readFile(file, 'utf8')) as Product[], version: await versionOf() };
    },
    async write(version, change) {
      if ((await versionOf()) !== version) return { ok: false };
      for (const c of repoFiles(change)) {
        const target = path.join(/*turbopackIgnore: true*/ root, c.path);
        if (!target.startsWith(root + path.sep)) throw new StoreError(`Refusing to write outside the project: ${c.path}`);
        if (c.data === null) await fs.rm(target, { force: true });
        else {
          await fs.mkdir(path.dirname(target), { recursive: true });
          await fs.writeFile(target, c.data);
        }
      }
      return { ok: true, version: await versionOf() };
    },
    async deployState() {
      return 'unknown';
    },
  };
}

/** Supabase when connected, else GitHub when a token is set, else the local disk in development. */
export function getStore(): Store | null {
  return (
    supabaseStore() ??
    githubStore() ??
    (process.env.NODE_ENV === 'development' || process.env.ADMIN_LOCAL_STORE === '1' ? localStore() : null)
  );
}
