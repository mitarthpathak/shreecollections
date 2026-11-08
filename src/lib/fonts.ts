import { Cinzel, Cormorant_Garamond, Manrope, Tiro_Devanagari_Hindi, Mukta } from 'next/font/google';

// next/font downloads these at build time and serves them from our own origin:
// no runtime request to Google. Only the display faces are preloaded.

export const cinzel = Cinzel({
  subsets: ['latin'],
  weight: 'variable',
  variable: '--font-cinzel',
  display: 'swap',
  preload: true,
});

export const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['400', '500'],
  style: ['normal', 'italic'],
  variable: '--font-cormorant',
  display: 'swap',
  preload: false,
});

export const manrope = Manrope({
  subsets: ['latin'],
  weight: 'variable',
  variable: '--font-manrope',
  display: 'swap',
  preload: false,
});

export const tiro = Tiro_Devanagari_Hindi({
  subsets: ['devanagari'],
  weight: '400',
  style: 'normal',
  variable: '--font-tiro',
  display: 'swap',
  preload: true,
});

export const mukta = Mukta({
  subsets: ['devanagari'],
  weight: ['400', '600'],
  variable: '--font-mukta',
  display: 'swap',
  preload: false,
});

export const fontVars = [cinzel, cormorant, manrope, tiro, mukta].map((f) => f.variable).join(' ');
