'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { BADGES, COLOR_FAMILIES, FABRICS, OCCASIONS, OCCASION_LABEL, type Product } from '@/lib/catalog';
import { preparePhoto, type PreparedPhoto } from './photos';

type Category = Product['category'];

/** What the admin API takes: photos are kept paths plus `new:<i>` for the i-th upload. */
export type SavePayload = {
  product: {
    slug?: string;
    name: string;
    nameHi?: string;
    category: Category;
    subcategory: string;
    fabric: Product['fabric'];
    colorFamily: string;
    occasion: Product['occasion'];
    price: number;
    mrp?: number;
    sizes?: string[];
    stitched: boolean;
    inStock: boolean;
    badges?: NonNullable<Product['badges']>;
    description: string;
    care: string[];
    photos: string[];
  };
  uploads: PreparedPhoto[];
};

const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL', 'Free Size'];
const BADGE_LABEL: Record<(typeof BADGES)[number], string> = { new: 'New', bestseller: 'Bestseller', limited: 'Limited' };
const SUGGEST: Record<Category, string[]> = {
  saree: ['Banarasi', 'Chanderi', 'Georgette', 'Cotton', 'Bandhani', 'Leheriya', 'Silk', 'Organza', 'Kanjivaram'],
  suit: ['Anarkali', 'Sharara', 'Salwar', 'Palazzo', 'Co-ord', 'Straight', 'Unstitched'],
};
const CARE: Record<Category, string> = {
  saree: 'Dry clean only\nStore folded in a muslin cloth',
  suit: 'Gentle hand wash or dry clean\nIron on low heat',
};
/** Vercel takes request bodies up to 4.5 MB; leave room for the form and encoding. */
const MAX_UPLOAD_BYTES = 3_000_000;

type Photo = { ref: string; url: string; upload?: PreparedPhoto };

const field = 'min-h-12 w-full min-w-0 rounded-2xl bg-bg px-4 text-base text-fg ring-1 ring-field-line placeholder:text-fg-muted focus:ring-focus md:text-sm';

export function ProductEditor({
  product,
  category: startCategory,
  products,
  busy,
  previews,
  onCancel,
  onSave,
}: {
  product?: Product;
  category: Category;
  products: Product[];
  busy: boolean;
  previews: ReadonlyMap<string, string>;
  onCancel: () => void;
  onSave: (p: SavePayload) => Promise<{ error: string } | null | void>;
}) {
  const [category, setCategory] = useState<Category>(product?.category ?? startCategory);
  const [name, setName] = useState(product?.name ?? '');
  const [nameHi, setNameHi] = useState(product && product.nameHi !== product.name ? product.nameHi : '');
  const [subcategory, setSubcategory] = useState(product?.subcategory ?? '');
  const [fabric, setFabric] = useState<Product['fabric']>(product?.fabric ?? (startCategory === 'saree' ? 'Banarasi' : 'Cotton'));
  const [colorFamily, setColorFamily] = useState(product?.colorFamily ?? 'Red');
  const [occasion, setOccasion] = useState<Product['occasion']>(product?.occasion ?? ['festive']);
  const [price, setPrice] = useState(product ? String(product.price) : '');
  const [mrp, setMrp] = useState(product?.mrp ? String(product.mrp) : '');
  const [sizes, setSizes] = useState<string[]>(product?.sizes ?? (startCategory === 'suit' ? ['S', 'M', 'L', 'XL'] : []));
  const [stitched, setStitched] = useState(product?.stitched ?? startCategory === 'suit');
  const [inStock, setInStock] = useState(product?.inStock ?? true);
  const [badges, setBadges] = useState<NonNullable<Product['badges']>>(product?.badges ?? (product ? [] : ['new']));
  const [description, setDescription] = useState(product?.description ?? '');
  const [care, setCare] = useState(product ? product.care.join('\n') : CARE[startCategory]);
  const [photos, setPhotos] = useState<Photo[]>(() => (product?.photos ?? []).map((p) => ({ ref: p, url: previews.get(p) ?? p })));
  const [preparing, setPreparing] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const dialog = useRef<HTMLDivElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const subSuggestions = useMemo(
    () => [...new Set([...SUGGEST[category], ...products.filter((p) => p.category === category).map((p) => p.subcategory)])],
    [category, products],
  );
  const uploadBytes = photos.reduce((n, p) => n + (p.upload?.bytes ?? 0), 0);

  // a full-screen sheet: lock the page behind it, close on Escape
  useEffect(() => {
    const prev = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    dialog.current?.querySelector<HTMLElement>('input, button')?.focus();
    const key = (e: KeyboardEvent) => e.key === 'Escape' && !busy && onCancel();
    window.addEventListener('keydown', key);
    return () => {
      document.documentElement.style.overflow = prev;
      window.removeEventListener('keydown', key);
    };
  }, [busy, onCancel]);

  const toggle = <T,>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

  async function addFiles(files: FileList | null) {
    if (!files?.length) return;
    setError(null);
    const room = 8 - photos.length;
    const picked = [...files].slice(0, Math.max(0, room));
    if (files.length > room) setError('A product can have up to 8 photos.');
    setPreparing((n) => n + picked.length);
    for (const f of picked) {
      try {
        const up = await preparePhoto(f);
        setPhotos((ps) => [...ps, { ref: 'new', url: up.url, upload: up }]);
      } catch {
        setError(`Could not read “${f.name}”. Use a JPEG, PNG or WebP photo.`);
      } finally {
        setPreparing((n) => n - 1);
      }
    }
  }

  const move = (i: number, d: -1 | 1) =>
    setPhotos((ps) => {
      const j = i + d;
      if (j < 0 || j >= ps.length) return ps;
      const n = [...ps];
      [n[i], n[j]] = [n[j], n[i]];
      return n;
    });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const p = Number(price), m = mrp ? Number(mrp) : undefined;
    if (!name.trim()) return setError('Add a name.');
    if (!subcategory.trim()) return setError('Add the type (for example Banarasi or Anarkali).');
    if (!Number.isInteger(p) || p <= 0) return setError('Price must be a whole number of rupees.');
    if (m !== undefined && (!Number.isInteger(m) || m <= p)) return setError('MRP must be a whole number higher than the price (or empty).');
    if (!occasion.length) return setError('Pick at least one occasion.');
    if (!photos.length && !product?.images.length) return setError('Add at least one photo.');
    if (uploadBytes > MAX_UPLOAD_BYTES) return setError('These new photos are too large to save at once. Save with fewer new photos, then add the rest.');
    const uploads: PreparedPhoto[] = [];
    const refs = photos.map((ph) => {
      if (!ph.upload) return ph.ref;
      uploads.push(ph.upload);
      return `new:${uploads.length - 1}`;
    });
    const r = await onSave({
      product: {
        ...(product ? { slug: product.slug } : {}),
        name: name.trim(),
        ...(nameHi.trim() ? { nameHi: nameHi.trim() } : {}),
        category,
        subcategory: subcategory.trim(),
        fabric,
        colorFamily,
        occasion,
        price: p,
        ...(m ? { mrp: m } : {}),
        ...(sizes.length ? { sizes } : {}),
        stitched,
        inStock,
        ...(badges.length ? { badges } : {}),
        description: description.trim(),
        care: care.split('\n').map((l) => l.trim()).filter(Boolean),
        photos: refs,
      },
      uploads,
    });
    if (r && 'error' in r) setError(r.error);
  }

  // in <body>: the page's <main> is its own stacking context, under the site header
  return createPortal(
    <div className="fixed inset-0 z-[190] bg-scrim" onClick={(e) => e.target === e.currentTarget && !busy && onCancel()}>
      <div
        ref={dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="editor-title"
        className="absolute inset-x-0 bottom-0 top-0 overflow-y-auto overscroll-contain bg-bg sm:inset-y-4 sm:left-1/2 sm:w-[min(720px,calc(100vw-2rem))] sm:-translate-x-1/2 sm:rounded-3xl sm:ring-1 sm:ring-divider"
      >
        <form onSubmit={submit} className="grid gap-5 p-4 pb-[calc(env(safe-area-inset-bottom)+6rem)] sm:p-6 sm:pb-28">
          <div className="flex items-center justify-between gap-3">
            <h2 id="editor-title" className="font-editorial text-3xl font-medium text-fg">
              {product ? 'Edit product' : category === 'saree' ? 'Add a saree' : 'Add a suit'}
            </h2>
            <button type="button" className="chip" onClick={onCancel} disabled={busy}>Close</button>
          </div>

          <Group label="Category">
            <div className="flex gap-2">
              {(['saree', 'suit'] as const).map((c) => (
                <button key={c} type="button" className="chip" aria-pressed={category === c} onClick={() => setCategory(c)}>
                  {c === 'saree' ? 'Saree' : 'Suit'}
                </button>
              ))}
            </div>
          </Group>

          <Group label="Photos" hint="4:5 portrait, daylight, plain wall. The first photo is the cover. Up to 8.">
            <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4">
              {photos.map((ph, i) => (
                <li key={ph.url} className="grid gap-1">
                  {/* eslint-disable-next-line @next/next/no-img-element -- local previews of photos being added */}
                  <img src={ph.url} alt={`Photo ${i + 1}`} className="aspect-[4/5] w-full rounded-xl object-cover ring-1 ring-divider" />
                  <div className="flex justify-between gap-1">
                    <button type="button" className="chip !min-h-9 !px-2.5" aria-label={`Move photo ${i + 1} earlier`} onClick={() => move(i, -1)} disabled={i === 0}>←</button>
                    <button type="button" className="chip !min-h-9 !px-2.5 text-danger" aria-label={`Remove photo ${i + 1}`} onClick={() => setPhotos((ps) => ps.filter((_, j) => j !== i))}>✕</button>
                    <button type="button" className="chip !min-h-9 !px-2.5" aria-label={`Move photo ${i + 1} later`} onClick={() => move(i, 1)} disabled={i === photos.length - 1}>→</button>
                  </div>
                </li>
              ))}
              {photos.length < 8 && (
                <li>
                  <button
                    type="button"
                    onClick={() => fileInput.current?.click()}
                    className="grid aspect-[4/5] w-full place-items-center rounded-xl text-center text-sm text-fg-muted ring-1 ring-dashed ring-field-line hover:text-fg"
                  >
                    {preparing ? 'Preparing…' : '+ Add photos'}
                  </button>
                </li>
              )}
            </ul>
            <input ref={fileInput} type="file" accept="image/*" multiple className="sr-only" tabIndex={-1} onChange={(e) => void addFiles(e.target.files).then(() => (e.target.value = ''))} />
            {!photos.length && product?.images.length ? <p className="text-xs text-fg-muted">This sample product uses drawn artwork until you add photos.</p> : null}
          </Group>

          <div className="grid gap-4 sm:grid-cols-2">
            <Text label="Name" value={name} onChange={setName} placeholder={category === 'saree' ? 'Gulabi Banarasi Silk Saree' : 'Mehendi Cotton Anarkali Suit'} required />
            <Text label="Name in Hindi (optional)" value={nameHi} onChange={setNameHi} placeholder="गुलाबी बनारसी सिल्क साड़ी" lang="hi" />
            <label className="grid gap-2 text-sm text-fg-muted">
              Type
              <input list="admin-sub" value={subcategory} onChange={(e) => setSubcategory(e.target.value)} className={field} placeholder={category === 'saree' ? 'Banarasi' : 'Anarkali'} required />
              <datalist id="admin-sub">{subSuggestions.map((s) => <option key={s} value={s} />)}</datalist>
            </label>
            <label className="grid gap-2 text-sm text-fg-muted">
              Fabric
              <select value={fabric} onChange={(e) => setFabric(e.target.value as Product['fabric'])} className={field}>
                {FABRICS.map((f) => <option key={f} value={f}>{f}</option>)}
              </select>
            </label>
            <Text label="Price (₹)" value={price} onChange={(v) => setPrice(v.replace(/\D/g, ''))} inputMode="numeric" placeholder="4999" required />
            <Text label="MRP before discount (₹, optional)" value={mrp} onChange={(v) => setMrp(v.replace(/\D/g, ''))} inputMode="numeric" placeholder="5999" />
          </div>

          <Group label="Colour">
            <div className="flex flex-wrap gap-2">
              {Object.entries(COLOR_FAMILIES).map(([c, v]) => (
                <button key={c} type="button" className="chip" aria-pressed={colorFamily === c} onClick={() => setColorFamily(c)}>
                  <span aria-hidden className="size-4 rounded-full ring-1 ring-field-line" style={{ background: v.hex }} />
                  {c}
                </button>
              ))}
            </div>
          </Group>

          <Group label="Occasion">
            <div className="flex flex-wrap gap-2">
              {OCCASIONS.map((o) => (
                <button key={o} type="button" className="chip" aria-pressed={occasion.includes(o)} onClick={() => setOccasion((l) => toggle(l, o))}>
                  {OCCASION_LABEL[o].en}
                </button>
              ))}
            </div>
          </Group>

          {(category === 'suit' || sizes.length > 0) && (
            <Group label="Sizes" hint="Leave all off for free size / unstitched.">
              <div className="flex flex-wrap gap-2">
                {SIZES.map((s) => (
                  <button key={s} type="button" className="chip" aria-pressed={sizes.includes(s)} onClick={() => setSizes((l) => toggle(l, s))}>
                    {s}
                  </button>
                ))}
              </div>
            </Group>
          )}

          <Group label="Details">
            <div className="flex flex-wrap gap-2">
              <button type="button" className="chip" aria-pressed={inStock} onClick={() => setInStock((v) => !v)}>In stock</button>
              {category === 'suit' && (
                <button type="button" className="chip" aria-pressed={stitched} onClick={() => setStitched((v) => !v)}>Stitched</button>
              )}
              {BADGES.map((b) => (
                <button key={b} type="button" className="chip" aria-pressed={badges.includes(b)} onClick={() => setBadges((l) => toggle(l, b))}>
                  {BADGE_LABEL[b]}
                </button>
              ))}
            </div>
          </Group>

          <label className="grid gap-2 text-sm text-fg-muted">
            Description
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} className={`${field} py-3`} placeholder="Fabric, work, what it pairs with…" />
          </label>
          <label className="grid gap-2 text-sm text-fg-muted">
            Care (one per line)
            <textarea value={care} onChange={(e) => setCare(e.target.value)} rows={3} className={`${field} py-3`} />
          </label>

          {error && <p className="rounded-2xl bg-surface px-4 py-3 text-sm text-danger ring-1 ring-danger" role="alert">{error}</p>}

          <div className="fixed inset-x-0 bottom-0 flex gap-2 border-t border-divider bg-bg p-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] sm:sticky sm:inset-x-auto sm:-mx-6 sm:-mb-28 sm:rounded-b-3xl sm:p-4">
            <button type="button" className="btn btn-ghost flex-1" onClick={onCancel} disabled={busy}>Cancel</button>
            <button type="submit" className="btn btn-gold flex-[2]" disabled={busy || preparing > 0}>
              {busy ? 'Saving…' : preparing > 0 ? 'Preparing photos…' : product ? 'Save changes' : 'Add to the site'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}

function Group({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <fieldset className="grid gap-2">
      <legend className="mb-2 text-sm text-fg-muted">{label}</legend>
      {children}
      {hint && <p className="text-xs text-fg-muted">{hint}</p>}
    </fieldset>
  );
}

function Text({
  label,
  value,
  onChange,
  ...rest
}: { label: string; value: string; onChange: (v: string) => void } & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'>) {
  return (
    <label className="grid gap-2 text-sm text-fg-muted">
      {label}
      <input value={value} onChange={(e) => onChange(e.target.value)} className={field} {...rest} />
    </label>
  );
}
