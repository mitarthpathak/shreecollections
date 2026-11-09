'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { productMedia, type Product } from '@/lib/catalog';
import { ProductEditor, type SavePayload } from './ProductEditor';

type Deploy = { version: string; state: 'pending' | 'success' | 'failure' | 'unknown'; local: boolean };
type Phase = { kind: 'loading' } | { kind: 'login'; error?: string } | { kind: 'error'; error: string } | { kind: 'ready' };

async function api<T>(url: string, init?: RequestInit): Promise<{ status: number; data: T & { error?: string } }> {
  const res = await fetch(url, { ...init, headers: { 'Content-Type': 'application/json', ...init?.headers }, cache: 'no-store' });
  const data = (await res.json().catch(() => ({ error: 'Unexpected response from the server.' }))) as T & { error?: string };
  return { status: res.status, data };
}

const rupees = (n: number) => `₹${n.toLocaleString('en-IN')}`;

export function AdminApp() {
  const [phase, setPhase] = useState<Phase>({ kind: 'loading' });
  const [products, setProducts] = useState<Product[]>([]);
  const [filter, setFilter] = useState<'all' | 'saree' | 'suit'>('all');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [editing, setEditing] = useState<{ product?: Product; category: Product['category'] } | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);
  const [deploy, setDeploy] = useState<Deploy | null>(null);
  /** photos saved in this session that the live site may not serve yet: path → local preview */
  const [previews, setPreviews] = useState<ReadonlyMap<string, string>>(() => new Map());

  const load = useCallback(async () => {
    const r = await api<{ products: Product[] }>('/api/admin/products');
    if (r.status === 401) return setPhase({ kind: 'login' });
    if (r.status !== 200) return setPhase({ kind: 'error', error: r.data.error ?? 'Could not load the products.' });
    setProducts(r.data.products);
    setPhase({ kind: 'ready' });
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the first load of the list
    void load();
  }, [load]);

  // after a save: ask GitHub (Vercel's commit status) until the new version is live
  useEffect(() => {
    if (!deploy || deploy.local || deploy.state === 'success' || deploy.state === 'failure') return;
    let tries = 0;
    const id = window.setInterval(async () => {
      tries++;
      const r = await api<{ state: Deploy['state'] }>(`/api/admin/status?v=${encodeURIComponent(deploy.version)}`);
      const state = r.data.state ?? 'unknown';
      if (state !== deploy.state || tries > 40) setDeploy((d) => (d && d.version === deploy.version ? { ...d, state: tries > 40 && state !== 'success' ? 'unknown' : state } : d));
      if (state === 'success' || state === 'failure' || tries > 40) window.clearInterval(id);
    }, 8000);
    return () => window.clearInterval(id);
  }, [deploy]);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products.filter((p) => (filter === 'all' || p.category === filter) && (!q || `${p.name} ${p.nameHi} ${p.subcategory} ${p.fabric} ${p.colorFamily} ${p.id}`.toLowerCase().includes(q)));
  }, [products, filter, query]);

  const counts = useMemo(() => ({ saree: products.filter((p) => p.category === 'saree').length, suit: products.filter((p) => p.category === 'suit').length }), [products]);

  async function login(password: string) {
    setBusy(true);
    const r = await api('/api/admin/login', { method: 'POST', body: JSON.stringify({ password }) });
    setBusy(false);
    if (r.status !== 200) return setPhase({ kind: 'login', error: r.data.error ?? 'Could not log in.' });
    setPhase({ kind: 'loading' });
    void load();
  }

  async function logout() {
    await api('/api/admin/logout', { method: 'POST' });
    setProducts([]);
    setPhase({ kind: 'login' });
  }

  function afterSave(data: { version: string; products: Product[]; store: 'github' | 'local' }, text: string) {
    setProducts(data.products);
    setSelected(new Set());
    setDeploy({ version: data.version, state: data.store === 'local' ? 'success' : 'pending', local: data.store === 'local' });
    setNotice({ tone: 'ok', text });
  }

  async function save(payload: SavePayload) {
    setBusy(true);
    setNotice(null);
    const r = await api<{ version: string; products: Product[]; store: 'github' | 'local'; slug: string }>('/api/admin/products', {
      method: 'POST',
      body: JSON.stringify({ op: 'upsert', product: payload.product, uploads: payload.uploads.map(({ type, data }) => ({ type, data })) }),
    });
    setBusy(false);
    if (r.status === 401) return setPhase({ kind: 'login', error: 'Your session ended. Please log in again.' });
    if (r.status !== 200) return { error: r.data.error ?? 'Saving failed.' };
    // keep showing the photos just uploaded until the site has been rebuilt with them
    const saved = r.data.products.find((p) => p.slug === r.data.slug);
    setPreviews((prev) => {
      const next = new Map(prev);
      payload.product.photos.forEach((ref, i) => {
        const m = /^new:(\d+)$/.exec(ref);
        const path = saved?.photos?.[i];
        if (m && path) next.set(path, payload.uploads[Number(m[1])].url);
      });
      return next;
    });
    afterSave(r.data, `${payload.product.slug ? 'Saved' : 'Added'} “${payload.product.name}”.`);
    setEditing(null);
    return null;
  }

  async function removeProducts(slugs: string[]) {
    const names = products.filter((p) => slugs.includes(p.slug)).map((p) => p.name);
    if (!names.length) return;
    const what = names.length === 1 ? `“${names[0]}”` : `${names.length} products`;
    if (!window.confirm(`Remove ${what} from the site? This deletes ${names.length === 1 ? 'it' : 'them'} and the photos.`)) return;
    setBusy(true);
    setNotice(null);
    const r = await api<{ version: string; products: Product[]; store: 'github' | 'local' }>('/api/admin/products', { method: 'POST', body: JSON.stringify({ op: 'delete', slugs }) });
    setBusy(false);
    if (r.status === 401) return setPhase({ kind: 'login', error: 'Your session ended. Please log in again.' });
    if (r.status !== 200) return setNotice({ tone: 'error', text: r.data.error ?? 'Could not remove.' });
    afterSave(r.data, `Removed ${what}.`);
  }

  if (phase.kind === 'loading') return <Shell><p className="text-fg-muted" role="status">Loading…</p></Shell>;
  if (phase.kind === 'error') {
    return (
      <Shell>
        <p className="rounded-2xl bg-surface p-5 text-fg ring-1 ring-divider" role="alert">{phase.error}</p>
        <button type="button" className="btn btn-ghost mt-4" onClick={() => void logout()}>Log out</button>
      </Shell>
    );
  }
  if (phase.kind === 'login') return <Shell><Login busy={busy} error={phase.error} onLogin={login} /></Shell>;

  const allShownSelected = shown.length > 0 && shown.every((p) => selected.has(p.slug));

  return (
    <Shell
      actions={
        <button type="button" className="btn btn-ghost !min-h-11 !px-4" onClick={() => void logout()}>
          Log out
        </button>
      }
    >
      <p className="mb-5 text-sm text-fg-muted">
        {counts.saree} sarees · {counts.suit} suits. Changes go live on the site about 2 minutes after you save.
      </p>

      {deploy && <DeployBanner deploy={deploy} />}
      {notice && (
        <p role={notice.tone === 'error' ? 'alert' : 'status'} className={`mb-4 rounded-2xl px-4 py-3 text-sm ring-1 ${notice.tone === 'error' ? 'text-danger ring-danger' : 'text-fg ring-divider'} bg-surface`}>
          {notice.text}
        </p>
      )}

      <div className="mb-4 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
        <button type="button" className="btn btn-gold" onClick={() => setEditing({ category: 'saree' })} disabled={busy}>+ Add saree</button>
        <button type="button" className="btn btn-gold" onClick={() => setEditing({ category: 'suit' })} disabled={busy}>+ Add suit</button>
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        {(['all', 'saree', 'suit'] as const).map((f) => (
          <button key={f} type="button" className="chip" aria-pressed={filter === f} onClick={() => setFilter(f)}>
            {f === 'all' ? `All (${products.length})` : f === 'saree' ? `Sarees (${counts.saree})` : `Suits (${counts.suit})`}
          </button>
        ))}
        <label className="sr-only" htmlFor="admin-search">Search products</label>
        <input
          id="admin-search"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search name, fabric, colour, ID"
          className="min-h-11 min-w-0 flex-1 basis-full rounded-full bg-bg px-4 text-base text-fg ring-1 ring-field-line placeholder:text-fg-muted focus:ring-focus sm:basis-48 md:text-sm"
        />
      </div>

      <div className="mb-2 flex min-h-11 flex-wrap items-center justify-between gap-2 text-sm">
        <label className="inline-flex min-h-11 items-center gap-2 text-fg-muted">
          <input
            type="checkbox"
            className="size-5 accent-[var(--gold-text)]"
            checked={allShownSelected}
            onChange={() => setSelected(allShownSelected ? new Set() : new Set(shown.map((p) => p.slug)))}
          />
          Select all shown
        </label>
        {selected.size > 0 && (
          <button type="button" className="btn btn-ghost !min-h-11 !px-4 text-danger" disabled={busy} onClick={() => void removeProducts([...selected])}>
            Remove selected ({selected.size})
          </button>
        )}
      </div>

      <ul className="divide-y divide-divider overflow-hidden rounded-2xl bg-surface ring-1 ring-divider">
        {shown.map((p) => (
          <li key={p.slug} className="flex items-center gap-3 p-3">
            <input
              type="checkbox"
              aria-label={`Select ${p.name}`}
              className="size-5 shrink-0 accent-[var(--gold-text)]"
              checked={selected.has(p.slug)}
              onChange={() =>
                setSelected((s) => {
                  const n = new Set(s);
                  if (n.has(p.slug)) n.delete(p.slug);
                  else n.add(p.slug);
                  return n;
                })
              }
            />
            <Thumb src={previews.get(productMedia(p)[0]) ?? productMedia(p)[0]} />
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium text-fg">{p.name}</p>
              <p className="truncate text-xs text-fg-muted">
                {p.category === 'saree' ? 'Saree' : 'Suit'} · {p.subcategory} · {p.colorFamily} · {rupees(p.price)}
                {!p.inStock && ' · out of stock'}
                {!p.photos?.length && ' · sample (no photo)'}
              </p>
            </div>
            <div className="flex shrink-0 flex-col gap-1 sm:flex-row">
              <button type="button" className="chip !min-h-10 !px-3" onClick={() => setEditing({ product: p, category: p.category })} disabled={busy}>Edit</button>
              <button type="button" className="chip !min-h-10 !px-3 text-danger" onClick={() => void removeProducts([p.slug])} disabled={busy}>Remove</button>
            </div>
          </li>
        ))}
        {!shown.length && <li className="p-6 text-center text-sm text-fg-muted">No products match.</li>}
      </ul>

      {editing && (
        <ProductEditor
          key={editing.product?.slug ?? `new-${editing.category}`}
          product={editing.product}
          category={editing.category}
          products={products}
          busy={busy}
          previews={previews}
          onCancel={() => setEditing(null)}
          onSave={save}
        />
      )}
    </Shell>
  );
}

function Shell({ children, actions }: { children: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-3xl px-4 pb-16 pt-8 md:px-8 md:pt-12">
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <p className="label mb-2 text-gold-text">Shree Collection</p>
          <h1 className="font-editorial text-4xl font-medium text-fg md:text-5xl">Admin</h1>
        </div>
        {actions}
      </div>
      {children}
    </div>
  );
}

function Login({ busy, error, onLogin }: { busy: boolean; error?: string; onLogin: (p: string) => void }) {
  const [password, setPassword] = useState('');
  return (
    <form
      className="panel grid gap-4 rounded-3xl p-6"
      onSubmit={(e) => {
        e.preventDefault();
        if (password) onLogin(password);
      }}
    >
      <label className="grid gap-2 text-sm text-fg-muted" htmlFor="admin-password">
        Admin password
        <input
          id="admin-password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="min-h-12 rounded-full bg-bg px-4 text-base text-fg ring-1 ring-field-line focus:ring-focus"
          autoFocus
        />
      </label>
      {error && <p className="text-sm text-danger" role="alert">{error}</p>}
      <button type="submit" className="btn btn-gold" disabled={busy || !password}>{busy ? 'Checking…' : 'Log in'}</button>
    </form>
  );
}

function DeployBanner({ deploy }: { deploy: Deploy }) {
  const text = deploy.local
    ? 'Saved to this computer’s files (local mode). Restart or rebuild the site to see it.'
    : deploy.state === 'success'
      ? 'Live on the site now.'
      : deploy.state === 'failure'
        ? 'The site could not be rebuilt with this change. Check the latest deployment in Vercel.'
        : deploy.state === 'pending'
          ? 'Saved. The site is updating (about 2 minutes)…'
          : 'Saved. The site will show it after the next update (about 2 minutes).';
  return (
    <p role="status" className={`mb-4 rounded-2xl bg-surface px-4 py-3 text-sm ring-1 ${deploy.state === 'failure' ? 'text-danger ring-danger' : 'text-fg ring-divider'}`}>
      {text}
    </p>
  );
}

function Thumb({ src }: { src?: string }) {
  const [broken, setBroken] = useState(false);
  if (!src || broken) return <span aria-hidden className="block aspect-[4/5] w-12 shrink-0 rounded-md bg-surface-2 ring-1 ring-divider" />;
  // eslint-disable-next-line @next/next/no-img-element -- admin thumbnails, incl. local previews of unsaved photos
  return <img src={src} alt="" className="aspect-[4/5] w-12 shrink-0 rounded-md object-cover ring-1 ring-divider" onError={() => setBroken(true)} />;
}

