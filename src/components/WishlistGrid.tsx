'use client';
import Link from 'next/link';
import { useShop, useUI } from '@/lib/store';
import { getProduct, type Product } from '@/lib/catalog';
import { ProductCard } from './ProductCard';
import { useT } from '@/lib/i18n';

export function WishlistGrid() {
  const hydrated = useUI((s) => s.hydrated);
  const wish = useShop((s) => s.wishlist);
  const t = useT();
  const items = wish.map((s) => getProduct(s)).filter(Boolean) as Product[];
  if (!hydrated) return <div className="min-h-[40svh]" />;
  if (!items.length)
    return (
      <div className="mx-auto flex max-w-xl flex-col items-center gap-6 px-6 py-20 text-center">
        <p className="font-editorial text-2xl italic">{t('emptyWish')}</p>
        <Link href="/shop" className="btn btn-ghost">{t('continueShopping')}</Link>
      </div>
    );
  return (
    <div className="mx-auto grid max-w-[1600px] grid-cols-2 gap-x-3 gap-y-8 px-4 pb-20 sm:gap-x-5 md:grid-cols-3 md:px-8 xl:grid-cols-4">
      {items.map((p) => <ProductCard key={p.slug} product={p} morph />)}
    </div>
  );
}
