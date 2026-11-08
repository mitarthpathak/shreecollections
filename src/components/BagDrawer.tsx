'use client';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useShop, useUI } from '@/lib/store';
import { getProduct, type Product } from '@/lib/catalog';
import { formatINR } from '@/lib/format';
import { useLang, useT } from '@/lib/i18n';
import { buildWhatsAppOrder } from '@/lib/whatsapp';
import { gsap, Flip, prefersReducedMotion } from '@/lib/gsap';
import { lockScroll } from '@/lib/clock';
import { IconClose, IconMinus, IconPlus, IconWhatsApp } from './icons';
import { brand } from '@/brand.config';

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

  if (!lines.length) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-6 px-6 py-16 text-center">
        <svg width="96" height="96" viewBox="0 0 96 96" aria-hidden className="text-gold-500">
          <path d="M28 40c0-12 9-18 20-18s20 6 20 18c6 4 8 12 6 22-3 14-14 22-26 22S25 76 22 62c-2-10 0-18 6-22Z" fill="none" stroke="currentColor" strokeWidth="1.4" />
          <path d="M30 40h36" stroke="currentColor" strokeWidth="1.4" />
          <path d="M14 30c10 4 20 6 34 6" stroke="url(#e)" strokeWidth="1.2" fill="none" strokeDasharray="2 4" />
        </svg>
        <p className="font-editorial text-2xl italic text-ivory">{t('emptyBag')}</p>
        <Link href="/shop" onClick={() => setBagOpen(false)} className="btn btn-ghost">
          {t('continueShopping')}
        </Link>
      </div>
    );
  }

  return (
    <div className={`flex min-h-0 flex-1 flex-col ${variant === 'page' ? 'gap-8 lg:flex-row' : ''}`}>
      <ul ref={list} className={`min-h-0 flex-1 space-y-3 ${variant === 'drawer' ? 'overflow-y-auto px-5 py-4' : ''}`} data-lenis-prevent>
        {lines.map((l) => (
          <li key={l.slug + (l.size ?? '')} className="panel flex gap-4 rounded-2xl p-3">
            <Link href={`/product/${l.slug}`} onClick={() => setBagOpen(false)} className="shrink-0">
              <Image src={l.product.images[0]} alt={l.product.name} width={84} height={112} className="h-28 w-[84px] rounded-xl object-cover" />
            </Link>
            <div className="flex min-w-0 flex-1 flex-col">
              <p className="truncate text-sm text-ivory" lang={lang === 'hi' ? 'hi' : undefined}>
                {lang === 'hi' ? l.product.nameHi : l.product.name}
              </p>
              <p className="mt-0.5 text-xs text-ivory-dim">
                {l.size ? `${t('size')} ${l.size}` : l.product.stitched ? '' : t('unstitched')}
              </p>
              <div className="mt-auto flex items-center justify-between gap-2">
                <div className="flex items-center rounded-full ring-1 ring-gold-500/40" role="group" aria-label={t('qty')}>
                  <button type="button" className="grid h-11 w-11 place-items-center text-ivory-dim hover:text-gold-100 disabled:opacity-30" aria-label="−1" disabled={l.qty <= 1} onClick={() => setQty(l.slug, l.size, l.qty - 1)}>
                    <IconMinus size={16} />
                  </button>
                  <span className="w-6 text-center text-sm tabular-nums" aria-live="polite">{l.qty}</span>
                  <button type="button" className="grid h-11 w-11 place-items-center text-ivory-dim hover:text-gold-100 disabled:opacity-30" aria-label="+1" disabled={l.qty >= 10} onClick={() => setQty(l.slug, l.size, l.qty + 1)}>
                    <IconPlus size={16} />
                  </button>
                </div>
                <p className="text-sm font-semibold tabular-nums text-gold-100">{formatINR(l.product.price * l.qty)}</p>
              </div>
              <button
                type="button"
                className="mt-1 self-start py-2 text-xs text-ivory-dim underline decoration-gold-700 underline-offset-4 hover:text-sindoor"
                onClick={(e) => animatedRemove(l.slug, l.size, (e.currentTarget as HTMLElement).closest('li'))}
              >
                {t('remove')}
              </button>
            </div>
          </li>
        ))}
      </ul>

      <div className={`space-y-4 ${variant === 'drawer' ? 'border-t border-gold-700/40 px-5 pb-[calc(1.25rem+var(--safe-b))] pt-4' : 'panel h-fit rounded-3xl p-6 lg:w-[380px]'}`}>
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
            className="min-h-11 flex-1 rounded-full bg-raat px-4 text-sm text-ivory ring-1 ring-gold-500/30 placeholder:text-ivory-dim/50 focus:ring-gold-300"
          />
          <button className="chip" type="submit">{t('apply')}</button>
        </form>
        {couponMsg && <p className="text-xs text-gold-300" role="status">{couponMsg}</p>}
        <div className="grid grid-cols-[1fr_120px] gap-2">
          <label className="sr-only" htmlFor={`name-${variant}`}>{t('yourName')}</label>
          <input
            id={`name-${variant}`}
            value={customer.name}
            onChange={(e) => setCustomer({ name: e.target.value })}
            placeholder={t('yourName')}
            autoComplete="name"
            className="min-h-11 rounded-full bg-raat px-4 text-sm text-ivory ring-1 ring-gold-500/30 placeholder:text-ivory-dim/50 focus:ring-gold-300"
          />
          <label className="sr-only" htmlFor={`pin-${variant}`}>{t('pincode')}</label>
          <input
            id={`pin-${variant}`}
            value={customer.pincode}
            onChange={(e) => setCustomer({ pincode: e.target.value.replace(/\D/g, '').slice(0, 6) })}
            placeholder={t('pincode')}
            inputMode="numeric"
            autoComplete="postal-code"
            className="min-h-11 rounded-full bg-raat px-4 text-sm text-ivory ring-1 ring-gold-500/30 placeholder:text-ivory-dim/50 focus:ring-gold-300"
          />
        </div>
        <div className="flex items-baseline justify-between">
          <span className="label text-ivory-dim">{t('subtotal')}</span>
          <span className="text-xl font-semibold tabular-nums text-gold-100">{formatINR(subtotal)}</span>
        </div>
        <p className="text-xs text-ivory-dim">{t('shippingNote')}</p>
        <a
          href={buildWhatsAppOrder(lines, customer)}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-gold w-full"
        >
          <IconWhatsApp size={18} /> {t('checkoutWhatsApp')}
        </a>
        {!brand.contact.whatsapp && (
          <p className="text-[11px] text-ivory-dim">
            <span className="todo">TODO(brand): WhatsApp number</span> — until it is set, WhatsApp asks which chat to send to.
          </p>
        )}
        <button type="button" className="btn btn-ghost w-full" disabled aria-describedby={`pay-${variant}`}>
          {t('payOnline')}
        </button>
        <p id={`pay-${variant}`} className="-mt-2 text-center text-[11px] text-ivory-dim">{t('comingSoon')}</p>
        {variant === 'drawer' && (
          <Link href="/bag" onClick={() => setBagOpen(false)} className="block py-2 text-center text-xs text-gold-300 underline underline-offset-4">
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
  const lastFocus = useRef<Element | null>(null);
  const t = useT();

  useEffect(() => {
    const p = panel.current, s = scrim.current, r = root.current;
    if (!p || !s || !r) return;
    if (open) {
      lastFocus.current = document.activeElement;
      r.style.visibility = 'visible';
      lockScroll(true);
      gsap.to(s, { opacity: 1, duration: 0.3, ease: 'power2.out' });
      gsap.fromTo(p, { xPercent: 100 }, { xPercent: 0, duration: 0.45, ease: 'power3.out', onComplete: () => p.focus() });
    } else if (r.style.visibility === 'visible') {
      lockScroll(false);
      gsap.to(s, { opacity: 0, duration: 0.25 });
      gsap.to(p, {
        xPercent: 100,
        duration: 0.35,
        ease: 'power2.in',
        onComplete: () => {
          r.style.visibility = 'hidden';
          (lastFocus.current as HTMLElement | null)?.focus?.();
        },
      });
    }
  }, [open]);

  return (
    <div ref={root} className="fixed inset-0 z-[70]" style={{ visibility: 'hidden' }} aria-hidden={!open}>
      <div ref={scrim} className="absolute inset-0 bg-raat/70 opacity-0" onClick={() => setOpen(false)} />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label={t('bag')}
        tabIndex={-1}
        className="absolute inset-y-0 right-0 flex w-full max-w-[440px] flex-col bg-lacquer shadow-[-30px_0_80px_-20px_rgba(0,0,0,.8)] outline-none"
      >
        <div className="flex items-center justify-between border-b border-gold-700/40 px-5 py-4">
          <h2 className="font-display text-lg tracking-[0.2em] text-gold-300">{t('bag')}</h2>
          <button type="button" className="grid h-11 w-11 place-items-center rounded-full text-ivory hover:text-gold-100" onClick={() => setOpen(false)} aria-label={t('close')}>
            <IconClose />
          </button>
        </div>
        {open && <BagContents />}
      </div>
    </div>
  );
}
