import { Cinzel, Cormorant_Garamond, Manrope, Tiro_Devanagari_Hindi, Mukta } from 'next/font/google';

// next/font downloads these at build time and serves them from our own origin: no runtime
// request to Google. Only the weights the design uses are loaded, and only the two faces that
// set most of the text (Cormorant Garamond, Manrope) are preloaded.
//
//   Cinzel 400            logo wordmark and the hero heading (48px and up)
//   Cormorant Garamond 500 + italic   headings, product names, accent words
//   Manrope 400 / 500     body, labels, filters, prices, buttons
//   Tiro Devanagari Hindi Hindi headings · Mukta 400 Hindi body

export const cinzel = Cinzel({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-cinzel',
  display: 'swap',
  preload: false,
});

export const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  weight: '500',
  style: ['normal', 'italic'],
  variable: '--font-cormorant',
  display: 'swap',
  preload: true,
});

export const manrope = Manrope({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-manrope',
  display: 'swap',
  preload: true,
});

export const tiro = Tiro_Devanagari_Hindi({
  subsets: ['devanagari'],
  weight: '400',
  style: 'normal',
  variable: '--font-tiro',
  display: 'swap',
  preload: false,
});

// One weight: Hindi UI text at 500 uses the 400 face (no synthesis below 600), saving ~67 KB
// that was requested before first paint (the हिं switch, Hindi labels).
export const mukta = Mukta({
  subsets: ['devanagari'],
  weight: '400',
  variable: '--font-mukta',
  display: 'swap',
  preload: false,
});

export const fontVars = [cinzel, cormorant, manrope, tiro, mukta].map((f) => f.variable).join(' ');
