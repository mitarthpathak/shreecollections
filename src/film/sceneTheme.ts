'use client';
import * as THREE from 'three';
import { forgetThemeColors, getThemeColor, getThemeNumber, resolvedTheme, themeRGB01 } from '@/lib/theme';
import { prefersReducedMotion } from '@/lib/gsap';

/**
 * The film's colours for the active theme, read from the --scene-* tokens. Shots read the
 * current values every frame; on a theme change the values ease to the new targets over
 * ~400 ms (instantly with reduced motion). Nothing is recreated: renderer, scenes, materials
 * and textures stay put and only their colours move.
 *
 * Colours used by three.js materials and the clear colour are THREE.Color (linear, colour
 * managed). Colours for raw ShaderMaterials, which write gl_FragColor directly, are sRGB
 * Vector3s.
 */
type Snapshot = {
  /** 0 = Raat (dark), 1 = Kagaz (light) */
  light: number;
  bg: THREE.Color;
  coinRim: THREE.Color;
  glint: THREE.Color;
  shadow: THREE.Color;
  dust: THREE.Vector3;
  dustAlpha: number;
  threadLo: THREE.Vector3;
  thread: THREE.Vector3;
  head: THREE.Vector3;
  bloom: number;
};

const blank = (): Snapshot => ({
  light: 0,
  bg: new THREE.Color(),
  coinRim: new THREE.Color(),
  glint: new THREE.Color(),
  shadow: new THREE.Color(),
  dust: new THREE.Vector3(),
  dustAlpha: 1,
  threadLo: new THREE.Vector3(),
  thread: new THREE.Vector3(),
  head: new THREE.Vector3(),
  bloom: 1,
});

/** Current (eased) values — read these in useFrame. */
export const sceneTheme = blank();
const target = blank();
let primed = false;

const v3 = (out: THREE.Vector3, token: string) => out.set(...themeRGB01(token));

/** Re-read the targets from CSS (after a theme change, or when --chapter-bg moves). */
export function readSceneTheme() {
  forgetThemeColors();
  target.light = resolvedTheme() === 'light' ? 1 : 0;
  target.bg.set(getThemeColor('--chapter-bg', { fresh: true }));
  target.coinRim.set(getThemeColor('--scene-coin-rim'));
  target.glint.set(getThemeColor('--scene-glint'));
  target.shadow.set(getThemeColor('--scene-shadow'));
  v3(target.dust, '--scene-dust');
  target.dustAlpha = getThemeNumber('--scene-dust-alpha', 1);
  v3(target.threadLo, '--scene-thread-lo');
  v3(target.thread, '--scene-thread');
  v3(target.head, '--scene-head');
  target.bloom = getThemeNumber('--scene-bloom', 1);
  if (!primed || prefersReducedMotion()) snapSceneTheme();
  primed = true;
}

/** Jump straight to the targets. */
export function snapSceneTheme() {
  const s = sceneTheme, t = target;
  s.light = t.light;
  s.bg.copy(t.bg);
  s.coinRim.copy(t.coinRim);
  s.glint.copy(t.glint);
  s.shadow.copy(t.shadow);
  s.dust.copy(t.dust);
  s.dustAlpha = t.dustAlpha;
  s.threadLo.copy(t.threadLo);
  s.thread.copy(t.thread);
  s.head.copy(t.head);
  s.bloom = t.bloom;
}

/** Ease towards the targets; ~400 ms to settle. */
export function stepSceneTheme(dt: number) {
  const k = 1 - Math.exp(-10 * Math.min(dt, 0.1));
  const s = sceneTheme, t = target;
  s.light += (t.light - s.light) * k;
  s.bg.lerp(t.bg, k);
  s.coinRim.lerp(t.coinRim, k);
  s.glint.lerp(t.glint, k);
  s.shadow.lerp(t.shadow, k);
  s.dust.lerp(t.dust, k);
  s.dustAlpha += (t.dustAlpha - s.dustAlpha) * k;
  s.threadLo.lerp(t.threadLo, k);
  s.thread.lerp(t.thread, k);
  s.head.lerp(t.head, k);
  s.bloom += (t.bloom - s.bloom) * k;
}

/** Calls `cb` whenever the resolved theme may have changed (attribute or OS setting). */
export function onThemeChange(cb: () => void) {
  const html = document.documentElement;
  const mo = new MutationObserver(cb);
  mo.observe(html, { attributes: true, attributeFilter: ['data-theme'] });
  const mq = window.matchMedia('(prefers-color-scheme: dark)');
  mq.addEventListener('change', cb);
  return () => {
    mo.disconnect();
    mq.removeEventListener('change', cb);
  };
}
