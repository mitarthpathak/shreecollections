'use client';
import { createContext, useContext, useMemo } from 'react';
import { catalogOf, type Catalog, type Product } from '@/lib/catalog';

const CatalogContext = createContext<Catalog>(catalogOf([]));

/** The catalogue the root layout read on the server, for every client component below it. */
export function CatalogProvider({ products, children }: { products: Product[]; children: React.ReactNode }) {
  const value = useMemo(() => catalogOf(products), [products]);
  return <CatalogContext value={value}>{children}</CatalogContext>;
}

/** getAllProducts, getProduct, getByCategory, getBestsellers, completeTheLook… over the live catalogue. */
export const useCatalog = () => useContext(CatalogContext);
