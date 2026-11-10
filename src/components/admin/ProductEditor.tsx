'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { BADGES, COLOR_FAMILIES, FABRICS, OCCASIONS, OCCASION_LABEL, type Product } from '@/lib/catalog';
import { discountPct, formatINR } from '@/lib/format';
import { useModal } from '@/lib/modal';
import { prefersReducedMotion } from '@/lib/gsap';
import { IconClose } from '@/components/icons';
import { needsCrop, preparePhoto, RATIO, type PreparedPhoto } from './photos';
import { AdminImage, Menu, Modal, Spinner, Switch, type ConfirmOptions } from './ui';

type Category = Product['category'];
type Badge = (typeof BADGES)[number];

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
const DEFAULT_SIZES = ['S', 'M', 'L', 'XL'];
const BADGE_LABEL: Record<Badge, string> = { new: 'New', bestseller: 'Bestseller', limited: 'Limited' };
const SUGGEST: Record<Category, string[]> = {
  saree: ['Banarasi', 'Chanderi', 'Georgette', 'Cotton', 'Bandhani', 'Leheriya', 'Silk', 'Organza', 'Kanjivaram'],
  suit: ['Anarkali', 'Sharara', 'Salwar', 'Palazzo', 'Co-ord', 'Straight', 'Unstitched'],
};
const CARE: Record<Category, string> = {
  saree: 'Dry clean only\nStore folded in a muslin cloth',
  suit: 'Gentle hand wash or dry clean\nIron on low heat',
};
const DEFAULT_FABRIC: Record<Category, Product['fabric']> = { saree: 'Banarasi', suit: 'Cotton' };
/** Vercel takes request bodies up to 4.5 MB; leave room for the form and encoding. */
const MAX_UPLOAD_BYTES = 3_000_000;
const MAX_PHOTOS = 8;
/** The same limits the server checks (src/lib/admin/products.ts), so its errors stay rare. */
const LIMIT = { name: 120, sub: 60, price: 10_000_000, description: 2000, careLines: 12, careLine: 200 };

type Photo = { id: string; ref: string; url: string; upload?: PreparedPhoto; file?: File; focus?: number; busy?: boolean };
type Field = 'photos' | 'name' | 'nameHi' | 'subcategory' | 'price' | 'mrp' | 'occasion' | 'description' | 'care';
const FIELD_ORDER: Field[] = ['photos', 'name', 'nameHi', 'subcategory', 'price', 'mrp', 'occasion', 'description', 'care'];
type Errors = Partial<Record<Field, string>>;

let seq = 0;
const uid = () => `new-${++seq}`;
const mb = (n: number) => (n / 1_000_000).toFixed(1);
const fileSize = (n: number) => (n < 100_000 ? `${Math.max(1, Math.round(n / 1000))} KB` : `${mb(n)} MB`);
const norm = (s: string) => s.trim().replace(/\s+/g, ' ');
const careLines = (s: string) => s.split('\n').map((l) => l.trim()).filter(Boolean);

/** Field names in a server "Please check the form: product.name: …" message, marked on the form. */
function fromServer(msg: string): Errors {
  const e: Errors = {};
  if (!msg.startsWith('Please check the form:')) return e;
  for (const m of msg.matchAll(/product\.(\w+)/g)) if ((FIELD_ORDER as string[]).includes(m[1])) e[m[1] as Field] = 'Please check this.';
  if (msg.includes('uploads')) e.photos = 'Please check the photos.';
  return e;
}

const field =
  'min-h-12 w-full min-w-0 rounded-2xl bg-bg px-4 text-base text-fg ring-1 ring-field-line placeholder:text-fg-muted/60 focus:ring-2 focus:ring-focus aria-[invalid=true]:ring-2 aria-[invalid=true]:ring-danger md:text-sm';

export function ProductEditor({
  product,
  category: startCategory,
  products,
  previews,
  onClose,
  onSave,
  confirm,
}: {
  product?: Product;
  category: Category;
  products: Product[];
  previews: ReadonlyMap<string, string>;
  onClose: () => void;
  onSave: (p: SavePayload) => Promise<{ error: string } | null>;
  confirm: (o: ConfirmOptions) => Promise<boolean>;
}) {
  const start = product?.category ?? startCategory;
  const [category, setCategory] = useState<Category>(start);
  const [name, setName] = useState(product?.name ?? '');
  const [nameHi, setNameHi] = useState(product && product.nameHi !== product.name ? product.nameHi : '');
  const [subcategory, setSubcategory] = useState(product?.subcategory ?? '');
  const [fabric, setFabric] = useState<Product['fabric']>(product?.fabric ?? DEFAULT_FABRIC[start]);
  const [colorFamily, setColorFamily] = useState(product?.colorFamily ?? 'Red');
  const [occasion, setOccasion] = useState<Product['occasion']>(product?.occasion ?? ['festive']);
  const [price, setPrice] = useState(product ? String(product.price) : '');
  const [mrp, setMrp] = useState(product?.mrp ? String(product.mrp) : '');
  const [sizes, setSizes] = useState<string[]>(product?.sizes ?? (start === 'suit' ? DEFAULT_SIZES : []));
  const [stitched, setStitched] = useState(product?.stitched ?? start === 'suit');
  const [inStock, setInStock] = useState(product?.inStock ?? true);
  const [badges, setBadges] = useState<Badge[]>(product?.badges ?? (product ? [] : ['new']));
  const [description, setDescription] = useState(product?.description ?? '');
  const [care, setCare] = useState(product ? product.care.join('\n') : CARE[start]);
  const [photos, setPhotos] = useState<Photo[]>(() => (product?.photos ?? []).map((p) => ({ id: p, ref: p, url: previews.get(p) ?? p })));
  const [preparing, setPreparing] = useState<{ id: string; name: string }[]>([]);
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [photoNote, setPhotoNote] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [cropping, setCropping] = useState<string | null>(null);
  const [dropping, setDropping] = useState(false);
  const [closing, setClosing] = useState(false);
  const dialog = useRef<HTMLDivElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const downOnScrim = useRef(false);
  const dragFrom = useRef<number | null>(null);
  /** photos on the product plus those still being prepared: the 8-photo limit counts both */
  const held = useRef(product?.photos?.length ?? 0);

  const snapshot = JSON.stringify([category, name, nameHi, subcategory, fabric, colorFamily, occasion, price, mrp, sizes, stitched, inStock, badges, description, care, photos.map((p) => `${p.id}:${p.focus ?? ''}`)]);
  const [initial] = useState(snapshot);
  const dirty = snapshot !== initial;

  const subSuggestions = useMemo(
    () => [...new Set([...products.filter((p) => p.category === category).map((p) => p.subcategory), ...SUGGEST[category]])],
    [category, products],
  );
  const uploadBytes = photos.reduce((n, p) => n + (p.upload?.bytes ?? 0), 0);
  const cover = photos[0]?.url ?? product?.images[0];

  async function requestClose() {
    if (submitting || closing) return;
    if (dirty) {
      const discard = await confirm({
        title: 'Discard your changes?',
        body: 'What you typed and any photos you added here will be lost.',
        confirm: 'Discard changes',
        cancel: 'Keep editing',
        danger: true,
      });
      if (!discard) return;
    }
    // a short exit: the sheet sinks away, the backdrop fades (none with reduced motion)
    setClosing(true);
    window.setTimeout(onClose, prefersReducedMotion() ? 0 : 200);
  }

  // Tab stays inside, Escape asks before discarding, focus goes back to the button that opened it.
  useModal(true, dialog, () => void requestClose());
  useEffect(() => {
    dialog.current?.focus({ preventScroll: true });
  }, []);

  const clear = (k: Field) => setErrors((e) => (e[k] ? { ...e, [k]: undefined } : e));
  const toggle = <T,>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

  /** Switching category takes the other category's defaults where the form still has this one's. */
  function pickCategory(c: Category) {
    if (c === category) return;
    setCategory(c);
    if (c === 'saree') {
      setStitched(false);
      setSizes([]);
    } else {
      setStitched(true);
      setSizes((s) => (s.length ? s : DEFAULT_SIZES));
    }
    if (care.trim() === CARE[category]) setCare(CARE[c]);
    if (!product && fabric === DEFAULT_FABRIC[category]) setFabric(DEFAULT_FABRIC[c]);
    if (SUGGEST[category].includes(subcategory) && !SUGGEST[c].includes(subcategory)) setSubcategory('');
  }

  /* ───────── photos ───────── */

  async function addFiles(list: File[]) {
    setPhotoNote(null);
    clear('photos');
    const room = MAX_PHOTOS - held.current;
    if (room <= 0) return setPhotoNote(`A product can have up to ${MAX_PHOTOS} photos.`);
    const jobs = list.slice(0, room).map((file) => ({ id: uid(), name: file.name, file }));
    if (list.length > room) setPhotoNote(`Only ${room} more ${room === 1 ? 'photo fits' : 'photos fit'}: a product can have up to ${MAX_PHOTOS}.`);
    held.current += jobs.length;
    setPreparing((p) => [...p, ...jobs.map(({ id, name }) => ({ id, name }))]);
    for (const job of jobs) {
      try {
        const up = await preparePhoto(job.file);
        setPhotos((ps) => [...ps, { id: job.id, ref: 'new', url: up.url, upload: up, file: job.file, focus: 0.5 }]);
      } catch {
        held.current--;
        setPhotoNote(`Could not read “${job.name}”. Use a JPEG, PNG or WebP photo.`);
      } finally {
        setPreparing((p) => p.filter((x) => x.id !== job.id));
      }
    }
  }

  const reorder = (from: number, to: number) =>
    setPhotos((ps) => {
      if (from === to || from < 0 || to < 0 || from >= ps.length || to >= ps.length) return ps;
      const n = [...ps];
      const [moved] = n.splice(from, 1);
      n.splice(to, 0, moved);
      return n;
    });

  function removePhoto(id: string) {
    const ph = photos.find((p) => p.id === id);
    if (!ph) return;
    held.current--;
    if (ph.upload) URL.revokeObjectURL(ph.upload.url);
    setPhotos((ps) => ps.filter((p) => p.id !== id));
    setPhotoNote(null);
  }

  async function recrop(id: string, focus: number) {
    setCropping(null);
    const ph = photos.find((p) => p.id === id);
    if (!ph?.file) return;
    setPhotos((ps) => ps.map((p) => (p.id === id ? { ...p, busy: true } : p)));
    try {
      const up = await preparePhoto(ph.file, focus);
      if (ph.upload) URL.revokeObjectURL(ph.upload.url);
      setPhotos((ps) => ps.map((p) => (p.id === id ? { ...p, url: up.url, upload: up, focus, busy: false } : p)));
    } catch {
      setPhotos((ps) => ps.map((p) => (p.id === id ? { ...p, busy: false } : p)));
      setPhotoNote('Could not re-crop that photo.');
    }
  }

  /* ───────── save ───────── */

  function validate(): Errors {
    const e: Errors = {};
    const n = norm(name);
    if (!n) e.name = 'Add a name.';
    else if (n.length < 2) e.name = 'Use at least 2 letters.';
    else if (n.length > LIMIT.name) e.name = `Keep the name under ${LIMIT.name} characters.`;
    if (norm(nameHi).length > LIMIT.name) e.nameHi = `Keep the Hindi name under ${LIMIT.name} characters.`;
    const sub = norm(subcategory);
    if (!sub) e.subcategory = `Add the type, for example ${category === 'saree' ? 'Banarasi' : 'Anarkali'}.`;
    else if (sub.length > LIMIT.sub) e.subcategory = `Keep the type under ${LIMIT.sub} characters.`;
    const p = Number(price);
    if (!price) e.price = 'Add the price.';
    else if (!Number.isInteger(p) || p <= 0 || p > LIMIT.price) e.price = 'The price must be a whole number of rupees, up to 1 crore.';
    if (mrp) {
      const m = Number(mrp);
      if (!(m > p)) e.mrp = 'The MRP must be higher than the price, or left empty.';
      else if (m > LIMIT.price) e.mrp = 'The MRP can be up to 1 crore.';
    }
    if (!occasion.length) e.occasion = 'Pick at least one occasion.';
    if (!photos.length && !product?.images.length) e.photos = 'Add at least one photo.';
    else if (photos.length > MAX_PHOTOS) e.photos = `A product can have up to ${MAX_PHOTOS} photos.`;
    else if (uploadBytes > MAX_UPLOAD_BYTES) {
      e.photos = `The new photos are ${mb(uploadBytes)} MB; one save takes up to ${mb(MAX_UPLOAD_BYTES)} MB. Save with fewer new photos, then add the rest.`;
    }
    if (description.trim().length > LIMIT.description) e.description = `Keep the description under ${LIMIT.description} characters.`;
    const lines = careLines(care);
    if (lines.length > LIMIT.careLines) e.care = `Up to ${LIMIT.careLines} care lines.`;
    else if (lines.some((l) => l.length > LIMIT.careLine)) e.care = `Keep each care line under ${LIMIT.careLine} characters.`;
    return e;
  }

  async function submit() {
    if (submitting || preparing.length) return;
    setFormError(null);
    const errs = validate();
    setErrors(errs);
    const bad = FIELD_ORDER.filter((k) => errs[k]);
    if (bad.length) {
      setFormError(bad.length === 1 ? errs[bad[0]]! : `${bad.length} things need a look (marked in red).`);
      const el = document.getElementById(`ed-${bad[0]}`);
      el?.scrollIntoView({ block: 'center', behavior: 'smooth' });
      el?.focus({ preventScroll: true });
      return;
    }
    const sub = norm(subcategory);
    // one spelling per type, so "anarkali" joins "Anarkali" instead of starting a new group
    const type = subSuggestions.find((s) => s.toLowerCase() === sub.toLowerCase()) ?? sub;
    const uploads: PreparedPhoto[] = [];
    const refs = photos.map((ph) => {
      if (!ph.upload) return ph.ref;
      uploads.push(ph.upload);
      return `new:${uploads.length - 1}`;
    });
    const p = Number(price);
    const m = mrp ? Number(mrp) : undefined;
    setSubmitting(true);
    const r = await onSave({
      product: {
        ...(product ? { slug: product.slug } : {}),
        name: norm(name),
        ...(norm(nameHi) ? { nameHi: norm(nameHi) } : {}),
        category,
        subcategory: type,
        fabric,
        colorFamily,
        occasion,
        price: p,
        ...(m ? { mrp: m } : {}),
        ...(sizes.length ? { sizes } : {}),
        stitched: category === 'suit' && stitched,
        inStock,
        ...(badges.length ? { badges } : {}),
        description: description.trim(),
        care: careLines(care),
        photos: refs,
      },
      uploads,
    });
    setSubmitting(false);
    if (r) {
      const marked = fromServer(r.error);
      setErrors(marked);
      setFormError(Object.keys(marked).length ? 'Some details need a look (marked in red).' : r.error);
    }
  }

  const err = (k: Field) => ({
    'aria-invalid': Boolean(errors[k]) || undefined,
    'aria-describedby': errors[k] ? `ed-${k}-err` : undefined,
  });
  const off = discountPct(Number(price) || 0, Number(mrp) || undefined);
  const title = product ? 'Edit product' : category === 'saree' ? 'Add a saree' : 'Add a suit';
  const croppingPhoto = photos.find((p) => p.id === cropping);

  // in <body>, above everything on the page
  return createPortal(
    <div
      data-admin
      data-lenis-prevent
      data-closing={closing || undefined}
      className="adm-backdrop fixed inset-0 z-[200] sm:grid sm:place-items-center sm:p-4"
      onPointerDown={(e) => (downOnScrim.current = e.target === e.currentTarget)}
      onClick={(e) => {
        if (downOnScrim.current && e.target === e.currentTarget) void requestClose();
        downOnScrim.current = false;
      }}
    >
      <div
        ref={dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="editor-title"
        tabIndex={-1}
        onKeyDown={(e) => {
          if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
            e.preventDefault();
            void submit();
          }
        }}
        data-closing={closing || undefined}
        className="adm-sheet flex h-full w-full flex-col bg-bg outline-none sm:h-auto sm:shadow-[0_40px_120px_-30px_var(--shadow)] sm:max-h-[calc(100svh-2rem)] sm:w-[min(760px,100%)] sm:rounded-3xl sm:ring-1 sm:ring-divider lg:w-[min(1120px,100%)]"
      >
        <header className="flex flex-none items-center gap-3 border-b border-divider py-2 pl-4 pr-2 pt-[calc(env(safe-area-inset-top,0px)+0.5rem)] sm:pl-6 sm:pr-3 sm:pt-2">
          <h2 id="editor-title" className="min-w-0 truncate font-editorial text-2xl font-medium text-fg sm:text-3xl">{title}</h2>
          <div className="ml-auto flex shrink-0 items-center gap-1">
            {product && (
              <a href={`/product/${product.slug}`} target="_blank" rel="noopener" className="hidden min-h-11 items-center px-3 text-sm text-fg-muted underline underline-offset-4 hover:text-fg sm:inline-flex">
                View on site ↗
              </a>
            )}
            <button type="button" aria-label="Close" onClick={() => void requestClose()} disabled={submitting} className="grid size-11 place-items-center rounded-full text-fg hover:bg-surface-2 disabled:opacity-50">
              <IconClose />
            </button>
          </div>
        </header>

        <form
          id="product-form"
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain"
        >
          <div className="grid gap-8 p-4 sm:p-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-10">
            {/* left: photos, and the preview on wide screens */}
            <div className="grid content-start gap-8">
              <section aria-labelledby="ed-photos-h" className="grid content-start gap-3">
                <div className="flex items-baseline justify-between gap-3">
                  <h3 id="ed-photos-h" className="label text-gold-text">Photos</h3>
                  <span className="text-xs tabular-nums text-fg-muted">
                    {photos.length + preparing.length} / {MAX_PHOTOS}
                  </span>
                </div>
                <div
                  id="ed-photos"
                  tabIndex={-1}
                  onDragOver={(e) => {
                    if (!e.dataTransfer.types.includes('Files')) return;
                    e.preventDefault();
                    setDropping(true);
                  }}
                  onDragLeave={(e) => {
                    if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setDropping(false);
                  }}
                  onDrop={(e) => {
                    if (!e.dataTransfer.files.length) return;
                    e.preventDefault();
                    setDropping(false);
                    void addFiles([...e.dataTransfer.files].filter((f) => f.type.startsWith('image/')));
                  }}
                  className={`rounded-2xl outline-none transition-shadow ${dropping ? 'ring-2 ring-focus ring-offset-4 ring-offset-bg' : ''} ${errors.photos ? 'ring-2 ring-danger ring-offset-4 ring-offset-bg' : ''}`}
                >
                  <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-3">
                    {photos.map((ph, i) => (
                      <PhotoTile
                        key={ph.id}
                        photo={ph}
                        index={i}
                        last={i === photos.length - 1}
                        onMove={(d) => reorder(i, i + d)}
                        onCover={() => reorder(i, 0)}
                        onRemove={() => removePhoto(ph.id)}
                        onCrop={() => setCropping(ph.id)}
                        onDragStart={() => (dragFrom.current = i)}
                        onDropHere={() => {
                          if (dragFrom.current !== null) reorder(dragFrom.current, i);
                          dragFrom.current = null;
                        }}
                      />
                    ))}
                    {preparing.map((j) => (
                      <li key={j.id} className="grid aspect-[4/5] place-items-center rounded-xl bg-surface-2 ring-1 ring-divider">
                        <span className="grid justify-items-center gap-2 p-2 text-center text-xs text-fg-muted">
                          <Spinner />
                          Preparing…
                        </span>
                      </li>
                    ))}
                    {photos.length + preparing.length < MAX_PHOTOS && (
                      <li>
                        <button
                          type="button"
                          onClick={() => fileInput.current?.click()}
                          className="grid aspect-[4/5] w-full place-items-center rounded-xl border-2 border-dashed border-field-line p-2 text-center text-sm text-fg-muted transition-colors hover:border-focus hover:text-fg"
                        >
                          <span>
                            <span aria-hidden className="block text-2xl leading-none">+</span>
                            Add photos
                            <span className="mt-1 hidden text-xs [@media(pointer:fine)]:block">or drop them here</span>
                          </span>
                        </button>
                      </li>
                    )}
                  </ul>
                </div>
                <input
                  ref={fileInput}
                  type="file"
                  accept="image/*"
                  multiple
                  className="sr-only"
                  tabIndex={-1}
                  onChange={(e) => {
                    const files = [...(e.target.files ?? [])];
                    e.target.value = '';
                    void addFiles(files);
                  }}
                />
                {!photos.length && product?.images.length ? (
                  <div className="grid gap-2 rounded-2xl bg-surface p-3 ring-1 ring-divider">
                    <p className="text-xs text-fg-muted">The site shows this drawn sample artwork for now. Add real photos to replace it.</p>
                    <div className="flex gap-2">
                      {product.images.slice(0, 4).map((src) => (
                        <AdminImage key={src} src={src} className="aspect-[4/5] w-14 rounded-lg object-cover ring-1 ring-divider" />
                      ))}
                    </div>
                  </div>
                ) : null}
                <p className="text-xs text-fg-muted">
                  4:5 portrait, daylight, plain wall. The first photo is the cover<span className="hidden [@media(pointer:fine)]:inline">; drag photos to reorder them</span>.
                </p>
                {uploadBytes > 0 && (
                  <p className={`text-xs tabular-nums ${uploadBytes > MAX_UPLOAD_BYTES ? 'text-danger' : 'text-fg-muted'}`}>
                    New photos: {fileSize(uploadBytes)} of {mb(MAX_UPLOAD_BYTES)} MB per save
                  </p>
                )}
                {(errors.photos || photoNote) && (
                  <p id="ed-photos-err" className="text-sm text-danger">
                    {errors.photos ?? photoNote}
                  </p>
                )}
              </section>

              <Preview className="hidden lg:grid" cover={cover} name={name} sub={subcategory} fabric={fabric} price={price} mrp={mrp} badges={badges} inStock={inStock} />
            </div>

            {/* right: the details */}
            <div className="grid content-start gap-8">
              <section aria-labelledby="ed-basics-h" className="grid gap-4">
                <h3 id="ed-basics-h" className="label text-gold-text">Basics</h3>
                <div role="radiogroup" aria-label="Category" className="flex gap-2">
                  {(['saree', 'suit'] as const).map((c) => (
                    <button key={c} type="button" role="radio" aria-checked={category === c} className="chip" onClick={() => pickCategory(c)}>
                      {c === 'saree' ? 'Saree' : 'Suit'}
                    </button>
                  ))}
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Labeled id="ed-name" label="Name" error={errors.name}>
                    <input
                      id="ed-name"
                      value={name}
                      onChange={(e) => (setName(e.target.value), clear('name'))}
                      className={field}
                      placeholder={category === 'saree' ? 'e.g. Gulabi Banarasi Silk Saree' : 'e.g. Mehendi Cotton Anarkali Suit'}
                      autoComplete="off"
                      {...err('name')}
                    />
                  </Labeled>
                  <Labeled id="ed-nameHi" label="Name in Hindi (optional)" error={errors.nameHi} hint="Empty: the English name is used.">
                    <input
                      id="ed-nameHi"
                      lang="hi"
                      value={nameHi}
                      onChange={(e) => (setNameHi(e.target.value), clear('nameHi'))}
                      className={field}
                      placeholder="जैसे गुलाबी बनारसी सिल्क साड़ी"
                      autoComplete="off"
                      {...err('nameHi')}
                    />
                  </Labeled>
                </div>
                <Labeled id="ed-subcategory" label="Type" error={errors.subcategory}>
                  <input
                    id="ed-subcategory"
                    list="admin-sub"
                    value={subcategory}
                    onChange={(e) => (setSubcategory(e.target.value), clear('subcategory'))}
                    className={field}
                    placeholder={category === 'saree' ? 'e.g. Banarasi' : 'e.g. Anarkali'}
                    autoComplete="off"
                    {...err('subcategory')}
                  />
                  <datalist id="admin-sub">
                    {subSuggestions.map((s) => (
                      <option key={s} value={s} />
                    ))}
                  </datalist>
                  <div className="flex flex-wrap gap-1.5" aria-label="Pick a type">
                    {subSuggestions.slice(0, 10).map((s) => (
                      <button
                        key={s}
                        type="button"
                        className="chip !min-h-9 !px-3 !text-xs"
                        aria-pressed={norm(subcategory).toLowerCase() === s.toLowerCase()}
                        onClick={() => (setSubcategory(s), clear('subcategory'))}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </Labeled>
                <Labeled id="ed-fabric" label="Fabric">
                  <select id="ed-fabric" value={fabric} onChange={(e) => setFabric(e.target.value as Product['fabric'])} className={field}>
                    {FABRICS.map((f) => (
                      <option key={f} value={f}>
                        {f}
                      </option>
                    ))}
                  </select>
                </Labeled>
              </section>

              <section aria-labelledby="ed-price-h" className="grid gap-4">
                <h3 id="ed-price-h" className="label text-gold-text">Price</h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Labeled id="ed-price" label="Price (₹)" error={errors.price}>
                    <input
                      id="ed-price"
                      value={price}
                      onChange={(e) => (setPrice(e.target.value.replace(/\D/g, '')), clear('price'))}
                      inputMode="numeric"
                      className={`${field} tabular-nums`}
                      placeholder="e.g. 4999"
                      autoComplete="off"
                      {...err('price')}
                    />
                  </Labeled>
                  <Labeled
                    id="ed-mrp"
                    label="MRP before discount (₹, optional)"
                    error={errors.mrp}
                    hint={off > 0 ? `Shows as ${off}% off on the site.` : 'Higher than the price, to show a discount.'}
                  >
                    <input
                      id="ed-mrp"
                      value={mrp}
                      onChange={(e) => (setMrp(e.target.value.replace(/\D/g, '')), clear('mrp'))}
                      inputMode="numeric"
                      className={`${field} tabular-nums`}
                      placeholder="e.g. 5999"
                      autoComplete="off"
                      {...err('mrp')}
                    />
                  </Labeled>
                </div>
              </section>

              <section aria-labelledby="ed-look-h" className="grid gap-4">
                <h3 id="ed-look-h" className="label text-gold-text">Colour and occasion</h3>
                <div role="radiogroup" aria-label="Colour" className="flex flex-wrap gap-2">
                  {Object.entries(COLOR_FAMILIES).map(([c, v]) => (
                    <button key={c} type="button" role="radio" aria-checked={colorFamily === c} className="chip" onClick={() => setColorFamily(c)}>
                      <span aria-hidden className="size-4 rounded-full ring-1 ring-field-line" style={{ background: v.hex }} />
                      {c}
                    </button>
                  ))}
                </div>
                <fieldset id="ed-occasion" tabIndex={-1} className="grid gap-2 outline-none" aria-describedby={errors.occasion ? 'ed-occasion-err' : undefined}>
                  <legend className="mb-2 text-sm text-fg-muted">Occasion (one or more)</legend>
                  <div className="flex flex-wrap gap-2">
                    {OCCASIONS.map((o) => (
                      <button
                        key={o}
                        type="button"
                        className="chip"
                        aria-pressed={occasion.includes(o)}
                        onClick={() => (setOccasion((l) => toggle(l, o)), clear('occasion'))}
                      >
                        {OCCASION_LABEL[o].en}
                      </button>
                    ))}
                  </div>
                  {errors.occasion && (
                    <p id="ed-occasion-err" className="text-sm text-danger">
                      {errors.occasion}
                    </p>
                  )}
                </fieldset>
              </section>

              {(category === 'suit' || sizes.length > 0) && (
                <section aria-labelledby="ed-sizes-h" className="grid gap-3">
                  <h3 id="ed-sizes-h" className="label text-gold-text">Sizes</h3>
                  <div className="flex flex-wrap gap-2">
                    {SIZES.map((s) => (
                      <button key={s} type="button" className="chip" aria-pressed={sizes.includes(s)} onClick={() => setSizes((l) => toggle(l, s))}>
                        {s}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-fg-muted">Leave all off for free size or unstitched.</p>
                </section>
              )}

              <section aria-labelledby="ed-vis-h" className="grid gap-3">
                <h3 id="ed-vis-h" className="label text-gold-text">Availability and badges</h3>
                <div className="flex flex-wrap gap-x-6 gap-y-1">
                  <Switch checked={inStock} onChange={setInStock} label="In stock" on="In stock" off="Out of stock" />
                  {category === 'suit' && <Switch checked={stitched} onChange={setStitched} label="Stitched" on="Stitched" off="Unstitched" />}
                </div>
                <div className="grid gap-2">
                  <p className="text-sm text-fg-muted">Badges on the product card</p>
                  <div className="flex flex-wrap gap-2">
                    {BADGES.map((b) => (
                      <button key={b} type="button" className="chip" aria-pressed={badges.includes(b)} onClick={() => setBadges((l) => toggle(l, b))}>
                        {BADGE_LABEL[b]}
                      </button>
                    ))}
                  </div>
                </div>
              </section>

              <section aria-labelledby="ed-text-h" className="grid gap-4">
                <h3 id="ed-text-h" className="label text-gold-text">Description and care</h3>
                <Labeled
                  id="ed-description"
                  label="Description"
                  error={errors.description}
                  count={
                    <span className={`text-xs tabular-nums ${description.trim().length > LIMIT.description ? 'text-danger' : ''}`}>
                      {description.trim().length} / {LIMIT.description}
                    </span>
                  }
                >
                  <textarea
                    id="ed-description"
                    value={description}
                    onChange={(e) => (setDescription(e.target.value), clear('description'))}
                    rows={4}
                    className={`${field} py-3`}
                    placeholder="Fabric, work, what it pairs with…"
                    {...err('description')}
                  />
                </Labeled>
                <Labeled id="ed-care" label="Care (one per line)" error={errors.care}>
                  <textarea id="ed-care" value={care} onChange={(e) => (setCare(e.target.value), clear('care'))} rows={3} className={`${field} py-3`} {...err('care')} />
                </Labeled>
              </section>

              <Preview className="grid lg:hidden" cover={cover} name={name} sub={subcategory} fabric={fabric} price={price} mrp={mrp} badges={badges} inStock={inStock} />
            </div>
          </div>
        </form>

        {/* always on screen: the save button, and what is stopping a save */}
        <footer className="flex flex-none items-center gap-3 border-t border-divider px-4 py-3 pb-[calc(var(--safe-b)+0.75rem)] sm:px-6 sm:pb-3">
          <div className="min-w-0 flex-1 text-sm" aria-live="polite">
            {formError ? (
              <p role="alert" className="text-danger">
                {formError}
              </p>
            ) : preparing.length ? (
              <p className="text-fg-muted">Preparing photos…</p>
            ) : dirty ? (
              <p className="flex items-center gap-2 text-fg-muted">
                <span aria-hidden className="size-2 shrink-0 rounded-full bg-gold-line" />
                Unsaved changes
                <span className="hidden text-xs lg:inline">· Ctrl/⌘ S saves</span>
              </p>
            ) : product ? (
              <p className="text-fg-muted">No changes yet</p>
            ) : null}
          </div>
          <button type="submit" form="product-form" className="btn btn-gold shrink-0" disabled={submitting || preparing.length > 0}>
            {submitting ? (
              <>
                <Spinner />
                Saving…
              </>
            ) : product ? (
              'Save changes'
            ) : (
              'Add to the site'
            )}
          </button>
        </footer>
      </div>

      {croppingPhoto?.file && croppingPhoto.upload && (
        <CropDialog key={croppingPhoto.id} photo={croppingPhoto} onApply={(focus) => void recrop(croppingPhoto.id, focus)} onCancel={() => setCropping(null)} />
      )}
    </div>,
    document.body,
  );
}

/* ───────────────────────── pieces ───────────────────────── */

function Labeled({
  id,
  label,
  hint,
  error,
  count,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  count?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="grid content-start gap-2">
      <label htmlFor={id} className="flex items-baseline justify-between gap-2 text-sm text-fg-muted">
        <span>{label}</span>
        {count}
      </label>
      {children}
      {error ? (
        <p id={`${id}-err`} className="text-sm text-danger">
          {error}
        </p>
      ) : hint ? (
        <p className="text-xs text-fg-muted">{hint}</p>
      ) : null}
    </div>
  );
}

function PhotoTile({
  photo,
  index,
  last,
  onMove,
  onCover,
  onRemove,
  onCrop,
  onDragStart,
  onDropHere,
}: {
  photo: Photo;
  index: number;
  last: boolean;
  onMove: (d: -1 | 1) => void;
  onCover: () => void;
  onRemove: () => void;
  onCrop: () => void;
  onDragStart: () => void;
  onDropHere: () => void;
}) {
  const n = index + 1;
  const canCrop = Boolean(photo.file && photo.upload && needsCrop(photo.upload.source.width, photo.upload.source.height));
  return (
    <li
      draggable
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/x-admin-photo', String(index));
        onDragStart();
      }}
      onDragOver={(e) => {
        if (e.dataTransfer.types.includes('text/x-admin-photo')) e.preventDefault();
      }}
      onDrop={(e) => {
        if (!e.dataTransfer.types.includes('text/x-admin-photo')) return;
        e.preventDefault();
        e.stopPropagation();
        onDropHere();
      }}
      className="adm-rise grid min-w-0 gap-1.5 [@media(pointer:fine)]:cursor-grab"
    >
      <div className="relative">
        <AdminImage
          key={photo.url}
          src={photo.url}
          width={256}
          alt={`Photo ${n}`}
          className="pointer-events-none aspect-[4/5] w-full rounded-xl object-cover ring-1 ring-divider"
          fallback="Shows after the site update"
        />
        {index === 0 && <span className="absolute left-1.5 top-1.5 rounded-full bg-cta-bg px-2 py-0.5 text-[0.7rem] font-medium text-cta-text">Cover</span>}
        {photo.busy && (
          <span className="absolute inset-0 grid place-items-center rounded-xl bg-bg/70">
            <Spinner />
          </span>
        )}
      </div>
      <div className="flex justify-between gap-1">
        <button type="button" className="chip !min-h-9 !px-2.5" aria-label={`Move photo ${n} earlier`} onClick={() => onMove(-1)} disabled={index === 0}>
          ←
        </button>
        <Menu
          label={`Photo ${n} options`}
          className="chip !min-h-9 !px-2.5"
          items={[
            ...(index > 0 ? [{ label: 'Make it the cover', onSelect: onCover }] : []),
            ...(canCrop ? [{ label: 'Adjust the crop…', onSelect: onCrop }] : []),
            ...(index > 0 || canCrop ? (['divider'] as const) : []),
            { label: 'Remove photo', danger: true, onSelect: onRemove },
          ]}
        >
          <span aria-hidden>⋯</span>
        </Menu>
        <button type="button" className="chip !min-h-9 !px-2.5" aria-label={`Move photo ${n} later`} onClick={() => onMove(1)} disabled={last}>
          →
        </button>
      </div>
    </li>
  );
}

/** Slide to pick which part of a landscape (or very tall) photo the 4:5 crop keeps. */
function CropDialog({ photo, onApply, onCancel }: { photo: Photo; onApply: (focus: number) => void; onCancel: () => void }) {
  const [focus, setFocus] = useState(photo.focus ?? 0.5);
  // released when the dialog closes (not in an effect cleanup: Strict Mode runs those early)
  const [src] = useState(() => URL.createObjectURL(photo.file!));
  const done = (apply: boolean) => {
    URL.revokeObjectURL(src);
    if (apply) onApply(focus);
    else onCancel();
  };
  const { width: w, height: h } = photo.upload!.source;
  const wide = w / h > RATIO;
  /** the share of the long side the crop keeps */
  const keep = wide ? (h * RATIO) / w : w / RATIO / h;
  const at = `${(1 - keep) * focus * 100}%`;
  const size = `${keep * 100}%`;
  return (
    <Modal onClose={() => done(false)} labelledBy="crop-title" z="z-[220]" className="sm:max-w-xl">
      <div className="grid gap-4">
        <h2 id="crop-title" className="font-editorial text-2xl font-medium text-fg">Adjust the crop</h2>
        <p className="text-sm text-fg-muted">The site shows photos at 4:5. Slide to choose the part that stays.</p>
        <div className="relative mx-auto max-w-full overflow-hidden rounded-xl" style={{ aspectRatio: `${w} / ${h}`, ...(wide ? { width: '100%' } : { height: '50svh' }) }}>
          {/* eslint-disable-next-line @next/next/no-img-element -- the original photo, before it is cropped */}
          <img src={src} alt="" className="absolute inset-0 size-full object-cover" />
          <div
            aria-hidden
            className="absolute rounded-md shadow-[0_0_0_9999px_rgb(0_0_0/0.55)] ring-2 ring-white"
            style={wide ? { top: 0, bottom: 0, left: at, width: size } : { left: 0, right: 0, top: at, height: size }}
          />
        </div>
        <label className="grid gap-2 text-sm text-fg-muted">
          {wide ? 'Left ↔ right' : 'Top ↕ bottom'}
          <input
            data-autofocus
            type="range"
            min={0}
            max={100}
            value={Math.round(focus * 100)}
            onChange={(e) => setFocus(Number(e.target.value) / 100)}
            className="min-h-11 accent-[var(--gold-text)]"
          />
        </label>
        <div className="flex justify-end gap-2">
          <button type="button" className="btn btn-ghost" onClick={() => done(false)}>
            Cancel
          </button>
          <button type="button" className="btn btn-gold" onClick={() => done(true)}>
            Use this crop
          </button>
        </div>
      </div>
    </Modal>
  );
}

/** Roughly how the product card will look in the shop. */
function Preview({
  cover,
  name,
  sub,
  fabric,
  price,
  mrp,
  badges,
  inStock,
  className = '',
}: {
  cover?: string;
  name: string;
  sub: string;
  fabric: string;
  price: string;
  mrp: string;
  badges: Badge[];
  inStock: boolean;
  className?: string;
}) {
  const p = Number(price) || 0;
  const m = Number(mrp) || undefined;
  const off = discountPct(p, m);
  return (
    <figure className={`content-start gap-3 ${className}`}>
      <figcaption className="label text-gold-text">Preview in the shop</figcaption>
      <div className="w-full max-w-[15rem] rounded-2xl bg-surface p-2 ring-1 ring-divider">
        <div className="relative overflow-hidden rounded-xl">
          <AdminImage key={cover} src={cover} width={384} className="aspect-[4/5] w-full object-cover" fallback="No photo yet" />
          {badges.length > 0 && (
            <div className="absolute left-2 top-2 flex flex-wrap gap-1">
              {badges.map((b) => (
                <span key={b} className="rounded-full bg-badge-bg px-2 py-0.5 text-[0.7rem] text-badge-text">
                  {BADGE_LABEL[b]}
                </span>
              ))}
            </div>
          )}
          {!inStock && <span className="absolute inset-x-2 bottom-2 rounded-full bg-cta-bg py-1 text-center text-xs text-cta-text">Out of stock</span>}
        </div>
        <div className="px-1 pb-1 pt-2">
          <p className="truncate font-medium text-fg">{norm(name) || 'Product name'}</p>
          <p className="truncate text-xs text-fg-muted">{[norm(sub), fabric].filter(Boolean).join(' · ')}</p>
          <p className="mt-1 flex flex-wrap items-baseline gap-x-2 text-sm tabular-nums">
            <span className="font-medium text-fg">{p ? formatINR(p) : '₹ —'}</span>
            {off > 0 && (
              <>
                <s className="text-xs text-fg-muted">{formatINR(m!)}</s>
                <span className="text-xs font-medium text-sale">{off}% off</span>
              </>
            )}
          </p>
        </div>
      </div>
    </figure>
  );
}
