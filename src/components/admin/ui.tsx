'use client';
/**
 * The admin panel's building blocks: dialogs (focus kept inside, Escape, focus handed back),
 * a confirm dialog, menus, switches, checkboxes, toasts and images that survive a missing file.
 * Every overlay carries data-admin (admin styles) and data-lenis-prevent (native scrolling,
 * never the storefront's smooth scroll).
 */
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useModal } from '@/lib/modal';
import { IconClose } from '@/components/icons';

export function Spinner({ className = '' }: { className?: string }) {
  return <span aria-hidden className={`inline-block size-4 shrink-0 animate-spin rounded-full border-2 border-current border-r-transparent ${className}`} />;
}

/* ───────────────────────── dialogs ───────────────────────── */

/**
 * A modal in <body>. Clicks on the scrim close it (a press that starts inside and ends on the
 * scrim does not). The dialog itself takes focus on open, or the element marked data-autofocus.
 */
export function Modal({
  onClose,
  label,
  labelledBy,
  sheet = false,
  z = 'z-[220]',
  className = '',
  children,
}: {
  onClose: () => void;
  label?: string;
  labelledBy?: string;
  /** a bottom sheet on phones, a centred card from sm up */
  sheet?: boolean;
  z?: string;
  className?: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const downOnScrim = useRef(false);
  useModal(true, ref, onClose);
  useEffect(() => {
    const el = ref.current;
    (el?.querySelector<HTMLElement>('[data-autofocus]') ?? el)?.focus({ preventScroll: true });
  }, []);

  return createPortal(
    <div
      data-admin
      data-lenis-prevent
      className={`fixed inset-0 ${z} grid bg-scrim ${sheet ? 'items-end sm:place-items-center sm:p-4' : 'place-items-center p-4'}`}
      onPointerDown={(e) => (downOnScrim.current = e.target === e.currentTarget)}
      onClick={(e) => {
        if (downOnScrim.current && e.target === e.currentTarget) onClose();
        downOnScrim.current = false;
      }}
    >
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        aria-labelledby={labelledBy}
        tabIndex={-1}
        className={`max-h-[calc(100svh-2rem)] w-full overflow-y-auto overscroll-contain bg-bg p-5 outline-none ring-1 ring-divider sm:p-6 ${
          sheet ? 'rounded-t-3xl pb-[calc(var(--safe-b)+1.25rem)] sm:max-w-lg sm:rounded-3xl' : 'max-w-md rounded-3xl'
        } ${className}`}
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}

export type ConfirmItem = { key: string; name: string; thumb?: string };
export type ConfirmOptions = {
  title: string;
  body?: ReactNode;
  confirm: string;
  cancel?: string;
  danger?: boolean;
  /** products the action touches: the first few are shown with their photo */
  items?: ConfirmItem[];
  /** for big, irreversible actions: the word to type before the button unlocks */
  typeToConfirm?: string;
};

export function ConfirmDialog({ options, onDone }: { options: ConfirmOptions; onDone: (ok: boolean) => void }) {
  const [typed, setTyped] = useState('');
  const locked = Boolean(options.typeToConfirm) && typed.trim().toUpperCase() !== options.typeToConfirm;
  const shown = options.items?.slice(0, 5) ?? [];
  const more = (options.items?.length ?? 0) - shown.length;
  return (
    <Modal onClose={() => onDone(false)} labelledBy="confirm-title" z="z-[220]">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!locked) onDone(true);
        }}
        className="grid gap-4"
      >
        <h2 id="confirm-title" className="font-editorial text-2xl font-medium text-fg">{options.title}</h2>
        {options.body && <div className="text-sm text-fg-muted">{options.body}</div>}
        {shown.length > 0 && (
          <ul className="grid gap-2 rounded-2xl bg-surface p-2 ring-1 ring-divider">
            {shown.map((it) => (
              <li key={it.key} className="flex min-w-0 items-center gap-3">
                <AdminImage key={it.thumb} src={it.thumb} className="aspect-[4/5] w-9 shrink-0 rounded-md object-cover ring-1 ring-divider" />
                <span className="truncate text-sm text-fg">{it.name}</span>
              </li>
            ))}
            {more > 0 && <li className="px-1 text-xs text-fg-muted">and {more.toLocaleString('en-IN')} more</li>}
          </ul>
        )}
        {options.typeToConfirm && (
          <label className="grid gap-2 text-sm text-fg-muted">
            <span>
              Type <strong className="font-semibold text-fg">{options.typeToConfirm}</strong> to confirm
            </span>
            <input
              data-autofocus
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              className="min-h-12 rounded-2xl bg-bg px-4 text-base text-fg ring-1 ring-field-line focus:ring-focus"
            />
          </label>
        )}
        <div className="mt-1 flex flex-wrap justify-end gap-2">
          <button type="button" className="btn btn-ghost" onClick={() => onDone(false)} data-autofocus={options.typeToConfirm ? undefined : true}>
            {options.cancel ?? 'Cancel'}
          </button>
          <button type="submit" disabled={locked} className={`btn ${options.danger ? 'bg-badge-bg text-badge-text' : 'btn-gold'}`}>
            {options.confirm}
          </button>
        </div>
      </form>
    </Modal>
  );
}

/* ───────────────────────── menu ───────────────────────── */

export type MenuItem =
  | { label: string; onSelect: () => void; danger?: boolean; disabled?: boolean }
  | { label: string; href: string; external?: boolean }
  | 'divider';

/**
 * A button that opens a small menu. The menu is portalled (so a list's rounded clip never cuts
 * it) into the dialog it sits in, or <body>; it flips above the button near the bottom edge.
 */
export function Menu({
  label,
  children,
  items,
  className = '',
  disabled,
}: {
  label: string;
  children: ReactNode;
  items: MenuItem[];
  className?: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top?: number; bottom?: number; right: number } | null>(null);
  const btn = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const [host, setHost] = useState<HTMLElement | null>(null);

  const close = (refocus = true) => {
    setOpen(false);
    setPos(null);
    if (refocus) btn.current?.focus({ preventScroll: true });
  };

  useLayoutEffect(() => {
    if (!open || !btn.current || !menu.current) return;
    const r = btn.current.getBoundingClientRect();
    const h = menu.current.offsetHeight;
    const right = Math.max(8, window.innerWidth - r.right);
    // measured placement, before paint
    setPos(r.bottom + 6 + h > window.innerHeight - 8 ? { bottom: window.innerHeight - r.top + 6, right } : { top: r.bottom + 6, right });
  }, [open]);

  // once placed (and visible), the first item takes focus
  const placed = pos !== null;
  useEffect(() => {
    if (placed) menu.current?.querySelector<HTMLElement>('[role=menuitem]:not([aria-disabled=true])')?.focus({ preventScroll: true });
  }, [placed]);

  useEffect(() => {
    if (!open) return;
    const shut = (refocus: boolean) => {
      setOpen(false);
      setPos(null);
      if (refocus) btn.current?.focus({ preventScroll: true });
    };
    const outside = (e: PointerEvent) => {
      const t = e.target as Node;
      if (!menu.current?.contains(t) && !btn.current?.contains(t)) shut(false);
    };
    const away = () => shut(false);
    // Escape is handled here and stopped, so it never also closes the dialog around the menu.
    const onKey = (e: KeyboardEvent) => {
      const list = [...(menu.current?.querySelectorAll<HTMLElement>('[role=menuitem]:not([aria-disabled=true])') ?? [])];
      const i = list.indexOf(document.activeElement as HTMLElement);
      if (e.key === 'Escape') {
        e.stopPropagation();
        e.preventDefault();
        shut(true);
      } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        list[(i + (e.key === 'ArrowDown' ? 1 : -1) + list.length) % list.length]?.focus();
      } else if (e.key === 'Tab') {
        shut(false);
      }
    };
    document.addEventListener('pointerdown', outside, true);
    window.addEventListener('resize', away);
    window.addEventListener('scroll', away, true);
    // capture: runs before (and stops) the dialog's own Escape handler
    document.addEventListener('keydown', onKey, true);
    return () => {
      document.removeEventListener('pointerdown', outside, true);
      window.removeEventListener('resize', away);
      window.removeEventListener('scroll', away, true);
      document.removeEventListener('keydown', onKey, true);
    };
  }, [open]);

  return (
    <>
      <button
        ref={btn}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={label}
        disabled={disabled}
        className={className}
        onClick={() => {
          if (open) return close(false);
          setHost(btn.current?.closest<HTMLElement>('[role="dialog"]') ?? document.body);
          setOpen(true);
        }}
      >
        {children}
      </button>
      {open &&
        host &&
        createPortal(
          <div
            ref={menu}
            role="menu"
            aria-label={label}
            data-admin
            data-lenis-prevent
            style={{ top: pos?.top, bottom: pos?.bottom, right: pos?.right ?? 8, visibility: pos ? 'visible' : 'hidden' }}
            className="fixed z-[240] grid min-w-48 max-w-[calc(100vw-1rem)] gap-0.5 rounded-2xl bg-bg p-1.5 text-sm shadow-[0_20px_50px_-20px_var(--shadow)] ring-1 ring-divider"
          >
            {items.map((it, i) =>
              it === 'divider' ? (
                <hr key={`d${i}`} className="my-1 border-divider" />
              ) : 'href' in it ? (
                <a
                  key={it.label}
                  role="menuitem"
                  href={it.href}
                  target={it.external ? '_blank' : undefined}
                  rel={it.external ? 'noopener' : undefined}
                  onClick={() => close(false)}
                  className="flex min-h-11 items-center justify-between gap-4 rounded-xl px-3 text-fg outline-none hover:bg-surface-2 focus-visible:bg-surface-2"
                >
                  {it.label}
                  {it.external && <span aria-hidden className="text-fg-muted">↗</span>}
                </a>
              ) : (
                <button
                  key={it.label}
                  type="button"
                  role="menuitem"
                  aria-disabled={it.disabled || undefined}
                  onClick={() => {
                    if (it.disabled) return;
                    close();
                    it.onSelect();
                  }}
                  className={`flex min-h-11 items-center rounded-xl px-3 text-left outline-none hover:bg-surface-2 focus-visible:bg-surface-2 aria-disabled:opacity-50 ${it.danger ? 'text-danger' : 'text-fg'}`}
                >
                  {it.label}
                </button>
              ),
            )}
          </div>,
          host,
        )}
    </>
  );
}

/* ───────────────────────── controls ───────────────────────── */

/** On/off switch: green when on, a red label when off. `label` is the fixed accessible name. */
export function Switch({
  checked,
  onChange,
  label,
  on,
  off,
  busy,
  disabled,
  className = '',
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  on: string;
  off: string;
  busy?: boolean;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      aria-busy={busy || undefined}
      disabled={disabled || busy}
      onClick={() => onChange(!checked)}
      className={`inline-flex min-h-11 items-center gap-2.5 rounded-full text-sm disabled:cursor-not-allowed ${className}`}
    >
      <span aria-hidden className={`relative h-6 w-10 shrink-0 rounded-full transition-colors ${checked ? 'bg-ok' : 'bg-field-line'} ${busy ? 'opacity-70' : ''}`}>
        <span className={`absolute left-0.5 top-0.5 grid size-5 place-items-center rounded-full bg-bg shadow transition-transform ${checked ? 'translate-x-4' : ''}`}>
          {busy && <Spinner className="!size-3 !border-[1.5px] text-fg-muted" />}
        </span>
      </span>
      <span className={`font-medium ${checked ? 'text-ok' : 'text-danger'}`}>{checked ? on : off}</span>
    </button>
  );
}

/** A checkbox that can also show "some selected". */
export function Checkbox({
  checked,
  indeterminate,
  onChange,
  label,
}: {
  checked: boolean;
  indeterminate?: boolean;
  onChange: (on: boolean) => void;
  label: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = Boolean(indeterminate) && !checked;
  }, [indeterminate, checked]);
  return (
    <input
      ref={ref}
      type="checkbox"
      aria-label={label}
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
      className="size-5 shrink-0 cursor-pointer accent-[var(--gold-text)]"
    />
  );
}

/* ───────────────────────── images ───────────────────────── */

/**
 * A catalogue image through the optimiser (a 1600 × 2000 photo would be ~300 KB). A photo saved
 * minutes ago is not on the live site until it has been rebuilt: then the fallback shows.
 * Give it key={src} so a new src gets a fresh try.
 */
export function AdminImage({
  src,
  width = 96,
  alt = '',
  className = '',
  fallback,
}: {
  src?: string;
  width?: 96 | 256 | 384;
  alt?: string;
  className?: string;
  fallback?: ReactNode;
}) {
  const [broken, setBroken] = useState(false);
  if (!src || broken) {
    return (
      <span aria-hidden={!fallback || undefined} className={`grid place-items-center bg-surface-2 p-1 text-center text-[0.7rem] leading-tight text-fg-muted ${className}`}>
        {fallback}
      </span>
    );
  }
  const url = src.startsWith('/') ? `/_next/image?url=${encodeURIComponent(src)}&w=${width}&q=${width > 96 ? 75 : 70}` : src;
  // eslint-disable-next-line @next/next/no-img-element -- admin thumbnails, incl. local previews of unsaved photos
  return <img src={url} alt={alt} loading="lazy" decoding="async" className={className} onError={() => setBroken(true)} />;
}

/* ───────────────────────── toasts ───────────────────────── */

export type Toast = { id: number; tone: 'ok' | 'error' | 'info'; text: string; action?: { label: string; run: () => void } };

export function Toasts({ toasts, onDismiss, raised }: { toasts: Toast[]; onDismiss: (id: number) => void; raised: boolean }) {
  return (
    <div
      data-admin
      aria-live="polite"
      className={`pointer-events-none fixed inset-x-0 z-[230] flex flex-col items-center gap-2 px-3 transition-[bottom] sm:items-end sm:px-6 ${
        raised ? 'bottom-[calc(var(--safe-b)+8.5rem)] sm:bottom-[calc(var(--safe-b)+5.5rem)]' : 'bottom-[calc(var(--safe-b)+1rem)]'
      }`}
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          role={t.tone === 'error' ? 'alert' : undefined}
          className={`pointer-events-auto flex w-full max-w-md items-center gap-3 rounded-2xl py-2 pl-4 pr-2 text-sm shadow-[0_20px_50px_-20px_var(--shadow)] ${
            t.tone === 'error' ? 'bg-badge-bg text-badge-text' : 'bg-cta-bg text-cta-text'
          }`}
        >
          <span aria-hidden className="shrink-0">{t.tone === 'error' ? '!' : t.tone === 'ok' ? '✓' : 'i'}</span>
          <span className="min-w-0 flex-1 py-1.5">{t.text}</span>
          {t.action && (
            <button
              type="button"
              className="min-h-10 shrink-0 rounded-full px-3 font-semibold underline underline-offset-4"
              onClick={() => {
                onDismiss(t.id);
                t.action?.run();
              }}
            >
              {t.action.label}
            </button>
          )}
          <button type="button" aria-label="Dismiss" className="grid size-10 shrink-0 place-items-center rounded-full opacity-80 hover:opacity-100" onClick={() => onDismiss(t.id)}>
            <IconClose size={18} />
          </button>
        </div>
      ))}
    </div>
  );
}

/** Toast state: ok/info fade after 5 s, errors after 9 s (or when dismissed). */
export function useToasts() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const seq = useRef(0);
  const timers = useRef(new Map<number, number>());
  useEffect(() => {
    const t = timers.current;
    return () => t.forEach((id) => window.clearTimeout(id));
  }, []);
  const dismiss = (id: number) => {
    window.clearTimeout(timers.current.get(id));
    timers.current.delete(id);
    setToasts((l) => l.filter((x) => x.id !== id));
  };
  const show = (tone: Toast['tone'], text: string, action?: Toast['action']) => {
    const id = ++seq.current;
    setToasts((l) => [...l.slice(-2), { id, tone, text, action }]);
    timers.current.set(id, window.setTimeout(() => dismiss(id), tone === 'error' ? 9000 : action ? 8000 : 5000));
  };
  return { toasts, show, dismiss };
}
