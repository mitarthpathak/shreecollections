'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { BADGES, COLOR_FAMILIES, FABRICS, productMedia, type Product } from '@/lib/catalog';
import { ProductEditor, type SavePayload } from './ProductEditor';

type Deploy = { version: string; state: 'pending' | 'success' | 'failure' | 'unknown'; local: boolean };
type Phase = { kind: 'loading' } | { kind: 'login'; error?: string } | { kind: 'error'; error: string } | { kind: 'ready' };
type Saved = { version: string; products: Product[]; store: 'github' | 'local' };
type Badge = (typeof BADGES)[number];

async function api<T>(url: string, init?: RequestInit): Promise<{ status: number; data: T & { error?: string } }> {
  const res = await fetch(url, { ...init, headers: { 'Content-Type': 'application/json', ...init?.headers }, cache: 'no-store' });
  const data = (await res.json().catch(() => ({ error: 'Unexpected response from the server.' }))) as T & { error?: string };
  return { status: res.status, data };
}

const rupees = (n: number) => `₹${n.toLocaleString('en-IN')}`;
const PAGE = 60;
const BADGE_LABEL: Record<Badge, string> = { new: 'New', bestseller: 'Bestseller', limited: 'Limited' };
const CAT_LABEL = { saree: 'Sarees', suit: 'Suits' } as const;

/* ───────────────────────── filters (kept in the URL, so a refresh or a shared link keeps them) ───────────────────────── */

type Filters = {
  cat: 'all' | Product['category'];
  type: string;
  fabric: string;
  color: string;
  stock: 'all' | 'in' | 'out';
  photo: 'all' | 'with' | 'sample';
  badge: 'all' | 'none' | Badge;
  sort: 'type' | 'newest' | 'name' | 'price-asc' | 'price-desc';
  q: string;
};
const DEFAULTS: Filters = { cat: 'all', type: '', fabric: '', color: '', stock: 'all', photo: 'all', badge: 'all', sort: 'type', q: '' };

function readFilters(): Filters {
  if (typeof window === 'undefined') return DEFAULTS;
  const u = new URLSearchParams(window.location.search);
  const f = { ...DEFAULTS };
  for (const k of Object.keys(DEFAULTS) as (keyof Filters)[]) {
    const v = u.get(k);
    if (v !== null) (f as Record<string, string>)[k] = v;
  }
  return f;
}

function writeFilters(f: Filters) {
  const u = new URLSearchParams();
  for (const k of Object.keys(DEFAULTS) as (keyof Filters)[]) if (f[k] !== DEFAULTS[k]) u.set(k, String(f[k]));
  const qs = u.toString();
  window.history.replaceState(null, '', `${window.location.pathname}${qs ? `?${qs}` : ''}`);
}

function matches(p: Product, f: Filters, q: string) {
  if (f.cat !== 'all' && p.category !== f.cat) return false;
  if (f.type && p.subcategory !== f.type) return false;
  if (f.fabric && p.fabric !== f.fabric) return false;
  if (f.color && p.colorFamily !== f.color) return false;
  if (f.stock !== 'all' && p.inStock !== (f.stock === 'in')) return false;
  if (f.photo !== 'all' && Boolean(p.photos?.length) !== (f.photo === 'with')) return false;
  if (f.badge === 'none' && p.badges?.length) return false;
  if (f.badge !== 'all' && f.badge !== 'none' && !p.badges?.includes(f.badge)) return false;
  if (q && !`${p.name} ${p.nameHi} ${p.subcategory} ${p.fabric} ${p.colorFamily} ${p.id} ${p.price}`.toLowerCase().includes(q)) return false;
  return true;
}

/* ───────────────────────── the panel ───────────────────────── */

export function AdminApp() {
  const [phase, setPhase] = useState<Phase>({ kind: 'loading' });
  const [products, setProducts] = useState<Product[]>([]);
  const [f, setF] = useState<Filters>(DEFAULTS);
  const [limit, setLimit] = useState(PAGE);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
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
    // eslint-disable-next-line react-hooks/set-state-in-effect -- filters from the URL, then the first load
    setF(readFilters());
    void load();
  }, [load]);

  const update = (patch: Partial<Filters>) => {
    setF((prev) => {
      const next = { ...prev, ...patch };
      // a type belongs to one category: picking another category clears it
      if (patch.cat && patch.cat !== prev.cat && !patch.type) next.type = '';
      writeFilters(next);
      return next;
    });
    setLimit(PAGE);
  };

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

  /** category → type → count, for the sidebar */
  const tree = useMemo(() => {
    const t = { saree: new Map<string, number>(), suit: new Map<string, number>() };
    for (const p of products) t[p.category].set(p.subcategory, (t[p.category].get(p.subcategory) ?? 0) + 1);
    const sorted = (m: Map<string, number>) => [...m].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
    return { saree: sorted(t.saree), suit: sorted(t.suit) };
  }, [products]);

  const stats = useMemo(
    () => ({
      saree: products.filter((p) => p.category === 'saree').length,
      suit: products.filter((p) => p.category === 'suit').length,
      out: products.filter((p) => !p.inStock).length,
      sample: products.filter((p) => !p.photos?.length).length,
    }),
    [products],
  );

  const shown = useMemo(() => {
    const q = f.q.trim().toLowerCase();
    const order = new Map(products.map((p, i) => [p.slug, i])); // the catalogue's order: newest first
    const list = products.filter((p) => matches(p, f, q));
    const by: Record<Filters['sort'], (a: Product, b: Product) => number> = {
      type: (a, b) => a.category.localeCompare(b.category) || a.subcategory.localeCompare(b.subcategory) || a.name.localeCompare(b.name),
      newest: (a, b) => order.get(a.slug)! - order.get(b.slug)!,
      name: (a, b) => a.name.localeCompare(b.name),
      'price-asc': (a, b) => a.price - b.price,
      'price-desc': (a, b) => b.price - a.price,
    };
    return list.sort(by[f.sort] ?? by.type);
  }, [products, f]);

  const grouped = f.sort === 'type';
  /** the rows to render: group headings (when grouped) and products, up to `limit` products */
  const rows = useMemo(() => {
    const out: ({ kind: 'group'; key: string; label: string; cat: Product['category']; slugs: string[] } | { kind: 'item'; p: Product })[] = [];
    let n = 0;
    let current = '';
    const groupSlugs = new Map<string, string[]>();
    if (grouped) for (const p of shown) {
      const k = `${p.category}|${p.subcategory}`;
      groupSlugs.set(k, [...(groupSlugs.get(k) ?? []), p.slug]);
    }
    for (const p of shown) {
      if (n >= limit) break;
      if (grouped) {
        const k = `${p.category}|${p.subcategory}`;
        if (k !== current) {
          current = k;
          out.push({ kind: 'group', key: k, label: p.subcategory, cat: p.category, slugs: groupSlugs.get(k) ?? [] });
        }
        if (collapsed.has(k)) continue;
      }
      out.push({ kind: 'item', p });
      n++;
    }
    return out;
  }, [shown, grouped, limit, collapsed]);
  const rendered = rows.filter((r) => r.kind === 'item').length;
  const hiddenByCollapse = grouped ? shown.filter((p) => collapsed.has(`${p.category}|${p.subcategory}`)).length : 0;
  const remaining = shown.length - rendered - hiddenByCollapse;

  const activeFilters = (Object.keys(DEFAULTS) as (keyof Filters)[]).filter((k) => k !== 'sort' && f[k] !== DEFAULTS[k]).length;

  /* ───────── actions ───────── */

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

  function afterSave(data: Saved, text: string) {
    setProducts(data.products);
    setSelected(new Set());
    setDeploy({ version: data.version, state: data.store === 'local' ? 'success' : 'pending', local: data.store === 'local' });
    setNotice({ tone: 'ok', text });
  }

  async function post<T extends Saved>(body: unknown) {
    setBusy(true);
    setNotice(null);
    const r = await api<T>('/api/admin/products', { method: 'POST', body: JSON.stringify(body) });
    setBusy(false);
    if (r.status === 401) {
      setPhase({ kind: 'login', error: 'Your session ended. Please log in again.' });
      return null;
    }
    return r;
  }

  async function save(payload: SavePayload) {
    const r = await post<Saved & { slug: string }>({ op: 'upsert', product: payload.product, uploads: payload.uploads.map(({ type, data }) => ({ type, data })) });
    if (!r) return null;
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

  const describe = (slugs: string[]) => {
    const names = products.filter((p) => slugs.includes(p.slug)).map((p) => p.name);
    return names.length === 1 ? `“${names[0]}”` : `${names.length} products`;
  };

  async function removeProducts(slugs: string[]) {
    if (!slugs.length) return;
    const what = describe(slugs);
    if (!window.confirm(`Remove ${what} from the site? This deletes ${slugs.length === 1 ? 'it' : 'them'} and the photos.`)) return;
    const r = await post({ op: 'delete', slugs });
    if (!r) return;
    if (r.status !== 200) return setNotice({ tone: 'error', text: r.data.error ?? 'Could not remove.' });
    afterSave(r.data, `Removed ${what}.`);
  }

  async function bulk(slugs: string[], patch: { inStock?: boolean; addBadge?: Badge; removeBadge?: Badge }, text: string) {
    if (!slugs.length) return;
    const r = await post({ op: 'bulk', slugs, patch });
    if (!r) return;
    if (r.status !== 200) return setNotice({ tone: 'error', text: r.data.error ?? 'Could not update.' });
    afterSave(r.data, `${describe(slugs)}: ${text}.`);
  }

  const toggle = (slugs: string[], on: boolean) =>
    setSelected((s) => {
      const n = new Set(s);
      for (const x of slugs) {
        if (on) n.add(x);
        else n.delete(x);
      }
      return n;
    });

  /* ───────── views ───────── */

  if (phase.kind === 'loading') return <Shell><p className="text-fg-muted" role="status">Loading…</p></Shell>;
  if (phase.kind === 'error') {
    return (
      <Shell>
        <p className="rounded-2xl bg-surface p-5 text-fg ring-1 ring-divider" role="alert">{phase.error}</p>
        <button type="button" className="btn btn-ghost mt-4" onClick={() => void logout()}>Log out</button>
      </Shell>
    );
  }
  if (phase.kind === 'login') return <Shell narrow><Login busy={busy} error={phase.error} onLogin={login} /></Shell>;

  const shownSlugs = shown.map((p) => p.slug);
  const allShownSelected = shown.length > 0 && shownSlugs.every((s) => selected.has(s));

  return (
    <Shell
      actions={
        <div className="flex gap-2">
          <button type="button" className="btn btn-gold !min-h-11 !px-4" onClick={() => setEditing({ category: f.cat === 'suit' ? 'suit' : 'saree' })} disabled={busy}>
            + Add product
          </button>
          <button type="button" className="btn btn-ghost !min-h-11 !px-4" onClick={() => void logout()}>Log out</button>
        </div>
      }
    >
      {/* overview: each number is a shortcut to that view */}
      <div className="mb-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat label="Sarees" value={stats.saree} on={f.cat === 'saree' && !f.type} onClick={() => update({ ...DEFAULTS, sort: f.sort, cat: 'saree' })} />
        <Stat label="Suits" value={stats.suit} on={f.cat === 'suit' && !f.type} onClick={() => update({ ...DEFAULTS, sort: f.sort, cat: 'suit' })} />
        <Stat label="Out of stock" value={stats.out} on={f.stock === 'out'} onClick={() => update({ stock: f.stock === 'out' ? 'all' : 'out' })} />
        <Stat label="Without photos" value={stats.sample} on={f.photo === 'sample'} onClick={() => update({ photo: f.photo === 'sample' ? 'all' : 'sample' })} />
      </div>

      {deploy && <DeployBanner deploy={deploy} />}
      {notice && (
        <p role={notice.tone === 'error' ? 'alert' : 'status'} className={`mb-4 rounded-2xl bg-surface px-4 py-3 text-sm ring-1 ${notice.tone === 'error' ? 'text-danger ring-danger' : 'text-fg ring-divider'}`}>
          {notice.text}
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-[240px_minmax(0,1fr)]">
        {/* catalogue tree: category → type, with counts */}
        <nav aria-label="Categories and types" className="hidden lg:block">
          <div className="sticky top-[calc(var(--header-h)+1rem)] max-h-[calc(100svh-var(--header-h)-2rem)] overflow-y-auto rounded-2xl bg-surface p-2 ring-1 ring-divider">
            <TreeItem label="All products" count={products.length} on={f.cat === 'all' && !f.type} onClick={() => update({ cat: 'all', type: '' })} />
            {(['saree', 'suit'] as const).map((c) => (
              <div key={c} className="mt-1">
                <TreeItem label={CAT_LABEL[c]} count={stats[c]} on={f.cat === c && !f.type} onClick={() => update({ cat: c, type: '' })} strong />
                <ul>
                  {tree[c].map(([t, n]) => (
                    <li key={t}>
                      <TreeItem label={t} count={n} on={f.cat === c && f.type === t} onClick={() => update({ cat: c, type: t })} indent />
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </nav>

        <div className="min-w-0">
          {/* phones / tablets: category and type as chips */}
          <div className="mb-3 lg:hidden">
            <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
              {(['all', 'saree', 'suit'] as const).map((c) => (
                <button key={c} type="button" className="chip shrink-0" aria-pressed={f.cat === c && !f.type} onClick={() => update({ cat: c, type: '' })}>
                  {c === 'all' ? `All ${products.length}` : `${CAT_LABEL[c]} ${stats[c]}`}
                </button>
              ))}
            </div>
            {f.cat !== 'all' && (
              <div className="no-scrollbar -mx-4 mt-2 flex gap-2 overflow-x-auto px-4 pb-1">
                {tree[f.cat].map(([t, n]) => (
                  <button key={t} type="button" className="chip shrink-0 !min-h-10" aria-pressed={f.type === t} onClick={() => update({ type: f.type === t ? '' : t })}>
                    {t} <span className="text-fg-muted">{n}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* search + filters */}
          <div className="mb-3 grid gap-2">
            <label className="sr-only" htmlFor="admin-search">Search products</label>
            <input
              id="admin-search"
              type="search"
              value={f.q}
              onChange={(e) => update({ q: e.target.value })}
              placeholder="Search by name, ID, fabric, colour or price"
              className="min-h-12 w-full rounded-full bg-bg px-5 text-base text-fg ring-1 ring-field-line placeholder:text-fg-muted focus:ring-focus md:text-sm"
            />
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
              <Select label="Fabric" value={f.fabric} onChange={(v) => update({ fabric: v })} options={[['', 'All fabrics'], ...FABRICS.map((x) => [x, x] as [string, string])]} />
              <Select label="Colour" value={f.color} onChange={(v) => update({ color: v })} options={[['', 'All colours'], ...Object.keys(COLOR_FAMILIES).map((x) => [x, x] as [string, string])]} />
              <Select label="Stock" value={f.stock} onChange={(v) => update({ stock: v as Filters['stock'] })} options={[['all', 'Any stock'], ['in', 'In stock'], ['out', 'Out of stock']]} />
              <Select label="Photos" value={f.photo} onChange={(v) => update({ photo: v as Filters['photo'] })} options={[['all', 'Any photos'], ['with', 'With photos'], ['sample', 'Without photos']]} />
              <Select label="Badge" value={f.badge} onChange={(v) => update({ badge: v as Filters['badge'] })} options={[['all', 'Any badge'], ['none', 'No badge'], ...BADGES.map((b) => [b, BADGE_LABEL[b]] as [string, string])]} />
              <Select
                label="Sort"
                value={f.sort}
                onChange={(v) => update({ sort: v as Filters['sort'] })}
                options={[['type', 'Group by type'], ['newest', 'Newest first'], ['name', 'Name A–Z'], ['price-asc', 'Price: low to high'], ['price-desc', 'Price: high to low']]}
              />
            </div>
          </div>

          <div className="mb-2 flex min-h-11 flex-wrap items-center justify-between gap-2 text-sm text-fg-muted">
            <label className="inline-flex min-h-11 items-center gap-2">
              <input type="checkbox" className="size-5 accent-[var(--gold-text)]" checked={allShownSelected} onChange={() => toggle(shownSlugs, !allShownSelected)} />
              {shown.length === products.length ? `Select all ${shown.length}` : `Select all ${shown.length} matching`}
            </label>
            <span aria-live="polite">
              {shown.length.toLocaleString('en-IN')} of {products.length.toLocaleString('en-IN')} products
              {activeFilters > 0 && (
                <button type="button" className="ml-3 underline underline-offset-4 hover:text-fg" onClick={() => update({ ...DEFAULTS, sort: f.sort })}>
                  Clear filters
                </button>
              )}
            </span>
          </div>

          <ul className="overflow-clip rounded-2xl bg-surface ring-1 ring-divider">
            {rows.map((r) =>
              r.kind === 'group' ? (
                <li key={`g-${r.key}`} className="flex items-center gap-3 border-b border-divider bg-surface-2 px-3 py-2">
                  <input
                    type="checkbox"
                    aria-label={`Select all ${r.label}`}
                    className="size-5 accent-[var(--gold-text)]"
                    checked={r.slugs.every((s) => selected.has(s))}
                    onChange={(e) => toggle(r.slugs, e.target.checked)}
                  />
                  <button
                    type="button"
                    className="flex min-h-10 flex-1 items-center justify-between gap-2 text-left"
                    aria-expanded={!collapsed.has(r.key)}
                    onClick={() =>
                      setCollapsed((c) => {
                        const n = new Set(c);
                        if (n.has(r.key)) n.delete(r.key);
                        else n.add(r.key);
                        return n;
                      })
                    }
                  >
                    <span>
                      <span className="font-editorial text-xl font-medium text-fg">{r.label}</span>
                      <span className="ml-2 text-xs text-fg-muted">
                        {f.cat === 'all' ? `${r.cat === 'saree' ? 'Saree' : 'Suit'} · ` : ''}
                        {r.slugs.length} {r.slugs.length === 1 ? 'item' : 'items'}
                      </span>
                    </span>
                    <span aria-hidden className={`text-fg-muted transition-transform ${collapsed.has(r.key) ? '-rotate-90' : ''}`}>▾</span>
                  </button>
                </li>
              ) : (
                <Row
                  key={r.p.slug}
                  p={r.p}
                  thumb={previews.get(productMedia(r.p)[0])}
                  selected={selected.has(r.p.slug)}
                  busy={busy}
                  onSelect={(on) => toggle([r.p.slug], on)}
                  onEdit={() => setEditing({ product: r.p, category: r.p.category })}
                  onStock={() => void bulk([r.p.slug], { inStock: !r.p.inStock }, r.p.inStock ? 'out of stock' : 'back in stock')}
                  onRemove={() => void removeProducts([r.p.slug])}
                />
              ),
            )}
            {!shown.length && <li className="p-8 text-center text-sm text-fg-muted">No products match these filters.</li>}
          </ul>

          {remaining > 0 && (
            <div className="mt-4 flex justify-center">
              <button type="button" className="btn btn-ghost" onClick={() => setLimit((l) => l + PAGE)}>
                Show {Math.min(PAGE, remaining)} more <span className="text-fg-muted">({remaining.toLocaleString('en-IN')} left)</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* bulk actions for the selection */}
      {selected.size > 0 && (
        <div className="fixed inset-x-0 bottom-[calc(var(--tabbar-h)+var(--safe-b))] z-[60] px-3 pb-3 md:bottom-0">
          <div className="panel mx-auto flex max-w-4xl flex-wrap items-center gap-2 rounded-3xl p-3">
            <span className="px-2 text-sm font-medium text-fg">{selected.size} selected</span>
            <button type="button" className="chip !min-h-10" disabled={busy} onClick={() => void bulk([...selected], { inStock: true }, 'marked in stock')}>In stock</button>
            <button type="button" className="chip !min-h-10" disabled={busy} onClick={() => void bulk([...selected], { inStock: false }, 'marked out of stock')}>Out of stock</button>
            <BadgeMenu busy={busy} onPick={(b, add) => void bulk([...selected], add ? { addBadge: b } : { removeBadge: b }, add ? `badge “${BADGE_LABEL[b]}” added` : `badge “${BADGE_LABEL[b]}” removed`)} />
            <button type="button" className="chip !min-h-10 text-danger" disabled={busy} onClick={() => void removeProducts([...selected])}>Remove</button>
            <button type="button" className="chip !min-h-10 ml-auto" onClick={() => setSelected(new Set())}>Clear</button>
          </div>
        </div>
      )}

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

/* ───────────────────────── pieces ───────────────────────── */

function Row({
  p,
  thumb,
  selected,
  busy,
  onSelect,
  onEdit,
  onStock,
  onRemove,
}: {
  p: Product;
  thumb?: string;
  selected: boolean;
  busy: boolean;
  onSelect: (on: boolean) => void;
  onEdit: () => void;
  onStock: () => void;
  onRemove: () => void;
}) {
  const color = COLOR_FAMILIES[p.colorFamily]?.hex;
  return (
    <li className={`grid scroll-mt-[calc(var(--header-h)+1rem)] scroll-mb-[calc(var(--tabbar-h)+5rem)] grid-cols-[auto_auto_minmax(0,1fr)] items-center gap-x-3 gap-y-2 border-b border-divider p-3 last:border-b-0 sm:grid-cols-[auto_auto_minmax(0,1fr)_auto] ${selected ? 'bg-surface-2' : ''}`}>
      <input type="checkbox" aria-label={`Select ${p.name}`} className="size-5 accent-[var(--gold-text)]" checked={selected} onChange={(e) => onSelect(e.target.checked)} />
      <Thumb src={thumb ?? productMedia(p)[0]} local={Boolean(thumb)} />
      <div className="min-w-0">
        <button type="button" onClick={onEdit} className="block max-w-full truncate text-left font-medium text-fg hover:text-gold-text">
          {p.name}
        </button>
        <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-fg-muted">
          <span>{p.id}</span>
          <span>{p.fabric}</span>
          <span className="inline-flex items-center gap-1">
            <span aria-hidden className="size-2.5 rounded-full ring-1 ring-field-line" style={{ background: color }} />
            {p.colorFamily}
          </span>
          {p.sizes?.length ? <span>{p.sizes.join(' · ')}</span> : null}
        </p>
        <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
          <span className="font-medium text-fg">{rupees(p.price)}</span>
          {p.mrp && <span className="text-xs text-fg-muted line-through">{rupees(p.mrp)}</span>}
          {p.badges?.map((b) => (
            <span key={b} className="rounded-full bg-badge-bg px-2 py-0.5 text-xs text-badge-text">{BADGE_LABEL[b]}</span>
          ))}
          {!p.photos?.length && <span className="rounded-full px-2 py-0.5 text-xs text-fg-muted ring-1 ring-field-line">No photos</span>}
        </p>
      </div>
      <div className="col-span-3 flex flex-wrap gap-1.5 sm:col-span-1 sm:justify-end">
        <button
          type="button"
          className={`chip !min-h-10 !px-3 ${p.inStock ? '' : 'text-danger'}`}
          disabled={busy}
          onClick={onStock}
          aria-label={p.inStock ? `${p.name} is in stock; mark out of stock` : `${p.name} is out of stock; mark in stock`}
        >
          <span aria-hidden className={`size-2 rounded-full ${p.inStock ? 'bg-[var(--gold-text)]' : 'bg-[var(--danger)]'}`} />
          {p.inStock ? 'In stock' : 'Out of stock'}
        </button>
        <button type="button" className="chip !min-h-10 !px-3" onClick={onEdit} disabled={busy}>Edit</button>
        <button type="button" className="chip !min-h-10 !px-3 text-danger" onClick={onRemove} disabled={busy}>Remove</button>
      </div>
    </li>
  );
}

function Shell({ children, actions, narrow }: { children: React.ReactNode; actions?: React.ReactNode; narrow?: boolean }) {
  return (
    <div className={`mx-auto px-4 pb-40 pt-8 md:px-8 md:pt-12 ${narrow ? 'max-w-md' : 'max-w-7xl'}`}>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
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

function Stat({ label, value, on, onClick }: { label: string; value: number; on: boolean; onClick: () => void }) {
  return (
    <button type="button" aria-pressed={on} onClick={onClick} className={`rounded-2xl p-4 text-left ring-1 transition-colors ${on ? 'bg-cta-bg text-cta-text ring-cta-bg' : 'bg-surface text-fg ring-divider hover:bg-surface-2'}`}>
      <span className="block font-editorial text-3xl font-medium leading-none">{value.toLocaleString('en-IN')}</span>
      <span className={`mt-1 block text-xs ${on ? '' : 'text-fg-muted'}`}>{label}</span>
    </button>
  );
}

function TreeItem({ label, count, on, onClick, strong, indent }: { label: string; count: number; on: boolean; onClick: () => void; strong?: boolean; indent?: boolean }) {
  return (
    <button
      type="button"
      aria-current={on ? 'true' : undefined}
      onClick={onClick}
      className={`flex min-h-10 w-full items-center justify-between gap-2 rounded-xl px-3 text-left text-sm transition-colors ${indent ? 'pl-6' : ''} ${on ? 'bg-cta-bg text-cta-text' : 'text-fg hover:bg-surface-2'} ${strong ? 'font-medium' : ''}`}
    >
      <span className="truncate">{label}</span>
      <span className={`shrink-0 text-xs ${on ? '' : 'text-fg-muted'}`}>{count}</span>
    </button>
  );
}

function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: [string, string][] }) {
  return (
    <label className="grid">
      <span className="sr-only">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className={`min-h-11 w-full min-w-0 rounded-full bg-bg px-4 text-base ring-1 ring-field-line focus:ring-focus md:text-sm ${value && value !== 'all' && value !== 'type' ? 'text-fg ring-gold-line' : 'text-fg-muted'}`}>
        {options.map(([v, l]) => (
          <option key={v} value={v}>{l}</option>
        ))}
      </select>
    </label>
  );
}

function BadgeMenu({ busy, onPick }: { busy: boolean; onPick: (b: Badge, add: boolean) => void }) {
  return (
    <label className="inline-flex">
      <span className="sr-only">Badge</span>
      <select
        className="chip !min-h-10 appearance-none pr-4"
        disabled={busy}
        value=""
        onChange={(e) => {
          const [op, b] = e.target.value.split(':') as ['add' | 'remove', Badge];
          if (b) onPick(b, op === 'add');
        }}
      >
        <option value="">Badge…</option>
        {BADGES.map((b) => (
          <option key={`a-${b}`} value={`add:${b}`}>Add “{BADGE_LABEL[b]}”</option>
        ))}
        {BADGES.map((b) => (
          <option key={`r-${b}`} value={`remove:${b}`}>Remove “{BADGE_LABEL[b]}”</option>
        ))}
      </select>
    </label>
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

/** Small thumbnails through the image optimiser (a 1600 × 2000 photo would be ~300 KB each). */
function Thumb({ src, local }: { src?: string; local?: boolean }) {
  const [broken, setBroken] = useState(false);
  if (!src || broken) return <span aria-hidden className="block aspect-[4/5] w-14 shrink-0 rounded-lg bg-surface-2 ring-1 ring-divider" />;
  const url = local || !src.startsWith('/') ? src : `/_next/image?url=${encodeURIComponent(src)}&w=96&q=70`;
  // eslint-disable-next-line @next/next/no-img-element -- admin thumbnails, incl. local previews of unsaved photos
  return <img src={url} alt="" loading="lazy" decoding="async" className="aspect-[4/5] w-14 shrink-0 rounded-lg object-cover ring-1 ring-divider" onError={() => setBroken(true)} />;
}
