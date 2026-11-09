import 'server-only';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import type { Product } from '@/lib/catalog.schema';

/**
 * Where the catalogue lives for the admin panel.
 *
 * GitHub (production): data/products.json and the photos in public/products/ are read from and
 * committed to the repository (ADMIN_GITHUB_TOKEN, ADMIN_GITHUB_REPO, ADMIN_GITHUB_BRANCH).
 * Every save is one commit; Vercel then rebuilds the site with it.
 *
 * Local (development only, when no token is set): the same files on this machine's disk.
 */
export const CATALOG_PATH = 'data/products.json';

export type FileChange = { path: string; data: Buffer | null };
export type Snapshot = { products: Product[]; version: string };
export type Store = {
  kind: 'github' | 'local';
  read(): Promise<Snapshot>;
  /** Commit the changes on top of `version`; false if the branch moved on meanwhile. */
  write(version: string, changes: FileChange[], message: string): Promise<{ ok: true; version: string } | { ok: false }>;
  /** The deploy state of a version: building, live, failed or unknown. */
  deployState(version: string): Promise<'pending' | 'success' | 'failure' | 'unknown'>;
};

export class StoreError extends Error {}

const encodePath = (p: string) => p.split('/').map(encodeURIComponent).join('/');

function githubStore(): Store | null {
  const token = process.env.ADMIN_GITHUB_TOKEN;
  if (!token) return null;
  const repo = process.env.ADMIN_GITHUB_REPO || 'mitarthpathak/shreecollections';
  const branch = process.env.ADMIN_GITHUB_BRANCH || 'main';
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
    async read() {
      const version = await head();
      const r = await gh<string | Product[]>('GET', `/contents/${encodePath(CATALOG_PATH)}?ref=${version}`, undefined, 'application/vnd.github.raw+json');
      if (r.status !== 200) throw new StoreError(`Could not read ${CATALOG_PATH} (${r.status}).`);
      const products = typeof r.data === 'string' ? (JSON.parse(r.data) as Product[]) : r.data;
      return { products, version };
    },
    async write(version, changes, message) {
      const base = await gh<{ tree: { sha: string } }>('GET', `/git/commits/${version}`);
      if (base.status !== 200) throw new StoreError(`Could not read commit ${version} (${base.status}).`);
      const tree = [];
      for (const c of changes) {
        if (c.data === null) {
          tree.push({ path: c.path, mode: '100644', type: 'blob', sha: null });
          continue;
        }
        const blob = await gh<{ sha: string }>('POST', '/git/blobs', { content: c.data.toString('base64'), encoding: 'base64' });
        if (blob.status !== 201) throw new StoreError(`Could not upload ${c.path} (${blob.status}).`);
        tree.push({ path: c.path, mode: '100644', type: 'blob', sha: blob.data.sha });
      }
      const t = await gh<{ sha: string }>('POST', '/git/trees', { base_tree: base.data.tree.sha, tree });
      if (t.status !== 201) throw new StoreError(`Could not build the commit (${t.status}).`);
      const commit = await gh<{ sha: string }>('POST', '/git/commits', { message, tree: t.data.sha, parents: [version] });
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

function localStore(): Store {
  // turbopackIgnore: development-only disk access; keeps the project out of the deployed function
  const root = process.cwd();
  const file = path.join(/*turbopackIgnore: true*/ root, CATALOG_PATH);
  const versionOf = async () => String((await fs.stat(file)).mtimeMs);
  return {
    kind: 'local',
    async read() {
      return { products: JSON.parse(await fs.readFile(file, 'utf8')) as Product[], version: await versionOf() };
    },
    async write(version, changes) {
      if ((await versionOf()) !== version) return { ok: false };
      for (const c of changes) {
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

/** The GitHub store when a token is set; the local disk in development; nothing otherwise. */
export function getStore(): Store | null {
  return githubStore() ?? (process.env.NODE_ENV === 'development' || process.env.ADMIN_LOCAL_STORE === '1' ? localStore() : null);
}
