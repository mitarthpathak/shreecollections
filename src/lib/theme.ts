/**
 * Colour tokens for JavaScript (three.js, canvas textures, D3, inline SVG built in JS).
 * CSS is the only place hex values live: these helpers read a token's computed value from the
 * document, so JS never duplicates a colour and always follows the active theme.
 *
 *   getThemeColor('--gold-text')        → '#7a5810' (light) / '#e9c46a' (dark)
 *   themeRGBA('--scrim')                → [28, 20, 16, 0.45]
 *   themeColor('--pigment-clay', 0.5)   → 'rgb(162 72 47 / 0.5)'  (canvas / SVG / style strings)
 *
 * Values are cached per resolved theme; call `forgetThemeColors()` after the theme changes, or
 * pass `{ fresh: true }` for tokens that move on their own (e.g. --chapter-bg).
 */

export type RGBA = [r: number, g: number, b: number, a: number];

let probe: HTMLElement | null = null;
let parser: CanvasRenderingContext2D | null = null;
const cache = new Map<string, RGBA>();

/** 'light' | 'dark', as the CSS resolves it (explicit choice first, then the OS setting). */
export function resolvedTheme(): 'light' | 'dark' {
  if (typeof document === 'undefined') return 'light';
  const t = document.documentElement.dataset.theme;
  if (t === 'light' || t === 'dark') return t;
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function parse(css: string): RGBA {
  const m = css.match(/^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:\s*[,/]\s*([\d.]+%?))?\s*\)$/);
  if (m) {
    const a = m[4] === undefined ? 1 : m[4].endsWith('%') ? parseFloat(m[4]) / 100 : parseFloat(m[4]);
    return [+m[1], +m[2], +m[3], a];
  }
  const c = css.match(/^color\(srgb\s+([\d.e-]+)\s+([\d.e-]+)\s+([\d.e-]+)(?:\s*\/\s*([\d.]+))?\s*\)$/);
  if (c) return [+c[1] * 255, +c[2] * 255, +c[3] * 255, c[4] === undefined ? 1 : +c[4]];
  // Any other colour syntax (oklab, …): let a canvas convert it.
  parser ??= document.createElement('canvas').getContext('2d', { willReadFrequently: true });
  if (!parser) return [0, 0, 0, 1];
  parser.clearRect(0, 0, 1, 1);
  parser.fillStyle = css;
  parser.fillRect(0, 0, 1, 1);
  const [r, g, b, a] = parser.getImageData(0, 0, 1, 1).data;
  return [r, g, b, a / 255];
}

/** A token's colour as [r, g, b (0–255), a (0–1)]. */
export function themeRGBA(token: string, opts: { fresh?: boolean } = {}): RGBA {
  if (typeof document === 'undefined') return [0, 0, 0, 1];
  const key = `${resolvedTheme()}|${token}`;
  if (!opts.fresh) {
    const hit = cache.get(key);
    if (hit) return hit;
  }
  if (!probe || !probe.isConnected) {
    probe = document.createElement('span');
    probe.setAttribute('aria-hidden', 'true');
    probe.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden;visibility:hidden;pointer-events:none';
    document.documentElement.appendChild(probe);
  }
  probe.style.color = `var(${token})`;
  const v = parse(getComputedStyle(probe).color);
  if (!opts.fresh) cache.set(key, v);
  return v;
}

const hex2 = (n: number) => Math.round(Math.max(0, Math.min(255, n))).toString(16).padStart(2, '0');

/** A token's colour as '#rrggbb' (alpha dropped). */
export function getThemeColor(token: string, opts: { fresh?: boolean } = {}): string {
  const [r, g, b] = themeRGBA(token, opts);
  return `#${hex2(r)}${hex2(g)}${hex2(b)}`;
}

/** A token's colour as a CSS/canvas colour string, optionally with a different alpha. */
export function themeColor(token: string, alpha?: number, opts: { fresh?: boolean } = {}): string {
  const [r, g, b, a] = themeRGBA(token, opts);
  return `rgb(${Math.round(r)} ${Math.round(g)} ${Math.round(b)} / ${alpha ?? a})`;
}

/** A token's colour as [r, g, b] in 0–1, for shader uniforms. */
export function themeRGB01(token: string, opts: { fresh?: boolean } = {}): [number, number, number] {
  const [r, g, b] = themeRGBA(token, opts);
  return [r / 255, g / 255, b / 255];
}

/** A numeric token (e.g. --scene-bloom). */
export function getThemeNumber(token: string, fallback = 0): number {
  if (typeof document === 'undefined') return fallback;
  const v = parseFloat(getComputedStyle(document.documentElement).getPropertyValue(token));
  return Number.isFinite(v) ? v : fallback;
}

/** Drop cached values (after a theme change). */
export function forgetThemeColors() {
  cache.clear();
}

/** Hex → [r, g, b] in 0–1, for data colours (product swatches) that are not tokens. */
export function hexToRgb01(hex: string): [number, number, number] {
  const n = parseInt(hex.replace('#', ''), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}
