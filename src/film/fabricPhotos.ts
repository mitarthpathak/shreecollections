'use client';
import * as THREE from 'three';
import type { FabricKind } from './fabrics';

/**
 * Real fabric macro photos for the Weave, when the owner has added them
 * (public/textures/<fabric>/{albedo,normal}.webp, listed in the generated index.json).
 * Fabrics without photos keep their procedural textures.
 */
type Manifest = Partial<Record<FabricKind, { albedo: string; normal: string | null }>>;

let manifest: Promise<Manifest> | null = null;
export const fabricManifest = () =>
  (manifest ??= fetch('/textures/index.json')
    .then((r): Promise<Manifest> | Manifest => (r.ok ? (r.json() as Promise<Manifest>) : {}))
    .catch((): Manifest => ({})));

const loader = () => new THREE.TextureLoader();

export async function loadFabricPhoto(kind: FabricKind): Promise<{ albedo: THREE.Texture; normal: THREE.Texture | null } | null> {
  const m = (await fabricManifest())[kind];
  if (!m) return null;
  const [albedo, normal] = await Promise.all([loader().loadAsync(m.albedo), m.normal ? loader().loadAsync(m.normal) : null]);
  for (const t of [albedo, normal]) {
    if (!t) continue;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.anisotropy = 4;
  }
  albedo.colorSpace = THREE.SRGBColorSpace;
  return { albedo, normal };
}

/** A flat normal map, so swapping a real one in never changes the shader (no recompile). */
export function flatNormal() {
  const t = new THREE.DataTexture(new Uint8Array([128, 128, 255, 255]), 1, 1);
  t.needsUpdate = true;
  return t;
}
