'use client';
import { CHAPTERS } from './chapters';
import { themeRGB01 } from '@/lib/theme';

/**
 * The film's colour journey: each chapter has a tint (CHAPTERS[i].tint, a token that resolves
 * per theme). While the reader is in chapter i, the background holds its tint and, over the
 * last 30% of the chapter, blends into chapter i + 1's — one continuous colour film.
 * Writes sRGB 0–1 into `out` and returns it. Token reads are cached per theme.
 */
export function chapterBgAt(chapter: number, progress: number, out: [number, number, number]) {
  const a = themeRGB01(CHAPTERS[chapter]?.tint ?? '--bg');
  const next = CHAPTERS[chapter + 1];
  const b = next ? themeRGB01(next.tint) : a;
  const t = Math.min(1, Math.max(0, (progress - 0.7) / 0.3));
  const k = t * t * (3 - 2 * t);
  out[0] = a[0] + (b[0] - a[0]) * k;
  out[1] = a[1] + (b[1] - a[1]) * k;
  out[2] = a[2] + (b[2] - a[2]) * k;
  return out;
}

export const rgbCss = ([r, g, b]: readonly number[]) => `rgb(${Math.round(r * 255)} ${Math.round(g * 255)} ${Math.round(b * 255)})`;
