'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useRef, useState, type RefObject, type SVGProps } from 'react';
import { BadgeMark, Wordmark } from './BadgeMark';
import { IconBag, IconClose, IconHeart, IconSearch, IconSound } from './icons';
import { useShop, useUI, bagCount } from '@/lib/store';
import { useLang, useT } from '@/lib/i18n';
import { gsap, ScrollTrigger, prefersReducedMotion } from '@/lib/gsap';
import { lockScroll } from '@/lib/clock';
import { setAmbience, SOUND_AVAILABLE } from '@/lib/sound';
import { brand } from '@/brand.config';

const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

/** Keeps Tab / Shift+Tab inside a modal panel. Call from a keydown listener while it is open. */
export function trapFocus(e: KeyboardEvent, root: HTMLElement | null) {
  if (e.key !== 'Tab' || !root) return;
  const els = [...root.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((el) => el.getClientRects().length > 0);
  if (!els.length) return;
  const first = els[0];
  const last = els[els.length - 1];
  const a = document.activeElement;
  if (!root.contains(a)) {
    e.preventDefault();
    (e.shiftKey ? last : first).focus();
  } else if (e.shiftKey && (a === first || a === root)) {
    e.preventDefault();
    last.focus();
  } else if (!e.shiftKey && a === last) {
    e.preventDefault();
    first.focus();
  }
}

const IconMenu = ({ size = 22, ...p }: SVGProps<SVGSVGElement> & { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" aria-hidden {...p}>
    <path d="M4 7h16M4 12h16M4 17h10" />
  </svg>
);

export function LangToggle({ className = '' }: { className?: string }) {
  const lang = useShop((s) => s.lang);
  const setLang = useShop((s) => s.setLang);
  const t = useT();
  return (
    <div role="group" aria-label={t('language')} className={`flex shrink-0 items-center rounded-full p-0.5 text-[0.75rem] ring-1 ring-field-line ${className}`}>
      {(['en', 'hi'] as const).map((l) => (
        <button
          key={l}
          type="button"
          aria-pressed={lang === l}
          aria-label={l === 'en' ? 'English' : 'हिंदी'}
          onClick={() => setLang(l)}
          className={`min-h-11 min-w-11 rounded-full px-2 transition-colors ${lang === l ? 'bg-cta-bg text-cta-text' : 'text-fg-muted hover:text-gold-text'}`}
        >
          {l === 'en' ? 'EN' : <span lang="hi">हिं</span>}
        </button>
      ))}
    </div>
  );
}

function SoundToggle({ className = '' }: { className?: string }) {
  const t = useT();
  const sound = useShop((s) => s.sound);
  const setSound = useShop((s) => s.setSound);
  return (
    <button
      type="button"
      className={`relative h-11 w-11 shrink-0 place-items-center rounded-full text-fg-muted hover:text-gold-text ${className}`}
      aria-pressed={sound}
      aria-label={t('sound')}
      onClick={() => {
        setSound(!sound);
        setAmbience(!sound);
      }}
    >
      <IconSound on={sound} />
    </button>
  );
}

export function Count({ n, label }: { n: number; label: string }) {
  const hydrated = useUI((s) => s.hydrated);
  if (!hydrated || n === 0) return null;
  return (
    <span
      data-count
      aria-label={`${n} ${label}`}
      className="absolute -right-1.5 -top-1 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-cta-bg px-1 text-[11px] font-semibold leading-none text-cta-text [transform-style:preserve-3d]"
    >
      {n}
    </span>
  );
}

/**
 * Header layout by width:
 *  - < md (phones; the TabBar carries Home/Shop/Search/Wishlist/Bag): menu, badge, language, search.
 *  - md – lg (iPad portrait, phones in landscape): menu, badge + wordmark, language, search, wishlist, bag.
 *  - lg + : badge + wordmark, the four chapter links, language, search, wishlist, bag.
 * Every control stays on-screen from 320px up.
 */
export function Header() {
  const pathname = usePathname();
  const isFilm = pathname === '/';
  const ref = useRef<HTMLElement>(null);
  const menuBtn = useRef<HTMLButtonElement>(null);
  const t = useT();
  const bag = useShop((s) => s.bag);
  const wish = useShop((s) => s.wishlist);
  const setBagOpen = useUI((s) => s.setBagOpen);
  const setSearchOpen = useUI((s) => s.setSearchOpen);
  // The menu remembers the page it was opened on, so any navigation closes it.
  const [menuAt, setMenuAt] = useState<string | null>(null);
  const menuOpen = menuAt === pathname;
  const closeMenu = useCallback(() => setMenuAt(null), []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const show = gsap.quickTo(el, 'yPercent', { duration: 0.45, ease: 'power2.out' });
    el.dataset.scrolled = 'false';
    show(0);
    const st = ScrollTrigger.create({
      start: 0,
      end: 'max',
      onUpdate(self) {
        const y = self.scroll();
        el.dataset.scrolled = y > 40 ? 'true' : 'false';
        if (y < 120 || self.direction < 0) show(0);
        else if (self.direction > 0 && !el.matches(':focus-within')) show(-110);
      },
    });
    return () => st.kill();
  }, [pathname]);

  const nav = [
    { href: '/shop/sarees', label: t('sarees') },
    { href: '/shop/suits', label: t('suits') },
    { href: '/lookbook', label: t('lookbook') },
    { href: '/visit', label: t('visit') },
  ];
  const icon = 'relative h-11 w-11 shrink-0 place-items-center rounded-full text-fg hover:text-gold-text';

  return (
    <>
      <header
        ref={ref}
        data-film={isFilm}
        className="group fixed inset-x-0 top-0 z-50 h-[calc(var(--header-h)+env(safe-area-inset-top,0px))] pt-[env(safe-area-inset-top,0px)] will-change-transform"
      >
        <div className="absolute inset-0 -z-10 opacity-0 transition-opacity duration-500 glass group-data-[scrolled=true]:opacity-100 group-data-[film=false]:opacity-100" />
        <div className="absolute inset-x-0 bottom-0 hairline opacity-0 transition-opacity duration-500 group-data-[scrolled=true]:opacity-60 group-data-[film=false]:opacity-60" />
        <div className="mx-auto flex h-full max-w-[1600px] items-center gap-2 pl-[max(0.75rem,env(safe-area-inset-left))] pr-[max(0.75rem,env(safe-area-inset-right))] sm:gap-3 sm:pl-[max(1rem,env(safe-area-inset-left))] sm:pr-[max(1rem,env(safe-area-inset-right))] md:pl-[max(2rem,env(safe-area-inset-left))] md:pr-[max(2rem,env(safe-area-inset-right))]">
          <button
            ref={menuBtn}
            type="button"
            className={`${icon} -ml-1 grid lg:hidden`}
            aria-label={t('menu')}
            aria-haspopup="dialog"
            aria-expanded={menuOpen}
            aria-controls="site-menu"
            onClick={() => setMenuAt(pathname)}
          >
            <IconMenu />
          </button>
          <Link href="/" className="flex shrink-0 items-center gap-3 rounded-full">
            <BadgeMark size={40} priority />
            <span className="hidden sm:inline-flex">
              <Wordmark className="text-[1rem]" />
            </span>
          </Link>

          <nav aria-label="Primary" className="ml-6 hidden items-center gap-1 lg:flex xl:ml-8">
            {nav.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                aria-current={pathname.startsWith(n.href) ? 'page' : undefined}
                className="label whitespace-nowrap rounded-full px-3 py-3 text-fg-muted transition-colors hover:text-gold-text aria-[current=page]:text-gold-text"
              >
                {n.label}
              </Link>
            ))}
          </nav>

          <div className="ml-auto flex shrink-0 items-center gap-1">
            <LangToggle className="mr-1" />
            {SOUND_AVAILABLE && <SoundToggle className="hidden md:grid" />}
            <button type="button" className={`${icon} grid`} aria-label={t('search')} aria-keyshortcuts="/" onClick={() => setSearchOpen(true)}>
              <IconSearch />
            </button>
            <Link href="/wishlist" className={`${icon} hidden md:grid`} aria-label={t('wishlist')}>
              <IconHeart />
              <Count n={wish.length} label={t('wishlist')} />
            </Link>
            <button type="button" data-bag-target="header" className={`${icon} hidden md:grid`} aria-label={t('bag')} onClick={() => setBagOpen(true)}>
              <IconBag />
              <Count n={bagCount(bag)} label={t('bag')} />
            </button>
          </div>
        </div>
      </header>
      {/* Outside <header>: its transform would otherwise trap this fixed panel. */}
      <SiteMenu open={menuOpen} onClose={closeMenu} opener={menuBtn} />
    </>
  );
}

/** Every page, the language and (when available) sound: below lg, where the header nav is hidden. */
function SiteMenu({ open, onClose, opener }: { open: boolean; onClose: () => void; opener: RefObject<HTMLButtonElement | null> }) {
  const pathname = usePathname();
  const t = useT();
  const lang = useLang();
  const bag = useShop((s) => s.bag);
  const wish = useShop((s) => s.wishlist);
  const setBagOpen = useUI((s) => s.setBagOpen);
  const root = useRef<HTMLDivElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const scrim = useRef<HTMLDivElement>(null);
  const locked = useRef(false);

  useEffect(() => {
    const r = root.current;
    const p = panel.current;
    const s = scrim.current;
    if (!r || !p || !s) return;
    const d = prefersReducedMotion() ? 0 : 1;
    if (open) {
      r.style.visibility = 'visible';
      if (!locked.current) {
        lockScroll(true);
        locked.current = true;
      }
      gsap.to(s, { opacity: 1, duration: 0.3 * d, ease: 'power2.out', overwrite: true });
      gsap.fromTo(p, { xPercent: -100 }, { xPercent: 0, duration: 0.45 * d, ease: 'power3.out', overwrite: true });
      p.querySelector<HTMLElement>('[data-autofocus]')?.focus({ preventScroll: true });
      const onKey = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          e.preventDefault();
          onClose();
        } else trapFocus(e, p);
      };
      // The menu only exists below lg; growing past it (rotation, resize) closes it.
      const wide = window.matchMedia('(min-width: 1024px)');
      const onWide = () => wide.matches && onClose();
      window.addEventListener('keydown', onKey);
      wide.addEventListener('change', onWide);
      return () => {
        window.removeEventListener('keydown', onKey);
        wide.removeEventListener('change', onWide);
      };
    }
    if (!locked.current) return;
    lockScroll(false);
    locked.current = false;
    const a = document.activeElement;
    if (!a || a === document.body || p.contains(a)) opener.current?.focus({ preventScroll: true });
    gsap.to(s, { opacity: 0, duration: 0.25 * d, overwrite: true });
    gsap.to(p, { xPercent: -100, duration: 0.35 * d, ease: 'power2.in', overwrite: true, onComplete: () => void (r.style.visibility = 'hidden') });
  }, [open, onClose, opener]);

  // Never leave the page scroll-locked if the menu unmounts while open.
  useEffect(() => {
    const l = locked;
    return () => {
      if (l.current) lockScroll(false);
    };
  }, []);

  const links = [
    { href: '/', label: t('home'), on: pathname === '/' },
    { href: '/shop', label: t('shop'), on: pathname === '/shop' },
    { href: '/shop/sarees', label: t('sarees'), on: pathname.startsWith('/shop/sarees') },
    { href: '/shop/suits', label: t('suits'), on: pathname.startsWith('/shop/suits') },
    { href: '/lookbook', label: t('lookbook'), on: pathname.startsWith('/lookbook') },
    { href: '/visit', label: t('visit'), on: pathname.startsWith('/visit') },
    { href: '/about', label: t('about'), on: pathname.startsWith('/about') },
  ];
  const hi = lang === 'hi';

  return (
    <div ref={root} id="site-menu" className="fixed inset-0 z-[72] lg:hidden" style={{ visibility: 'hidden' }}>
      <div ref={scrim} className="absolute inset-0 bg-scrim opacity-0" onClick={onClose} aria-hidden />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label={t('menu')}
        tabIndex={-1}
        className="absolute inset-y-0 left-0 flex w-[min(86vw,380px)] flex-col bg-surface pb-[var(--safe-b)] pl-[env(safe-area-inset-left,0px)] pt-[env(safe-area-inset-top,0px)] shadow-[30px_0_80px_-20px_var(--shadow)] outline-none"
      >
        <div className="flex items-center justify-between gap-3 border-b border-divider py-3 pl-5 pr-3">
          <div className="flex items-center gap-3">
            <BadgeMark size={36} />
            <h2 className="font-display text-lg tracking-[0.2em] text-gold-text">{t('menu')}</h2>
          </div>
          <button type="button" data-autofocus className="grid h-11 w-11 place-items-center rounded-full text-fg hover:text-gold-text" onClick={onClose} aria-label={t('close')}>
            <IconClose />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain" data-lenis-prevent>
          <nav aria-label={t('menu')} className="px-5 pt-2">
            <ul>
              {links.map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    onClick={onClose}
                    aria-current={l.on ? 'page' : undefined}
                    className={`group flex min-h-[52px] items-center justify-between gap-4 border-b border-divider text-fg transition-colors hover:text-gold-text aria-[current=page]:text-gold-text ${
                      hi ? 'text-xl' : 'font-display text-[1.02rem] uppercase tracking-[0.18em]'
                    }`}
                  >
                    <span lang={hi ? 'hi' : undefined}>{l.label}</span>
                    <span aria-hidden className="h-px w-6 bg-gold-line/50 transition-all duration-300 group-hover:w-10 group-aria-[current=page]:w-10 group-aria-[current=page]:bg-gold-text" />
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div className="grid grid-cols-2 gap-2 px-5 pt-5">
            <Link href="/wishlist" onClick={onClose} className="chip justify-center" aria-current={pathname === '/wishlist' ? 'page' : undefined}>
              <span className="relative">
                <IconHeart size={20} />
                <Count n={wish.length} label={t('wishlist')} />
              </span>
              <span lang={hi ? 'hi' : undefined}>{t('wishlist')}</span>
            </Link>
            <button
              type="button"
              className="chip justify-center"
              onClick={() => {
                // Hand focus back to the opener first, so the drawer returns there when it closes.
                opener.current?.focus({ preventScroll: true });
                onClose();
                setBagOpen(true);
              }}
            >
              <span className="relative">
                <IconBag size={20} />
                <Count n={bagCount(bag)} label={t('bag')} />
              </span>
              <span lang={hi ? 'hi' : undefined}>{t('bag')}</span>
            </button>
          </div>

          <div className="mt-6 space-y-3 border-t border-divider px-5 py-5">
            <div className="flex items-center justify-between gap-3">
              <span className="label text-gold-text">{t('language')}</span>
              <LangToggle />
            </div>
            {SOUND_AVAILABLE && (
              <div className="flex items-center justify-between gap-3">
                <span className="label text-gold-text">{t('sound')}</span>
                <SoundToggle className="grid ring-1 ring-field-line" />
              </div>
            )}
            <p className="text-gold-glint pt-3 font-display text-sm tracking-[0.18em]">
              {brand.signOff} · <span lang="hi" className="font-hindi-display">{brand.signOffHi}</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
