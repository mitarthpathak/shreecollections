'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { IconBag, IconGrid, IconHeart, IconHome, IconSearch } from './icons';
import { Count } from './Header';
import { useShop, useUI, bagCount } from '@/lib/store';
import { useT } from '@/lib/i18n';

/** Mobile bottom tab bar: 56px tall plus the safe area (bottom, and the notch side in landscape). */
export function TabBar() {
  const pathname = usePathname();
  const t = useT();
  const bag = useShop((s) => s.bag);
  const wish = useShop((s) => s.wishlist);
  const setSearchOpen = useUI((s) => s.setSearchOpen);
  const setBagOpen = useUI((s) => s.setBagOpen);
  const item =
    'relative flex min-h-[var(--tabbar-h)] min-w-0 flex-1 flex-col items-center justify-center gap-0.5 text-[11px] leading-tight tracking-wide text-fg-muted aria-[current=page]:text-gold-text';

  return (
    <nav
      aria-label="Tabs"
      className="glass fixed inset-x-0 bottom-0 z-50 flex border-t border-divider pb-[var(--safe-b)] pl-[env(safe-area-inset-left,0px)] pr-[env(safe-area-inset-right,0px)] md:hidden"
    >
      <Link href="/" className={item} aria-current={pathname === '/' ? 'page' : undefined}>
        <IconHome size={22} />
        {t('home')}
      </Link>
      <Link href="/shop" className={item} aria-current={pathname.startsWith('/shop') ? 'page' : undefined}>
        <IconGrid size={22} />
        {t('shop')}
      </Link>
      <button type="button" className={item} onClick={() => setSearchOpen(true)}>
        <IconSearch size={22} />
        {t('search')}
      </button>
      <Link href="/wishlist" className={item} aria-current={pathname === '/wishlist' ? 'page' : undefined}>
        <span className="relative">
          <IconHeart size={22} />
          <Count n={wish.length} label={t('wishlist')} />
        </span>
        {t('wishlist')}
      </Link>
      <button type="button" data-bag-target="tabbar" className={item} onClick={() => setBagOpen(true)}>
        <span className="relative">
          <IconBag size={22} />
          <Count n={bagCount(bag)} label={t('bag')} />
        </span>
        {t('bag')}
      </button>
    </nav>
  );
}
