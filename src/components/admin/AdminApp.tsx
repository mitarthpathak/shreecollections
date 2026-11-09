'use client';
import Link from 'next/link';
import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { BADGES, COLOR_FAMILIES, FABRICS, productMedia, type Product } from '@/lib/catalog';
import { formatINR } from '@/lib/format';
import { BadgeMark } from '@/components/BadgeMark';
import { ThemeToggle } from '@/components/Theme';
import { IconChevron, IconClose, IconFilter } from '@/components/icons';
import { ProductEditor, type SavePayload } from './ProductEditor';
import { AdminImage, Checkbox, ConfirmDialog, Menu, Modal, Spinner, Switch, Toasts, useToasts, type ConfirmOptions } from './ui';

type DeployState = 'pending' | 'success' | 'failure' | 'unknown';
type Deploy = { version: string; state: DeployState; local: boolean };
type Phase = { kind: 'loading' } | { kind: 'login'; error?: string } | { kind: 'error'; error: string } | { kind: 'ready' };
type Saved = { version: string; products: Product[]; store: 'github' | 'local' };
type Badge = (typeof BADGES)[number];
type Res<T> = { status: number; data: T & { error?: string } };

/** Never throws: a dropped connection comes back as status 0 with a message. */
async function api<T>(url: string, init?: RequestInit): Promise<Res<T>> {
  try {
    const res = await fetch(url, { ...init, headers: { 'Content-Type': 'application/json', ...init?.headers }, cache: 'no-store' });
    const data = (await res.json().catch(() => ({ error: 'Unexpected response from the server.' }))) as T & { error?: string };
    return { status: res.status, data };
  } catch {
    return { status: 0, data: { error: 'No connection. Check the internet and try again.' } as T & { error?: string } };
  }
}

const PAGE = 60;
/** when the catalogue was last read (module-level: only ever called from events) */
const stamp = () => Date.now();
const BADGE_LABEL: Record<Badge, string> = { new: 'New', bestseller: 'Bestseller', limited: 'Limited' };
const CAT_LABEL = { saree: 'Sarees', suit: 'Suits' } as const;
const SIZE_ORDER = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL'];

/** "XS · S · M · L · XL · XXL" → "XS–XXL" when the sizes run without a gap. */
function sizeRange(s: string[]) {
  const at = s.map((x) => SIZE_ORDER.indexOf(x));
  const run = s.length > 2 && at.every((v, i) => v >= 0 && (i === 0 || v === at[i - 1] + 1));
  return run ? `${s[0]}–${s[s.length - 1]}` : s.join(' · ');
}

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
const SORTS: [Filters['sort'], string][] = [
  ['type', 'Group by type'],
  ['newest', 'Newest first'],
  ['name', 'Name A–Z'],
  ['price-asc', 'Price: low to high'],
  ['price-desc', 'Price: high to low'],
];

/** What a URL value may be; anything else (an old link, a typo) falls back to the default. */
const VALID: Record<keyof Filters, (v: string) => boolean> = {
  cat: (v) => v === 'all' || v === 'saree' || v === 'suit',
  type: (v) => v.length <= 60,
  fabric: (v) => (FABRICS as readonly string[]).includes(v),
  color: (v) => v in COLOR_FAMILIES,
  stock: (v) => v === 'all' || v === 'in' || v === 'out',
  photo: (v) => v === 'all' || v === 'with' || v === 'sample',
  badge: (v) => v === 'all' || v === 'none' || (BADGES as readonly string[]).includes(v),
  sort: (v) => SORTS.some(([k]) => k === v),
  q: (v) => v.length <= 100,
};

function readFilters(): Filters {
  if (typeof window === 'undefined') return DEFAULTS;
  const u = new URLSearchParams(window.location.search);
  const f = { ...DEFAULTS };
  for (const k of Object.keys(DEFAULTS) as (keyof Filters)[]) {
    const v = u.get(k);
    if (v !== null && VALID[k](v)) (f as Record<string, string>)[k] = v;
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

/** Stock changes shown before the server confirms them (slug → in stock). */
const overlay = (list: Product[], o: ReadonlyMap<string, boolean>) => (o.size ? list.map((p) => (o.has(p.slug) ? { ...p, inStock: o.get(p.slug)! } : p)) : list);

/* ───────────────────────── the panel ───────────────────────── */

export function AdminApp() {
  const [phase, setPhase] = useState<Phase>({ kind: 'loading' });
  const [products, setProducts] = useState<Product[]>([]);
  const [f, setF] = useState<Filters>(DEFAULTS);
  const [limit, setLimit] = useState(PAGE);
  const [selected, setSelected] = useState<ReadonlySet<string>>(() => new Set());
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(() => new Set());
  const [editing, setEditing] = useState<{ product?: Product; category: Product['category'] } | null>(null);
  /** slugs with a save in flight */
  const [pending, setPending] = useState<ReadonlySet<string>>(() => new Set());
  const [saving, setSaving] = useState(0);
  const [loginBusy, setLoginBusy] = useState(false);
  const [reauth, setReauth] = useState(false);
  const [deploy, setDeploy] = useState<Deploy | null>(null);
  /** photos saved in this session that the live site may not serve yet: path → local preview */
  const [previews, setPreviews] = useState<ReadonlyMap<string, string>>(() => new Map());
  const [asking, setAsking] = useState<{ options: ConfirmOptions; resolve: (ok: boolean) => void } | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const toast = useToasts();
  /** saves run one after another, so their answers arrive in the order they were made */
  const queue = useRef<Promise<unknown>>(Promise.resolve());
  const optimistic = useRef(new Map<string, boolean>());
  const loadedAt = useRef(0);
  const latest = useRef<Product[]>([]);
  const search = useRef<HTMLInputElement>(null);
  const live = useRef({ ready: false, idle: false, cat: DEFAULTS.cat as Filters['cat'] });

  const load = useCallback(async (silent = false) => {
    const r = await api<{ products: Product[] }>('/api/admin/products');
    if (r.status === 401) return setPhase({ kind: 'login', error: silent ? 'Your session ended. Please log in again.' : undefined });
    if (r.status !== 200) {
      if (!silent) setPhase({ kind: 'error', error: r.data.error ?? 'Could not load the products.' });
      return;
    }
    loadedAt.current = Date.now();
    setProducts(overlay(r.data.products, optimistic.current));
    setPhase({ kind: 'ready' });
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- filters from the URL, then the first load
    setF(readFilters());
    void load();
  }, [load]);

  useEffect(() => {
    latest.current = products;
    live.current = { ready: phase.kind === 'ready', idle: phase.kind === 'ready' && !editing && saving === 0, cat: f.cat };
  });

  // Back to this tab after a while (or from another device): show the catalogue as it is now.
  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState !== 'visible' || !live.current.idle || Date.now() - loadedAt.current < 30_000) return;
      void load(true);
    };
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, [load]);

  // "/" searches, "n" adds a product (not while typing, and not over a dialog)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey || !live.current.ready) return;
      const t = e.target as HTMLElement | null;
      if (t?.closest('input, textarea, select, [contenteditable="true"], [role="menu"]') || document.querySelector('[aria-modal="true"]')) return;
      if (e.key === '/') {
        e.preventDefault();
        search.current?.focus();
      } else if (e.key === 'n' || e.key === 'N') {
        e.preventDefault();
        setEditing({ category: live.current.cat === 'suit' ? 'suit' : 'saree' });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // after a save: ask GitHub (Vercel's commit status) until the new version is live
  useEffect(() => {
    if (!deploy || deploy.local || deploy.state !== 'pending') return;
    const version = deploy.version;
    let tries = 0;
    const id = window.setInterval(async () => {
      tries++;
      const r = await api<{ state?: DeployState }>(`/api/admin/status?v=${encodeURIComponent(version)}`);
      const state = r.data.state;
      const done = state === 'success' || state === 'failure';
      // "unknown" only means Vercel hasn't reported yet: keep waiting (about 5 minutes at most)
      if (done || tries >= 40) {
        window.clearInterval(id);
        setDeploy((d) => (d && d.version === version ? { ...d, state: done ? state : 'unknown' } : d));
      }
    }, 8000);
    return () => window.clearInterval(id);
  }, [deploy]);

  const update = (patch: Partial<Filters>) => {
    const next = { ...f, ...patch };
    // a type belongs to one category: picking another category clears it
    if (patch.cat && patch.cat !== f.cat && patch.type === undefined) next.type = '';
    writeFilters(next);
    setF(next);
    setLimit(PAGE);
  };
  const clearFilters = () => update({ ...DEFAULTS, sort: f.sort });

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
    if (grouped)
      for (const p of shown) {
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

  /** The selection only ever acts on products the filters show: hidden ones are left out (and said so). */
  const picked = useMemo(() => shown.filter((p) => selected.has(p.slug)), [shown, selected]);
  const hiddenPicked = selected.size - picked.length;
  const pickedBusy = picked.some((p) => pending.has(p.slug));

  /* ───────── actions ───────── */

  const askConfirm = (options: ConfirmOptions) => new Promise<boolean>((resolve) => setAsking({ options, resolve }));

  const names = (slugs: string[]) => {
    const list = latest.current.filter((p) => slugs.includes(p.slug));
    return list.length === 1 ? `“${list[0].name}”` : `${list.length} products`;
  };

  /** Queue a write. A 401 opens the log-in box over the page; nothing on screen is lost. */
  function post<T extends Saved>(body: unknown, slugs: string[]): Promise<Res<T>> {
    setSaving((n) => n + 1);
    setPending((p) => new Set([...p, ...slugs]));
    const run = queue.current.then(() => api<T>('/api/admin/products', { method: 'POST', body: JSON.stringify(body) }));
    queue.current = run;
    return run.then((r) => {
      setSaving((n) => n - 1);
      setPending((p) => {
        const n = new Set(p);
        slugs.forEach((s) => n.delete(s));
        return n;
      });
      if (r.status === 401) setReauth(true);
      return r;
    });
  }

  function afterSave(data: Saved) {
    loadedAt.current = stamp();
    setProducts(overlay(data.products, optimistic.current));
    const alive = new Set(data.products.map((p) => p.slug));
    setSelected((s) => {
      const n = new Set([...s].filter((x) => alive.has(x)));
      return n.size === s.size ? s : n;
    });
    setDeploy({ version: data.version, state: data.store === 'local' ? 'success' : 'pending', local: data.store === 'local' });
  }

  async function setStock(slugs: string[], inStock: boolean, undoable = true) {
    if (!slugs.length) return;
    const what = names(slugs);
    const before = new Map(latest.current.filter((p) => slugs.includes(p.slug)).map((p) => [p.slug, p.inStock]));
    // the switch moves now; the save follows
    slugs.forEach((s) => optimistic.current.set(s, inStock));
    setProducts((ps) => ps.map((p) => (slugs.includes(p.slug) ? { ...p, inStock } : p)));
    const r = await post({ op: 'bulk', slugs, patch: { inStock } }, slugs);
    slugs.forEach((s) => optimistic.current.delete(s));
    if (r.status !== 200) {
      setProducts((ps) => ps.map((p) => (before.has(p.slug) ? { ...p, inStock: before.get(p.slug)! } : p)));
      if (r.status !== 401) toast.show('error', r.data.error ?? 'Could not update the stock.');
      return;
    }
    afterSave(r.data);
    toast.show('ok', `${what}: ${inStock ? 'in stock' : 'out of stock'}.`, undoable ? { label: 'Undo', run: () => void setStock(slugs, !inStock, false) } : undefined);
  }

  async function setBadge(slugs: string[], badge: Badge, add: boolean, undoable = true) {
    const target = latest.current.filter((p) => slugs.includes(p.slug) && Boolean(p.badges?.includes(badge)) !== add).map((p) => p.slug);
    if (!target.length) {
      const one = slugs.length === 1;
      return toast.show('info', `${add ? (one ? 'It already has' : 'They all already have') : one ? 'It doesn’t have' : 'None of them has'} the “${BADGE_LABEL[badge]}” badge.`);
    }
    const r = await post({ op: 'bulk', slugs: target, patch: add ? { addBadge: badge } : { removeBadge: badge } }, target);
    if (r.status !== 200) {
      if (r.status !== 401) toast.show('error', r.data.error ?? 'Could not update the badges.');
      return;
    }
    afterSave(r.data);
    toast.show(
      'ok',
      `${names(target)}: “${BADGE_LABEL[badge]}” ${add ? 'added' : 'removed'}.`,
      undoable ? { label: 'Undo', run: () => void setBadge(target, badge, !add, false) } : undefined,
    );
  }

  async function removeProducts(list: Product[]) {
    if (!list.length) return;
    const one = list.length === 1;
    const ok = await askConfirm({
      title: one ? `Remove “${list[0].name}”?` : `Remove ${list.length.toLocaleString('en-IN')} products?`,
      body: `${one ? 'It leaves' : 'They leave'} the site, with ${one ? 'its' : 'their'} photos, at the next update (about 2 minutes). This can’t be undone from the panel.`,
      confirm: one ? 'Remove' : `Remove ${list.length.toLocaleString('en-IN')}`,
      danger: true,
      items: list.map((p) => ({ key: p.slug, name: p.name, thumb: previews.get(productMedia(p)[0]) ?? productMedia(p)[0] })),
      typeToConfirm: list.length > 10 ? 'DELETE' : undefined,
    });
    if (!ok) return;
    const slugs = list.map((p) => p.slug);
    const what = names(slugs);
    const r = await post({ op: 'delete', slugs }, slugs);
    if (r.status !== 200) {
      if (r.status !== 401) toast.show('error', r.data.error ?? 'Could not remove.');
      return;
    }
    afterSave(r.data);
    toast.show('ok', `Removed ${what}.`);
  }

  async function save(payload: SavePayload) {
    const slug = payload.product.slug;
    const r = await post<Saved & { slug: string }>(
      { op: 'upsert', product: payload.product, uploads: payload.uploads.map(({ type, data }) => ({ type, data })) },
      slug ? [slug] : [],
    );
    if (r.status === 401) return { error: 'Your session ended. Log in again in the box that opened, then press Save again: nothing you typed is lost.' };
    if (r.status !== 200) return { error: r.data.error ?? 'Saving failed. Please try again.' };
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
    afterSave(r.data);
    setEditing(null);
    toast.show('ok', `${slug ? 'Saved' : 'Added'} “${payload.product.name}”.`);
    return null;
  }

  async function login(password: string) {
    setLoginBusy(true);
    const r = await api('/api/admin/login', { method: 'POST', body: JSON.stringify({ password }) });
    setLoginBusy(false);
    return r.status === 200 ? null : (r.data.error ?? 'Could not log in.');
  }

  async function logout() {
    if (saving) return toast.show('info', 'One moment: a save is still running.');
    await api('/api/admin/logout', { method: 'POST' });
    setProducts([]);
    setSelected(new Set());
    setDeploy(null);
    setPhase({ kind: 'login' });
  }

  const toggleSel = (slugs: string[], on: boolean) =>
    setSelected((s) => {
      const n = new Set(s);
      for (const x of slugs) {
        if (on) n.add(x);
        else n.delete(x);
      }
      return n;
    });
  const openNew = () => setEditing({ category: f.cat === 'suit' ? 'suit' : 'saree' });

  /* ───────── views ───────── */

  if (phase.kind === 'loading') {
    return (
      <Shell>
        <Skeleton />
      </Shell>
    );
  }
  if (phase.kind === 'error') {
    return (
      <Shell narrow>
        <div className="panel grid gap-4 rounded-3xl p-6" role="alert">
          <h2 className="font-editorial text-3xl font-medium text-fg">Couldn’t load the products</h2>
          <p className="text-sm text-fg-muted">{phase.error}</p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="btn btn-gold"
              onClick={() => {
                setPhase({ kind: 'loading' });
                void load();
              }}
            >
              Try again
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => void logout()}>
              Log out
            </button>
          </div>
        </div>
      </Shell>
    );
  }
  if (phase.kind === 'login') {
    return (
      <Shell narrow>
        <Login
          key={phase.error ?? 'login'}
          busy={loginBusy}
          initialError={phase.error}
          onLogin={async (pw) => {
            const error = await login(pw);
            if (!error) {
              setPhase({ kind: 'loading' });
              void load();
            }
            return error;
          }}
        />
      </Shell>
    );
  }

  const shownSlugs = shown.map((p) => p.slug);
  const status = saveStatus(saving, deploy);

  return (
    <Shell
      bar={
        <>
          <div className="ml-auto flex items-center gap-1">
            {status && <StatusPill status={status} onDismiss={() => setDeploy(null)} className="hidden sm:inline-flex" />}
            <a href="/" target="_blank" rel="noopener" className="hidden min-h-11 items-center rounded-full px-3 text-sm text-fg-muted hover:text-fg md:inline-flex">
              View site ↗
            </a>
            <ThemeToggle />
            <button type="button" className="chip !min-h-10" onClick={() => void logout()}>
              Log out
            </button>
          </div>
          {status && (
            <div className="w-full sm:hidden">
              <StatusPill status={status} onDismiss={() => setDeploy(null)} className="inline-flex" />
            </div>
          )}
        </>
      }
    >
      {/* overview: each number is also a filter, and a second press turns it off */}
      <div className="no-scrollbar -mx-4 mb-5 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:grid sm:grid-cols-4 sm:overflow-visible sm:px-0 sm:pb-0">
        <Stat label="Sarees" value={stats.saree} on={f.cat === 'saree'} onClick={() => update({ cat: f.cat === 'saree' ? 'all' : 'saree', type: '' })} />
        <Stat label="Suits" value={stats.suit} on={f.cat === 'suit'} onClick={() => update({ cat: f.cat === 'suit' ? 'all' : 'suit', type: '' })} />
        <Stat label="Out of stock" value={stats.out} warn={stats.out > 0} on={f.stock === 'out'} onClick={() => update({ stock: f.stock === 'out' ? 'all' : 'out' })} />
        <Stat label="Without photos" value={stats.sample} on={f.photo === 'sample'} onClick={() => update({ photo: f.photo === 'sample' ? 'all' : 'sample' })} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[240px_minmax(0,1fr)]">
        {/* catalogue tree: category → type, with counts */}
        <nav aria-label="Categories and types" className="hidden lg:block">
          <div className="sticky top-4 max-h-[calc(100svh-2rem)] overflow-y-auto overscroll-contain rounded-2xl bg-surface p-2 ring-1 ring-divider">
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
          {/* search, filters and Add stay in reach while the list scrolls */}
          <div className="sticky top-0 z-30 -mx-4 mb-3 bg-bg/95 px-4 py-2 backdrop-blur-sm md:mx-0 md:px-0">
            <div className="flex gap-2">
              <label className="sr-only" htmlFor="admin-search">
                Search products
              </label>
              <input
                ref={search}
                id="admin-search"
                type="search"
                value={f.q}
                onChange={(e) => update({ q: e.target.value })}
                placeholder="Search name, ID, price…"
                className="min-h-12 w-full min-w-0 rounded-full bg-bg px-5 text-base text-fg ring-1 ring-field-line placeholder:text-fg-muted focus:ring-2 focus:ring-focus md:text-sm"
              />
              <button type="button" className="chip relative !min-h-12 shrink-0 md:hidden" onClick={() => setFiltersOpen(true)} aria-label={`Filters${activeFilters ? `, ${activeFilters} on` : ''}`}>
                <IconFilter size={18} />
                {activeFilters > 0 && (
                  <span aria-hidden className="absolute -right-1 -top-1 grid size-5 place-items-center rounded-full bg-cta-bg text-[0.7rem] font-semibold text-cta-text">
                    {activeFilters}
                  </span>
                )}
              </button>
              <button type="button" className="btn btn-gold !min-h-12 shrink-0 !px-4 sm:!px-5" onClick={openNew} title="Add a product (N)">
                <span aria-hidden>+</span>
                <span className="sr-only sm:not-sr-only">Add product</span>
              </button>
            </div>
            <div className="mt-2 hidden gap-2 md:grid md:grid-cols-3 xl:grid-cols-6">
              <FilterFields f={f} update={update} />
            </div>
          </div>

          {/* phones and tablets: category and type as chips (the tree is on the left from lg) */}
          <div className="mb-2 lg:hidden">
            <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
              {(['all', 'saree', 'suit'] as const).map((c) => (
                <button key={c} type="button" className="chip shrink-0" aria-pressed={f.cat === c && !f.type} onClick={() => update({ cat: c, type: '' })}>
                  {c === 'all' ? 'All' : CAT_LABEL[c]} <span className="tabular-nums opacity-75">{c === 'all' ? products.length : stats[c]}</span>
                </button>
              ))}
            </div>
            {f.cat !== 'all' && (
              <div className="no-scrollbar -mx-4 mt-2 flex gap-2 overflow-x-auto px-4 pb-1">
                {(tree[f.cat] ?? []).map(([t, n]) => (
                  <button key={t} type="button" className="chip shrink-0 !min-h-10" aria-pressed={f.type === t} onClick={() => update({ type: f.type === t ? '' : t })}>
                    {t} <span className="tabular-nums opacity-75">{n}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="mb-2 flex min-h-11 flex-wrap items-center justify-between gap-x-4 gap-y-1 text-sm text-fg-muted">
            <label className="inline-flex min-h-11 cursor-pointer items-center gap-2">
              <Checkbox
                checked={shown.length > 0 && picked.length === shown.length}
                indeterminate={picked.length > 0}
                onChange={(on) => toggleSel(shownSlugs, on)}
                label={shown.length === products.length ? `Select all ${shown.length}` : `Select all ${shown.length} matching`}
              />
              <span aria-hidden>{shown.length === products.length ? `Select all ${shown.length}` : `Select all ${shown.length} matching`}</span>
            </label>
            <span aria-live="polite" className="tabular-nums">
              {shown.length.toLocaleString('en-IN')} of {products.length.toLocaleString('en-IN')} products
              {activeFilters > 0 && (
                <button type="button" className="ml-3 min-h-11 underline underline-offset-4 hover:text-fg" onClick={clearFilters}>
                  Clear filters
                </button>
              )}
            </span>
          </div>

          <div className="overflow-clip rounded-2xl bg-surface ring-1 ring-divider">
            {/* desktop: column headings; Product and Price sort */}
            <div className="admin-row hidden border-b border-divider bg-surface-2 px-3 py-1 text-xs font-medium uppercase tracking-[0.06em] text-fg-muted lg:grid">
              <span className="[grid-area:cb]" />
              <SortHead
                className="[grid-area:main]"
                label="Product"
                dir={f.sort === 'name' ? 'asc' : undefined}
                onClick={() => update({ sort: f.sort === 'name' ? 'type' : 'name' })}
              />
              <SortHead
                className="justify-self-end [grid-area:price]"
                label="Price"
                dir={f.sort === 'price-asc' ? 'asc' : f.sort === 'price-desc' ? 'desc' : undefined}
                onClick={() => update({ sort: f.sort === 'price-asc' ? 'price-desc' : f.sort === 'price-desc' ? 'type' : 'price-asc' })}
              />
              <span className="[grid-area:stock]">Stock</span>
              <span className="text-right [grid-area:menu]">Actions</span>
            </div>
            <ul>
              {rows.map((r) => {
                if (r.kind === 'group') {
                  const on = r.slugs.filter((s) => selected.has(s)).length;
                  const open = !collapsed.has(r.key);
                  return (
                    <li key={`g-${r.key}`} className="flex items-center gap-3 border-b border-divider bg-surface-2/60 px-3 py-1">
                      <Checkbox checked={on === r.slugs.length} indeterminate={on > 0} onChange={(v) => toggleSel(r.slugs, v)} label={`Select all ${r.label}`} />
                      <button
                        type="button"
                        className="flex min-h-11 flex-1 items-center justify-between gap-2 text-left"
                        aria-expanded={open}
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
                          <span className="ml-2 text-xs tabular-nums text-fg-muted">
                            {f.cat === 'all' ? `${r.cat === 'saree' ? 'Saree' : 'Suit'} · ` : ''}
                            {r.slugs.length} {r.slugs.length === 1 ? 'item' : 'items'}
                          </span>
                        </span>
                        <IconChevron size={18} className={`text-fg-muted transition-transform ${open ? '' : '-rotate-90'}`} />
                      </button>
                    </li>
                  );
                }
                return (
                  <Row
                    key={r.p.slug}
                    p={r.p}
                    thumb={previews.get(productMedia(r.p)[0])}
                    selected={selected.has(r.p.slug)}
                    pending={pending.has(r.p.slug)}
                    grouped={grouped}
                    onSelect={(on) => toggleSel([r.p.slug], on)}
                    onEdit={() => setEditing({ product: r.p, category: r.p.category })}
                    onStock={(v) => void setStock([r.p.slug], v)}
                    onRemove={() => void removeProducts([r.p])}
                  />
                );
              })}
              {!shown.length && (
                <li className="grid justify-items-center gap-3 px-6 py-12 text-center">
                  <p className="font-editorial text-2xl text-fg">{products.length ? 'Nothing matches these filters' : 'No products yet'}</p>
                  <p className="text-sm text-fg-muted">{products.length ? 'Try fewer filters, or another search.' : 'Add the first saree or suit.'}</p>
                  <div className="flex flex-wrap justify-center gap-2">
                    {activeFilters > 0 && (
                      <button type="button" className="btn btn-ghost" onClick={clearFilters}>
                        Clear filters
                      </button>
                    )}
                    <button type="button" className="btn btn-gold" onClick={openNew}>
                      + Add product
                    </button>
                  </div>
                </li>
              )}
            </ul>
          </div>

          {remaining > 0 && (
            <div className="mt-4 flex justify-center">
              <button type="button" className="btn btn-ghost" onClick={() => setLimit((l) => l + PAGE)}>
                Show {Math.min(PAGE, remaining)} more <span className="tabular-nums text-fg-muted">({remaining.toLocaleString('en-IN')} left)</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* actions for the selection */}
      {picked.length > 0 && (
        <div data-admin className="fixed inset-x-0 bottom-0 z-40 px-3 pb-[calc(var(--safe-b)+0.75rem)]">
          <div className="panel mx-auto flex max-w-4xl flex-col gap-1 rounded-3xl p-2 sm:flex-row sm:items-center sm:gap-2">
            <div className="flex min-h-10 items-center justify-between gap-2 pl-2 sm:contents">
              <p className="text-sm text-fg sm:pl-2">
                <span className="font-semibold tabular-nums">{picked.length.toLocaleString('en-IN')}</span> selected
                {hiddenPicked > 0 && <span className="text-fg-muted"> · {hiddenPicked} hidden by filters, left out</span>}
              </p>
              <button type="button" className="chip !min-h-10 shrink-0 sm:order-last" onClick={() => setSelected(new Set())}>
                <IconClose size={16} />
                Clear
              </button>
            </div>
            <div className="no-scrollbar -mx-2 flex items-center gap-2 overflow-x-auto px-2 sm:mx-0 sm:ml-auto sm:px-0">
              {pickedBusy && <Spinner className="text-fg-muted" />}
              <button type="button" className="chip !min-h-10 shrink-0" disabled={pickedBusy} onClick={() => void setStock(picked.filter((p) => !p.inStock).map((p) => p.slug), true)}>
                Mark in stock
              </button>
              <button type="button" className="chip !min-h-10 shrink-0" disabled={pickedBusy} onClick={() => void setStock(picked.filter((p) => p.inStock).map((p) => p.slug), false)}>
                Mark out of stock
              </button>
              <Menu
                label="Badges"
                disabled={pickedBusy}
                className="chip !min-h-10 shrink-0"
                items={[
                  ...BADGES.map((b) => ({ label: `Add “${BADGE_LABEL[b]}”`, onSelect: () => void setBadge(picked.map((p) => p.slug), b, true) })),
                  'divider' as const,
                  ...BADGES.map((b) => ({ label: `Remove “${BADGE_LABEL[b]}”`, onSelect: () => void setBadge(picked.map((p) => p.slug), b, false) })),
                ]}
              >
                Badge <IconChevron size={16} />
              </Menu>
              <span aria-hidden className="mx-1 h-6 w-px shrink-0 bg-divider" />
              <button type="button" className="chip !min-h-10 shrink-0 text-danger" disabled={pickedBusy} onClick={() => void removeProducts(picked)}>
                Remove…
              </button>
            </div>
          </div>
        </div>
      )}

      <Toasts toasts={toast.toasts} onDismiss={toast.dismiss} raised={picked.length > 0} />

      {filtersOpen && (
        <Modal sheet onClose={() => setFiltersOpen(false)} labelledBy="filters-title" z="z-[210]">
          <div className="grid gap-4">
            <div className="flex items-center justify-between gap-3">
              <h2 id="filters-title" className="font-editorial text-2xl font-medium text-fg">
                Filters
              </h2>
              {activeFilters > 0 && (
                <button type="button" className="min-h-11 text-sm text-fg-muted underline underline-offset-4 hover:text-fg" onClick={clearFilters}>
                  Clear all
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <FilterFields f={f} update={update} labelled />
            </div>
            <button type="button" className="btn btn-gold" onClick={() => setFiltersOpen(false)}>
              Show {shown.length.toLocaleString('en-IN')} {shown.length === 1 ? 'product' : 'products'}
            </button>
          </div>
        </Modal>
      )}

      {editing && (
        <ProductEditor
          key={editing.product?.slug ?? `new-${editing.category}`}
          product={editing.product}
          category={editing.category}
          products={products}
          previews={previews}
          onClose={() => setEditing(null)}
          onSave={save}
          confirm={askConfirm}
        />
      )}

      {reauth && (
        <Modal onClose={() => setReauth(false)} labelledBy="reauth-title" z="z-[225]">
          <div className="grid gap-3">
            <h2 id="reauth-title" className="font-editorial text-2xl font-medium text-fg">
              Log in again
            </h2>
            <p className="text-sm text-fg-muted">Your session ended. Log in to carry on: nothing on screen is lost.</p>
            <Login
              inDialog
              busy={loginBusy}
              onLogin={async (pw) => {
                const error = await login(pw);
                if (!error) {
                  setReauth(false);
                  toast.show('ok', 'Logged in again. Please try that once more.');
                }
                return error;
              }}
            />
          </div>
        </Modal>
      )}

      {asking && (
        <ConfirmDialog
          options={asking.options}
          onDone={(ok) => {
            asking.resolve(ok);
            setAsking(null);
          }}
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
  pending,
  grouped,
  onSelect,
  onEdit,
  onStock,
  onRemove,
}: {
  p: Product;
  thumb?: string;
  selected: boolean;
  pending: boolean;
  grouped: boolean;
  onSelect: (on: boolean) => void;
  onEdit: () => void;
  onStock: (inStock: boolean) => void;
  onRemove: () => void;
}) {
  const color = COLOR_FAMILIES[p.colorFamily]?.hex;
  const src = thumb ?? productMedia(p)[0];
  return (
    <li className={`admin-row grid border-b border-divider px-3 py-2.5 last:border-b-0 ${selected ? 'bg-surface-2' : ''}`}>
      <span className="grid place-items-center [grid-area:cb]">
        <Checkbox checked={selected} onChange={onSelect} label={`Select ${p.name}`} />
      </span>
      {/* the whole product block opens the editor */}
      <button type="button" onClick={onEdit} className="group flex min-w-0 items-center gap-3 rounded-xl text-left [grid-area:main]" aria-label={`Edit ${p.name}`}>
        <AdminImage key={src} src={src} className="aspect-[4/5] w-14 shrink-0 rounded-lg object-cover ring-1 ring-divider" />
        <span className="min-w-0">
          <span className="block truncate font-medium text-fg group-hover:text-gold-text">{p.name}</span>
          <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-fg-muted">
            <span className="tabular-nums">{p.id}</span>
            {!grouped && <span>{p.subcategory}</span>}
            <span>{p.fabric}</span>
            <span className="inline-flex items-center gap-1">
              <span aria-hidden className="size-2.5 rounded-full ring-1 ring-field-line" style={{ background: color }} />
              {p.colorFamily}
            </span>
            {p.sizes?.length ? <span>{sizeRange(p.sizes)}</span> : null}
          </span>
          <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
            <span className="font-medium tabular-nums text-fg lg:hidden">{formatINR(p.price)}</span>
            {p.mrp ? <s className="text-xs tabular-nums text-fg-muted lg:hidden">{formatINR(p.mrp)}</s> : null}
            {p.badges?.map((b) => (
              <span key={b} className="rounded-full bg-badge-bg px-2 py-0.5 text-xs text-badge-text">
                {BADGE_LABEL[b]}
              </span>
            ))}
            {!p.photos?.length && <span className="rounded-full px-2 py-0.5 text-xs text-fg-muted ring-1 ring-field-line">No photos</span>}
          </span>
        </span>
      </button>
      <span className="hidden text-right tabular-nums [grid-area:price] lg:block">
        <span className="block font-medium text-fg">{formatINR(p.price)}</span>
        {p.mrp ? <s className="block text-xs text-fg-muted">{formatINR(p.mrp)}</s> : null}
      </span>
      <Switch className="justify-self-start [grid-area:stock]" checked={p.inStock} busy={pending} onChange={onStock} label={`${p.name}: in stock`} on="In stock" off="Out of stock" />
      <span className="flex items-center justify-end gap-1 [grid-area:menu]">
        <button type="button" className="chip hidden !min-h-10 !px-4 lg:inline-flex" onClick={onEdit}>
          Edit
        </button>
        <Menu
          label={`More for ${p.name}`}
          className="grid size-11 place-items-center rounded-full text-lg text-fg hover:bg-surface-2"
          items={[
            { label: 'Edit', onSelect: onEdit },
            { label: 'View on site', href: `/product/${p.slug}`, external: true },
            'divider',
            { label: 'Remove…', danger: true, onSelect: onRemove },
          ]}
        >
          <span aria-hidden>⋯</span>
        </Menu>
      </span>
    </li>
  );
}

function Shell({ children, bar, narrow }: { children: React.ReactNode; bar?: React.ReactNode; narrow?: boolean }) {
  return (
    <main id="main" data-admin data-lenis-prevent className="min-h-svh bg-bg pb-40">
      <header className="border-b border-divider pt-[env(safe-area-inset-top,0px)]">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3 md:px-8">
          <Link href="/" className="shrink-0 rounded-full" aria-label="Shree Collection: open the shop">
            <BadgeMark size={40} />
          </Link>
          <div className="min-w-0 leading-tight">
            <p className="label text-gold-text">Shree Collection</p>
            <h1 className="font-editorial text-2xl font-medium text-fg">Admin</h1>
          </div>
          {bar}
        </div>
      </header>
      <div className={`mx-auto px-4 pt-5 md:px-8 md:pt-8 ${narrow ? 'max-w-md' : 'max-w-7xl'}`}>{children}</div>
    </main>
  );
}

type Status = { tone: 'busy' | 'ok' | 'bad' | 'info'; text: string };

function saveStatus(saving: number, deploy: Deploy | null): Status | null {
  if (saving > 0) return { tone: 'busy', text: 'Saving…' };
  if (!deploy) return null;
  if (deploy.local) return { tone: 'info', text: 'Saved to the local files (dev mode)' };
  if (deploy.state === 'pending') return { tone: 'busy', text: 'Updating the site, about 2 min…' };
  if (deploy.state === 'success') return { tone: 'ok', text: 'Live on the site' };
  if (deploy.state === 'failure') return { tone: 'bad', text: 'Site update failed: check Vercel' };
  return { tone: 'info', text: 'Saved: live after the next site update' };
}

function StatusPill({ status, onDismiss, className = '' }: { status: Status; onDismiss: () => void; className?: string }) {
  const { tone, text } = status;
  return (
    <p
      role="status"
      className={`min-h-9 items-center gap-2 rounded-full pl-3 text-xs font-medium ring-1 ${tone === 'busy' ? 'pr-3' : 'pr-1'} ${
        tone === 'ok' ? 'text-ok ring-ok' : tone === 'bad' ? 'text-danger ring-danger' : 'text-fg-muted ring-divider'
      } ${className}`}
    >
      {tone === 'busy' ? <Spinner className="!size-3" /> : <span aria-hidden className={`size-2 rounded-full ${tone === 'ok' ? 'bg-ok' : tone === 'bad' ? 'bg-danger' : 'bg-field-line'}`} />}
      {text}
      {tone !== 'busy' && (
        <button type="button" aria-label="Dismiss" onClick={onDismiss} className="grid size-8 place-items-center rounded-full hover:bg-surface-2">
          <IconClose size={14} />
        </button>
      )}
    </p>
  );
}

function Stat({ label, value, on, warn, onClick }: { label: string; value: number; on: boolean; warn?: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={`min-w-[8.5rem] shrink-0 rounded-2xl px-4 py-3 text-left ring-1 transition-colors sm:min-w-0 ${
        on ? 'bg-cta-bg text-cta-text ring-cta-bg' : 'bg-surface text-fg ring-divider hover:bg-surface-2'
      }`}
    >
      <span className={`block text-2xl font-semibold leading-none tabular-nums ${!on && warn ? 'text-danger' : ''}`}>{value.toLocaleString('en-IN')}</span>
      <span className={`mt-1.5 block text-xs ${on ? '' : 'text-fg-muted'}`}>{label}</span>
    </button>
  );
}

function TreeItem({ label, count, on, onClick, strong, indent }: { label: string; count: number; on: boolean; onClick: () => void; strong?: boolean; indent?: boolean }) {
  return (
    <button
      type="button"
      aria-current={on ? 'true' : undefined}
      onClick={onClick}
      className={`flex min-h-10 w-full items-center justify-between gap-2 rounded-xl px-3 text-left text-sm transition-colors ${indent ? 'pl-6' : ''} ${
        on ? 'bg-cta-bg text-cta-text' : 'text-fg hover:bg-surface-2'
      } ${strong ? 'font-medium' : ''}`}
    >
      <span className="truncate">{label}</span>
      <span className={`shrink-0 text-xs tabular-nums ${on ? '' : 'text-fg-muted'}`}>{count}</span>
    </button>
  );
}

function SortHead({ label, dir, onClick, className = '' }: { label: string; dir?: 'asc' | 'desc'; onClick: () => void; className?: string }) {
  return (
    <button type="button" onClick={onClick} className={`inline-flex min-h-9 items-center gap-1 uppercase hover:text-fg ${dir ? 'text-fg' : ''} ${className}`}>
      {label}
      <span aria-hidden className="w-3 text-center">
        {dir === 'asc' ? '↑' : dir === 'desc' ? '↓' : ''}
      </span>
      <span className="sr-only">{dir ? `, sorted ${dir === 'asc' ? 'ascending' : 'descending'}` : ', sort'}</span>
    </button>
  );
}

function FilterFields({ f, update, labelled }: { f: Filters; update: (p: Partial<Filters>) => void; labelled?: boolean }) {
  const fields: [keyof Filters, string, [string, string][]][] = [
    ['fabric', 'Fabric', [['', 'All fabrics'], ...FABRICS.map((x) => [x, x] as [string, string])]],
    ['color', 'Colour', [['', 'All colours'], ...Object.keys(COLOR_FAMILIES).map((x) => [x, x] as [string, string])]],
    ['stock', 'Stock', [['all', 'Any stock'], ['in', 'In stock'], ['out', 'Out of stock']]],
    ['photo', 'Photos', [['all', 'Any photos'], ['with', 'With photos'], ['sample', 'Without photos']]],
    ['badge', 'Badge', [['all', 'Any badge'], ['none', 'No badge'], ...BADGES.map((b) => [b, BADGE_LABEL[b]] as [string, string])]],
    ['sort', 'Sort', SORTS],
  ];
  return fields.map(([key, label, options]) => (
    <Select key={key} label={label} labelled={labelled} active={f[key] !== DEFAULTS[key]} value={f[key]} onChange={(v) => update({ [key]: v } as Partial<Filters>)} options={options} />
  ));
}

function Select({
  label,
  labelled,
  active,
  value,
  onChange,
  options,
}: {
  label: string;
  labelled?: boolean;
  active: boolean;
  value: string;
  onChange: (v: string) => void;
  options: [string, string][];
}) {
  return (
    <label className="grid gap-1.5">
      <span className={labelled ? 'text-xs text-fg-muted' : 'sr-only'}>{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`min-h-11 w-full min-w-0 rounded-full bg-bg px-4 text-base focus:ring-2 focus:ring-focus md:text-sm ${active ? 'text-fg ring-2 ring-gold-line' : 'text-fg-muted ring-1 ring-field-line'}`}
      >
        {options.map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </select>
    </label>
  );
}

function Login({
  busy,
  initialError,
  inDialog,
  onLogin,
}: {
  busy: boolean;
  initialError?: string;
  inDialog?: boolean;
  onLogin: (password: string) => Promise<string | null>;
}) {
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState<string | null>(initialError ?? null);
  const id = useId();
  return (
    <form
      className={inDialog ? 'grid gap-4' : 'panel grid gap-4 rounded-3xl p-6'}
      onSubmit={async (e) => {
        e.preventDefault();
        if (!password || busy) return;
        const err = await onLogin(password);
        if (err) setError(err);
      }}
    >
      {!inDialog && <h2 className="font-editorial text-3xl font-medium text-fg">Log in</h2>}
      <div className="grid gap-2">
        <label htmlFor={id} className="text-sm text-fg-muted">
          Admin password
        </label>
        <div className="relative">
          <input
            id={id}
            type={show ? 'text' : 'password'}
            autoComplete="current-password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setError(null);
            }}
            aria-invalid={Boolean(error) || undefined}
            aria-describedby={error ? `${id}-err` : undefined}
            className="min-h-12 w-full rounded-full bg-bg pl-4 pr-20 text-base text-fg ring-1 ring-field-line focus:ring-2 focus:ring-focus aria-[invalid=true]:ring-2 aria-[invalid=true]:ring-danger"
            data-autofocus
            autoFocus={!inDialog}
          />
          <button
            type="button"
            aria-pressed={show}
            aria-label={show ? 'Hide password' : 'Show password'}
            onClick={() => setShow((s) => !s)}
            className="absolute right-1.5 top-1/2 min-h-9 -translate-y-1/2 rounded-full px-3 text-sm text-fg-muted hover:text-fg"
          >
            {show ? 'Hide' : 'Show'}
          </button>
        </div>
      </div>
      {error && (
        <p id={`${id}-err`} className="text-sm text-danger" role="alert">
          {error}
        </p>
      )}
      <button type="submit" className="btn btn-gold" disabled={busy || !password}>
        {busy ? (
          <>
            <Spinner />
            Checking…
          </>
        ) : (
          'Log in'
        )}
      </button>
    </form>
  );
}

function Skeleton() {
  return (
    <div aria-busy="true" className="grid gap-5">
      <p className="sr-only" role="status">
        Loading the products…
      </p>
      <div className="flex gap-2 overflow-hidden sm:grid sm:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-[4.6rem] min-w-[8.5rem] animate-pulse rounded-2xl bg-surface-2" />
        ))}
      </div>
      <div className="h-12 animate-pulse rounded-full bg-surface-2" />
      <div className="overflow-hidden rounded-2xl ring-1 ring-divider">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex items-center gap-3 border-b border-divider p-3 last:border-0">
            <div className="size-5 rounded bg-surface-2" />
            <div className="aspect-[4/5] w-14 animate-pulse rounded-lg bg-surface-2" />
            <div className="grid flex-1 gap-2">
              <div className="h-4 w-2/3 animate-pulse rounded bg-surface-2" />
              <div className="h-3 w-1/3 animate-pulse rounded bg-surface-2" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
