'use client';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type Lang = 'en' | 'hi';
export type Tier = 0 | 1 | 2 | 3;

export type BagLine = { slug: string; size?: string; qty: number };

type Persisted = {
  bag: BagLine[];
  wishlist: string[];
  lang: Lang;
  /** null = automatic (detect-gpu); a number = user override from ?tier= or the debug panel. */
  tierOverride: Tier | null;
  sound: boolean;
  recentSearches: string[];
  recentlyViewed: string[];
  customer: { name: string; pincode: string };
};

type Actions = {
  add: (slug: string, size?: string, qty?: number) => void;
  setQty: (slug: string, size: string | undefined, qty: number) => void;
  remove: (slug: string, size?: string) => void;
  clearBag: () => void;
  toggleWish: (slug: string) => boolean;
  setLang: (l: Lang) => void;
  setSound: (on: boolean) => void;
  pushSearch: (q: string) => void;
  pushViewed: (slug: string) => void;
  setCustomer: (c: Partial<Persisted['customer']>) => void;
  setTierOverride: (t: Tier | null) => void;
};

const same = (a: BagLine, slug: string, size?: string) => a.slug === slug && (a.size ?? '') === (size ?? '');

export const useShop = create<Persisted & Actions>()(
  persist(
    (set, get) => ({
      bag: [],
      wishlist: [],
      lang: 'en',
      tierOverride: null,
      sound: false,
      recentSearches: [],
      recentlyViewed: [],
      customer: { name: '', pincode: '' },
      add: (slug, size, qty = 1) =>
        set((s) => {
          const hit = s.bag.find((l) => same(l, slug, size));
          if (hit) return { bag: s.bag.map((l) => (l === hit ? { ...l, qty: Math.min(10, l.qty + qty) } : l)) };
          return { bag: [...s.bag, { slug, size, qty }] };
        }),
      setQty: (slug, size, qty) =>
        set((s) => ({ bag: s.bag.map((l) => (same(l, slug, size) ? { ...l, qty: Math.max(1, Math.min(10, qty)) } : l)) })),
      remove: (slug, size) => set((s) => ({ bag: s.bag.filter((l) => !same(l, slug, size)) })),
      clearBag: () => set({ bag: [] }),
      toggleWish: (slug) => {
        const on = !get().wishlist.includes(slug);
        set((s) => ({ wishlist: on ? [slug, ...s.wishlist] : s.wishlist.filter((x) => x !== slug) }));
        return on;
      },
      setLang: (lang) => set({ lang }),
      setSound: (sound) => set({ sound }),
      pushSearch: (q) =>
        set((s) => ({ recentSearches: [q, ...s.recentSearches.filter((x) => x.toLowerCase() !== q.toLowerCase())].slice(0, 6) })),
      pushViewed: (slug) => set((s) => ({ recentlyViewed: [slug, ...s.recentlyViewed.filter((x) => x !== slug)].slice(0, 8) })),
      setCustomer: (c) => set((s) => ({ customer: { ...s.customer, ...c } })),
      setTierOverride: (tierOverride) => set({ tierOverride }),
    }),
    {
      name: 'shree-collection',
      version: 1,
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
    },
  ),
);

/** Ephemeral UI state (not persisted). */
type UI = {
  hydrated: boolean;
  bagOpen: boolean;
  searchOpen: boolean;
  tier: Tier;
  setHydrated: () => void;
  setBagOpen: (o: boolean) => void;
  setSearchOpen: (o: boolean) => void;
  setTier: (t: Tier) => void;
};

export const useUI = create<UI>()((set) => ({
  hydrated: false,
  bagOpen: false,
  searchOpen: false,
  tier: 2,
  setHydrated: () => set({ hydrated: true }),
  setBagOpen: (bagOpen) => set({ bagOpen }),
  setSearchOpen: (searchOpen) => set({ searchOpen }),
  setTier: (tier) => set({ tier }),
}));

export const bagCount = (bag: BagLine[]) => bag.reduce((n, l) => n + l.qty, 0);
