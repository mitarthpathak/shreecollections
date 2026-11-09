'use client';
/** three.js wrappers around the cached canvases in canvases.ts (only loaded with the 3D chunk). */
import * as THREE from 'three';
import { brand } from '@/brand.config';
import { getThemeColor } from '@/lib/theme';
import { PEACOCK_EYE } from './peacock';
import type { FabricKind } from './fabrics';
import { make, goldFill, fabricCanvas, sareeCanvas, featherCanvas, matkiCanvas, glowCanvas } from './canvases';
export { WEAVE_FABRICS } from './fabrics';

const toTex = (c: HTMLCanvasElement, repeat = 1, srgb = true) => {
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat, repeat);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  t.needsUpdate = true;
  return t;
};

export function fabricTexture(kind: FabricKind, base: string, size = 512, repeat = 2) {
  return toTex(fabricCanvas(kind, base, size), repeat);
}

export function sareeTexture(size = 1024) {
  const t = toTex(sareeCanvas(size), 1);
  t.repeat.set(6, 1);
  return t;
}

/** The badge face. Uses the owner's artwork when available; otherwise a typographic stand-in. */
export async function badgeTexture(size = 1024): Promise<THREE.Texture> {
  if (brand.logo.hasArtwork) {
    const t = await new THREE.TextureLoader().loadAsync(brand.logo.coin);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }
  const css = getComputedStyle(document.documentElement);
  const tiro = css.getPropertyValue('--font-tiro').trim() || 'serif';
  const cinzel = css.getPropertyValue('--font-cinzel').trim() || 'serif';
  await Promise.all([document.fonts.load(`200px ${tiro}`, 'श्री'), document.fonts.load(`60px ${cinzel}`, 'COLLECTION')]).catch(() => {});
  const [c, ctx] = make(size, size);
  const m = size / 2;
  const bg = ctx.createRadialGradient(m, m * 0.8, 10, m, m, m);
  bg.addColorStop(0, getThemeColor('--pigment-coin-core'));
  bg.addColorStop(1, getThemeColor('--raat'));
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, size, size);
  ctx.strokeStyle = goldFill(ctx, 0, 0, size, size);
  ctx.lineWidth = size * 0.012;
  ctx.beginPath();
  ctx.arc(m, m, m * 0.9, 0, Math.PI * 2);
  ctx.stroke();
  ctx.lineWidth = size * 0.003;
  ctx.beginPath();
  ctx.arc(m, m, m * 0.84, 0, Math.PI * 2);
  ctx.stroke();
  // mor pankh eye
  // crisp rings, the same eye as the logo badge and the Mor Pankh chapter (peacock.ts)
  const ex = m, ey = size * 0.26, ew = size * 0.07, eh = size * 0.1;
  for (const r of PEACOCK_EYE) {
    ctx.fillStyle = getThemeColor(r.token);
    ctx.beginPath();
    ctx.ellipse(ex, ey + r.dy * eh, r.rx * ew, r.ry * eh, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = goldFill(ctx, m - 200, m - 100, m + 200, m + 200);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.font = `${size * 0.25}px ${tiro}`;
  ctx.fillText(brand.wordmark.hi, m, size * 0.64);
  ctx.font = `${size * 0.075}px ${cinzel}`;
  ctx.letterSpacing = `${size * 0.016}px`;
  ctx.fillText(brand.wordmark.en, m + size * 0.008, size * 0.76);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

export function featherTexture() {
  const t = new THREE.CanvasTexture(featherCanvas());
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function matkiTexture() {
  const t = new THREE.CanvasTexture(matkiCanvas());
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = THREE.RepeatWrapping;
  return t;
}

export function glowTexture() {
  return new THREE.CanvasTexture(glowCanvas());
}
