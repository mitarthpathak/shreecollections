'use client';
import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import { useUI } from '@/lib/store';

const SearchOverlay = dynamic(() => import('./SearchOverlay').then((m) => m.SearchOverlay), { ssr: false });
const BagDrawer = dynamic(() => import('./BagDrawer').then((m) => m.BagDrawer), { ssr: false });

/** The search overlay (with Fuse.js) and the bag drawer load the first time they open, not with every page. */
export function LazySearch() {
  const [wanted, setWanted] = useState(false);
  useEffect(() => useUI.subscribe((s) => s.searchOpen && setWanted(true)), []);
  return wanted ? <SearchOverlay /> : null;
}

export function LazyBag() {
  const [wanted, setWanted] = useState(false);
  useEffect(() => useUI.subscribe((s) => s.bagOpen && setWanted(true)), []);
  return wanted ? <BagDrawer /> : null;
}
