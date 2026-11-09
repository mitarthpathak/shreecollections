'use client';
import { usePathname } from 'next/navigation';

/** The admin panel is a work tool: it has its own top bar, and none of the storefront's chrome. */
export const isAdminPath = (path: string | null | undefined) => path === '/admin' || Boolean(path?.startsWith('/admin/'));

/**
 * The storefront's chrome (header, footer, tab bar, bag, search, cursor, curtain, grain): rendered
 * everywhere except the admin panel. Decided from the path on the server too, so it never flashes.
 */
export function SiteOnly({ children }: { children: React.ReactNode }) {
  return isAdminPath(usePathname()) ? null : <>{children}</>;
}
