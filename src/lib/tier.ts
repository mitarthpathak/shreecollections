'use client';
import type { Tier } from './store';

/**
 * Quality tier from detect-gpu, deviceMemory, Save-Data and reduced motion.
 * 3 High: desktop GPUs · 2 Mid: most phones and laptops · 1 Low: older Android · 0 Lite: posters only.
 */
export async function detectTier(): Promise<Tier> {
  const url = new URL(window.location.href);
  const forced = url.searchParams.get('tier');
  if (forced && /^[0-3]$/.test(forced)) return Number(forced) as Tier;

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return 0;
  const nav = navigator as Navigator & { connection?: { saveData?: boolean }; deviceMemory?: number };
  if (nav.connection?.saveData) return 0;

  const probe = document.createElement('canvas');
  const gl = (probe.getContext('webgl2') || probe.getContext('webgl')) as WebGLRenderingContext | null;
  if (!gl) return 0;

  const mem = nav.deviceMemory ?? 8;
  const coarse = window.matchMedia('(pointer: coarse)').matches;
  let tier: Tier = coarse ? 2 : 3;
  try {
    const { getGPUTier } = await import('detect-gpu');
    const r = await getGPUTier({ benchmarksURL: '/detect-gpu', glContext: gl });
    if (r.type === 'WEBGL_UNSUPPORTED' || r.type === 'BLOCKLISTED') return 0;
    const t = Math.max(1, r.tier) as Tier;
    tier = r.isMobile ? (Math.min(2, t) as Tier) : t;
  } catch {
    // Benchmarks unavailable: fall back to the pointer heuristic above.
  }
  if (mem <= 2) tier = Math.min(tier, 1) as Tier;
  else if (mem <= 4) tier = Math.min(tier, 2) as Tier;
  gl.getExtension('WEBGL_lose_context')?.loseContext();
  return tier;
}

export const TIER_SETTINGS = {
  0: { dpr: [1, 1] as [number, number], dust: 0, silk: 0, post: false, maxTex: 0 },
  1: { dpr: [1, 1] as [number, number], dust: 1500, silk: 48, post: false, maxTex: 512 },
  2: { dpr: [1, 1.5] as [number, number], dust: 6000, silk: 96, post: false, maxTex: 1024 },
  3: { dpr: [1, 2] as [number, number], dust: 20000, silk: 200, post: true, maxTex: 2048 },
} as const;
