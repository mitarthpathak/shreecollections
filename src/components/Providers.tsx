'use client';
import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useShop, useUI } from '@/lib/store';
import { startClock, getLenis } from '@/lib/clock';
import { ScrollTrigger } from '@/lib/gsap';
import { detectTier } from '@/lib/tier';

/** Boots the shared clock, rehydrates the persisted store and picks the quality tier. */
export function Providers({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const lang = useShop((s) => s.lang);
  const tierOverride = useShop((s) => s.tierOverride);
  const hydrated = useUI((s) => s.hydrated);

  useEffect(() => {
    startClock();
    Promise.resolve(useShop.persist.rehydrate()).finally(() => useUI.getState().setHydrated());
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
      if (e.key === '/' && !typing && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        useUI.getState().setSearchOpen(true);
      }
      if (e.key === 'Escape') {
        useUI.getState().setSearchOpen(false);
        useUI.getState().setBagOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return <>{children}</>;
}
