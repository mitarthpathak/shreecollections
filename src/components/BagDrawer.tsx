'use client';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useShop, useUI } from '@/lib/store';
import { getProduct, type Product, productMedia } from '@/lib/catalog';
import { formatINR } from '@/lib/format';
import { useLang, useT } from '@/lib/i18n';
import { contactChannel, copyForInstagram, orderMessage, whatsappLink } from '@/lib/whatsapp';
import { ContactIcon } from './ContactIcon';
import { gsap, prefersReducedMotion } from '@/lib/gsap';
import { Flip } from '@/lib/gsap-flip';
import { useModal } from '@/lib/modal';
import { IconClose, IconMinus, IconPlus } from './icons';

export function useBagLines() {
  const bag = useShop((s) => s.bag);
  return useMemo(
    () =>
      bag
        .map((l) => ({ ...l, product: getProduct(l.slug) }))
        .filter((l): l is typeof l & { product: Product } => Boolean(l.product)),
    [bag],
  );
}

/** Line items, coupon, customer fields and the WhatsApp checkout. Used by the drawer and /bag. */
export function BagContents({ variant = 'drawer' }: { variant?: 'drawer' | 'page' }) {
  const lines = useBagLines();
  const setQty = useShop((s) => s.setQty);
  const remove = useShop((s) => s.remove);
  const customer = useShop((s) => s.customer);
  const setCustomer = useShop((s) => s.setCustomer);
  const setBagOpen = useUI((s) => s.setBagOpen);
  const hydrated = useUI((s) => s.hydrated);
  const lang = useLang();
  const t = useT();
  const list = useRef<HTMLUListElement>(null);
  const [coupon, setCoupon] = useState('');
  const [couponMsg, setCouponMsg] = useState('');
  const subtotal = lines.reduce((n, l) => n + l.product.price * l.qty, 0);

  const animatedRemove = (slug: string, size: string | undefined, el: HTMLElement | null) => {
    if (!el || !list.current || prefersReducedMotion()) return remove(slug, size);
    const state = Flip.getState(list.current.children);
    gsap.to(el, {
      x: 40,
      opacity: 0,
      duration: 0.28,
      ease: 'power2.in',
      onComplete: () => {
        remove(slug, size);
        requestAnimationFrame(() => {
          if (list.current) Flip.from(state, { targets: list.current.children, duration: 0.4, ease: 'power2.out', absolute: false });
        });
      },
    });
  };

  // The saved bag is read after the first render; don't flash "empty" on a /bag reload.
  if (!hydrated) return <div className="min-h-[40svh] w-full" />;

  if (!lines.length) {
    return (
      <div
        className={`flex flex-1 flex-col items-center justify-center gap-6 px-6 py-16 text-center ${variant === 'drawer' ? 'min-h-0 overflow-y-auto overscroll-contain' : 'w-full'}`}
        data-lenis-prevent={variant === 'drawer' || undefined}
      >
        <svg width="96" height="96" viewBox="0 0 96 96" aria-hidden className="shrink-0 text-gold-text">
          <defs>
            <linearGradient id={`bag-thread-${variant}`} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopOpacity="0.2" style={{ stopColor: 'var(--metal-lo)' }} />
              <stop offset="0.55" style={{ stopColor: 'var(--metal)' }} />
              <stop offset="1" style={{ stopColor: 'var(--metal-hi)' }} />
            </linearGradient>
          </defs>
          <path d="M28 40c0-12 9-18 20-18s20 6 20 18c6 4 8 12 6 22-3 14-14 22-26 22S25 76 22 62c-2-10 0-18 6-22Z" fill="none" stroke="currentColor" strokeWidth="1.4" />
          <path d="M30 40h36" stroke="currentColor" strokeWidth="1.4" />
          <path d="M14 30c10 4 20 6 34 6" stroke={`url(#bag-thread-${variant})`} strokeWidth="1.2" fill="none" strokeDasharray="2 4" />
        </svg>
        <p className="font-editorial text-2xl italic text-fg">{t('emptyBag')}</p>
        <Link href="/shop" onClick={() => setBagOpen(false)} className="btn btn-ghost">
          {t('continueShopping')}
        </Link>
      </div>
    );
  }

  // Drawer: the whole body scrolls, so the checkout is always reachable on short screens and
  // in landscape; where there is height to spare the checkout stays pinned under the list.
  // Page: min-w-0 throughout so the inputs can't push the column wider than a phone.
  return (
    <div
      className={
        variant === 'drawer'
          ? 'flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain'
          : 'flex w-full min-w-0 flex-col gap-8 lg:flex-row lg:items-start'
      }
      data-lenis-prevent={variant === 'drawer' || undefined}
    >
      <ul ref={list} className={`min-w-0 flex-1 space-y-3 ${variant === 'drawer' ? 'px-5 py-4' : ''}`}>
        {lines.map((l) => (
          <li key={l.slug + (l.size ?? '')} className="panel flex gap-4 rounded-2xl p-3">
            <Link href={`/product/${l.slug}`} onClick={() => setBagOpen(false)} className="shrink-0">
              <Image src={productMedia(l.product)[0]} alt={l.product.name} width={84} height={112} className="h-28 w-[84px] rounded-xl object-cover" />
            </Link>
            <div className="flex min-w-0 flex-1 flex-col">
              <p className="truncate font-editorial text-lg font-medium leading-snug text-fg" lang={lang === 'hi' ? 'hi' : undefined}>
                {lang === 'hi' ? l.product.nameHi : l.product.name}
              </p>
              <p className="mt-0.5 text-xs text-fg-muted">
                {l.size ? `${t('size')} ${l.size}` : l.product.category === 'suit' && !l.product.stitched ? t('unstitched') : ''}
              </p>
              <div className="mt-auto flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
                <div className="flex items-center rounded-full ring-1 ring-field-line" role="group" aria-label={t('qty')}>
                  <button type="button" className="grid h-11 w-11 place-items-center text-fg-muted hover:text-gold-text disabled:opacity-30" aria-label="−1" disabled={l.qty <= 1} onClick={() => setQty(l.slug, l.size, l.qty - 1)}>
                    <IconMinus size={16} />
                  </button>
                  <span className="w-6 text-center text-sm tabular-nums" aria-live="polite">{l.qty}</span>
                  <button type="button" className="grid h-11 w-11 place-items-center text-fg-muted hover:text-gold-text disabled:opacity-30" aria-label="+1" disabled={l.qty >= 10} onClick={() => setQty(l.slug, l.size, l.qty + 1)}>
                    <IconPlus size={16} />
                  </button>
                </div>
                <p className="text-sm font-medium tabular-nums text-gold-text">{formatINR(l.product.price * l.qty)}</p>
              </div>
              <button
                type="button"
                className="-ml-1 inline-flex min-h-11 min-w-11 items-center self-start px-1 text-xs text-fg-muted underline decoration-gold-line underline-offset-4 hover:text-danger"
                onClick={(e) => animatedRemove(l.slug, l.size, (e.currentTarget as HTMLElement).closest('li'))}
              >
                {t('remove')}
              </button>
            </div>
          </li>
        ))}
      </ul>

      <div
        className={`space-y-4 ${
          variant === 'drawer'
            ? 'border-t border-divider bg-surface px-5 pb-[calc(1.25rem+var(--safe-b))] pt-4 [@media(min-height:820px)]:sticky [@media(min-height:820px)]:bottom-0'
            : 'panel h-fit min-w-0 rounded-3xl p-5 sm:p-6 lg:w-[380px] lg:shrink-0'
        }`}
      >
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (!coupon.trim()) return;
            setCouponMsg(
              lang === 'hi'
                ? `कूपन “${coupon.trim().toUpperCase()}” WhatsApp पर ऑर्डर के साथ लागू होगा।`
                : `Coupon “${coupon.trim().toUpperCase()}” will be applied with your order on WhatsApp.`,
            );
          }}
        >
          <label className="sr-only" htmlFor={`coupon-${variant}`}>{t('coupon')}</label>
          <input
            id={`coupon-${variant}`}
            value={coupon}
            onChange={(e) => setCoupon(e.target.value)}
            placeholder={t('coupon')}
            className="min-h-11 min-w-0 flex-1 rounded-full bg-bg px-4 text-base text-fg md:text-sm ring-1 ring-field-line placeholder:text-fg-muted focus:ring-focus"
          />
          <button className="chip" type="submit">{t('apply')}</button>
        </form>
        {couponMsg && <p className="text-xs text-gold-text" role="status">{couponMsg}</p>}
        <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,120px)] gap-2">
          <label className="sr-only" htmlFor={`name-${variant}`}>{t('yourName')}</label>
          <input
            id={`name-${variant}`}
            value={customer.name}
            onChange={(e) => setCustomer({ name: e.target.value })}
            placeholder={t('yourName')}
            autoComplete="name"
            className="min-h-11 w-full min-w-0 rounded-full bg-bg px-4 text-base text-fg md:text-sm ring-1 ring-field-line placeholder:text-fg-muted focus:ring-focus"
          />
          <label className="sr-only" htmlFor={`pin-${variant}`}>{t('pincode')}</label>
          <input
            id={`pin-${variant}`}
            value={customer.pincode}
            onChange={(e) => setCustomer({ pincode: e.target.value.replace(/\D/g, '').slice(0, 6) })}
            placeholder={t('pincode')}
            inputMode="numeric"
            autoComplete="postal-code"
            className="min-h-11 w-full min-w-0 rounded-full bg-bg px-4 text-base text-fg md:text-sm ring-1 ring-field-line placeholder:text-fg-muted focus:ring-focus"
          />
        </div>
        <div className="flex items-baseline justify-between">
          <span className="label text-fg-muted">{t('subtotal')}</span>
          <span className="text-xl font-medium tabular-nums text-gold-text">{formatINR(subtotal)}</span>
        </div>
        <p className="text-xs text-fg-muted">{t('shippingNote')}</p>
        <a
          href={whatsappLink(orderMessage(lines, customer))}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => copyForInstagram(orderMessage(lines, customer))}
          className="btn btn-gold w-full"
        >
          <ContactIcon /> {t(contactChannel === 'whatsapp' ? 'checkoutWhatsApp' : 'orderInstagram')}
        </a>
        {contactChannel === 'instagram' && <p className="text-xs text-fg-muted">{t('orderCopied')}</p>}
        <button type="button" className="btn btn-ghost w-full" disabled aria-describedby={`pay-${variant}`}>
          {t('payOnline')}
        </button>
        <p id={`pay-${variant}`} className="-mt-2 text-center text-xs text-fg-muted">{t('comingSoon')}</p>
        {variant === 'drawer' && (
          <Link href="/bag" onClick={() => setBagOpen(false)} className="block py-2 text-center text-xs text-gold-text underline underline-offset-4">
            {t('viewBag')}
          </Link>
        )}
      </div>
    </div>
  );
}

export function BagDrawer() {
  const open = useUI((s) => s.bagOpen);
  const setOpen = useUI((s) => s.setBagOpen);
  const panel = useRef<HTMLDivElement>(null);
  const scrim = useRef<HTMLDivElement>(null);
  const root = useRef<HTMLDivElement>(null);
  const t = useT();

  // Scroll hold, focus trap, Escape and focus return (declared first: it notes the opener).
  useModal(open, panel, () => setOpen(false));

  useEffect(() => {
    const p = panel.current, s = scrim.current, r = root.current;
    if (!p || !s || !r) return;
    if (open) {
      r.style.visibility = 'visible';
      gsap.to(s, { opacity: 1, duration: 0.3, ease: 'power2.out', overwrite: true });
      gsap.fromTo(
        p,
        { xPercent: 100 },
        {
          xPercent: 0,
          duration: 0.45,
          ease: 'power3.out',
          overwrite: true,
          onComplete: () => {
            if (!p.contains(document.activeElement)) p.focus({ preventScroll: true });
          },
        },
      );
    } else if (r.style.visibility === 'visible') {
      gsap.to(s, { opacity: 0, duration: 0.25, overwrite: true });
      gsap.to(p, { xPercent: 100, duration: 0.35, ease: 'power2.in', overwrite: true, onComplete: () => void (r.style.visibility = 'hidden') });
    }
  }, [open]);

  return (
    <div ref={root} className="fixed inset-0 z-[70]" style={{ visibility: 'hidden' }} aria-hidden={!open}>
      <div ref={scrim} className="absolute inset-0 bg-scrim opacity-0" onClick={() => setOpen(false)} />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label={t('bag')}
        tabIndex={-1}
        className="absolute inset-y-0 right-0 flex w-full max-w-[440px] flex-col bg-surface pr-[env(safe-area-inset-right,0px)] pt-[env(safe-area-inset-top,0px)] shadow-[-30px_0_80px_-20px_var(--shadow)] outline-none"
      >
        <div className="flex shrink-0 items-center justify-between border-b border-divider px-5 py-4">
          <h2 className="font-editorial text-2xl font-medium text-fg">{t('bag')}</h2>
          <button type="button" className="grid h-11 w-11 place-items-center rounded-full text-fg hover:text-gold-text" onClick={() => setOpen(false)} aria-label={t('close')}>
            <IconClose />
          </button>
        </div>
        {open && <BagContents />}
      </div>
    </div>
  );
}
