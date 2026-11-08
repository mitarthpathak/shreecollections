'use client';
import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { useShop, useUI } from '@/lib/store';
import { startClock, getLenis, lockScroll } from '@/lib/clock';
import { ScrollTrigger } from '@/lib/gsap';
import { detectTier } from '@/lib/tier';

const closeOverlays = () => {
  const ui = useUI.getState();
  if (ui.searchOpen) ui.setSearchOpen(false);
  if (ui.bagOpen) ui.setBagOpen(false);
};

/** Boots the shared clock, rehydrates the persisted store and picks the quality tier. */
export function Providers({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const lang = useShop((s) => s.lang);
  const tierOverride = useShop((s) => s.tierOverride);
  const hydrated = useUI((s) => s.hydrated);

  useEffect(() => {
    startClock();
    const done = () => useUI.getState().setHydrated();
    // A child effect that wrote to the store has already hydrated it (see store.ts).
    const p = useShop.persist;
    if (!p || p.hasHydrated()) done();
    else p.rehydrate().finally(done);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    let alive = true;
    const apply = (t: 0 | 1 | 2 | 3) => {
      if (!alive) return;
      useUI.getState().setTier(t);
      document.documentElement.dataset.tier = String(t);
    };
    if (tierOverride !== null) apply(tierOverride);
    else detectTier().then(apply);
    return () => {
      alive = false;
    };
  }, [hydrated, tierOverride]);

  useEffect(() => {
    document.documentElement.lang = lang === 'hi' ? 'hi' : 'en-IN';
  }, [lang]);

  // Back / forward and route changes close the search overlay and the bag drawer, so
  // Android Back never leaves one open (and the page locked) over the page it returns to.
  const lastPath = useRef(pathname);
  useEffect(() => {
    if (lastPath.current === pathname) return;
    lastPath.current = pathname;
    closeOverlays();
    // Safety net: an on/off lockScroll(true) left behind by an overlay that unmounted
    // without its cleanup must not freeze the next page. (holdScroll() holds are released
    // by their owners' cleanups.)
    lockScroll(false);
  }, [pathname]);
  useEffect(() => {
    window.addEventListener('popstate', closeOverlays);
    return () => window.removeEventListener('popstate', closeOverlays);
  }, []);

  // After every route change: resync Lenis with the new document and re-measure triggers.
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      const lenis = getLenis();
      lenis?.resize();
      lenis?.scrollTo(window.scrollY, { immediate: true, force: true });
      ScrollTrigger.refresh();
    });
    return () => cancelAnimationFrame(id);
  }, [pathname]);

  // "/" opens search on desktop.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      const typing = t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable);
      // Not over another open dialog (bag drawer, image viewer, filter sheet).
      const covered = () =>
        Array.from(document.querySelectorAll('[aria-modal="true"]')).some((m) => getComputedStyle(m).visibility === 'visible');
      if (e.key === '/' && !typing && !e.metaKey && !e.ctrlKey && !covered()) {
        e.preventDefault();
        useUI.getState().setSearchOpen(true);
      }
      if (e.key === 'Escape') closeOverlays();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return <>{children}</>;
}
