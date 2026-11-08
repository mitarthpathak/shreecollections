'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { BadgeMark, Wordmark } from './BadgeMark';
import { IconBag, IconHeart, IconSearch, IconSound } from './icons';
import { useShop, useUI, bagCount } from '@/lib/store';
import { useT } from '@/lib/i18n';
import { gsap, ScrollTrigger } from '@/lib/gsap';
import { setAmbience } from '@/lib/sound';

export function LangToggle({ className = '' }: { className?: string }) {
  const lang = useShop((s) => s.lang);
  const setLang = useShop((s) => s.setLang);
  return (
    <div role="group" aria-label="Language" className={`flex items-center rounded-full p-0.5 text-[0.72rem] ring-1 ring-gold-500/40 ${className}`}>
      {(['en', 'hi'] as const).map((l) => (
        <button
          key={l}
          type="button"
          aria-pressed={lang === l}
          onClick={() => setLang(l)}
          className={`min-h-9 min-w-10 rounded-full px-2.5 transition-colors ${lang === l ? 'bg-gold-300 text-raat' : 'text-ivory-dim hover:text-gold-100'}`}
        >
          {l === 'en' ? 'EN' : <span lang="hi">हिं</span>}
        </button>
      ))}
    </div>
  );
}

export function Count({ n, label }: { n: number; label: string }) {
  const hydrated = useUI((s) => s.hydrated);
  if (!hydrated || n === 0) return null;
  return (
    <span
      data-count
      aria-label={`${n} ${label}`}
      className="absolute -right-1.5 -top-1 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-gold-300 px-1 text-[10px] font-semibold text-raat [transform-style:preserve-3d]"
    >
      {n}
    </span>
  );
}

export function Header() {
  const pathname = usePathname();
  const isFilm = pathname === '/';
  const ref = useRef<HTMLElement>(null);
  const t = useT();
  const bag = useShop((s) => s.bag);
  const wish = useShop((s) => s.wishlist);
  const sound = useShop((s) => s.sound);
  const setSound = useShop((s) => s.setSound);
  const setBagOpen = useUI((s) => s.setBagOpen);
  const setSearchOpen = useUI((s) => s.setSearchOpen);

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

  return (
    <header
      ref={ref}
      data-film={isFilm}
      className="group fixed inset-x-0 top-0 z-50 h-[var(--header-h)] will-change-transform"
    >
      <div className="absolute inset-0 -z-10 opacity-0 transition-opacity duration-500 glass group-data-[scrolled=true]:opacity-100 group-data-[film=false]:opacity-100" />
      <div className="absolute inset-x-0 bottom-0 hairline opacity-0 transition-opacity duration-500 group-data-[scrolled=true]:opacity-60 group-data-[film=false]:opacity-60" />
      <div className="mx-auto flex h-full max-w-[1600px] items-center gap-3 px-4 md:px-8">
        <Link href="/" className="flex items-center gap-3" aria-label="Shree Collection — home">
          <BadgeMark size={40} priority />
          <Wordmark className="hidden text-[1rem] sm:inline-flex" />
        </Link>

        <nav aria-label="Primary" className="ml-8 hidden items-center gap-1 md:flex">
          {nav.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              aria-current={pathname.startsWith(n.href) ? 'page' : undefined}
              className="label rounded-full px-3 py-3 text-ivory-dim transition-colors hover:text-gold-100 aria-[current=page]:text-gold-300"
            >
              {n.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-1">
          <LangToggle className="mr-1 hidden sm:flex" />
          <button
            type="button"
            className="relative hidden h-11 w-11 place-items-center rounded-full text-ivory-dim hover:text-gold-100 md:grid"
            aria-pressed={sound}
            aria-label={`${t('sound')} ${sound ? 'on' : 'off'}`}
            onClick={() => {
              setSound(!sound);
              setAmbience(!sound);
            }}
          >
            <IconSound on={sound} />
          </button>
          <button
            type="button"
            className="grid h-11 w-11 place-items-center rounded-full text-ivory hover:text-gold-100"
            aria-label={t('search')}
            aria-keyshortcuts="/"
            onClick={() => setSearchOpen(true)}
          >
            <IconSearch />
          </button>
          <Link
            href="/wishlist"
            className="relative hidden h-11 w-11 place-items-center rounded-full text-ivory hover:text-gold-100 md:grid"
            aria-label={t('wishlist')}
          >
            <IconHeart />
            <Count n={wish.length} label={t('wishlist')} />
          </Link>
          <button
            type="button"
            data-bag-target="header"
            className="relative hidden h-11 w-11 place-items-center rounded-full text-ivory hover:text-gold-100 md:grid"
            aria-label={t('bag')}
            onClick={() => setBagOpen(true)}
          >
            <IconBag />
            <Count n={bagCount(bag)} label={t('bag')} />
          </button>
          <LangToggle className="sm:hidden" />
        </div>
      </div>
    </header>
  );
}
