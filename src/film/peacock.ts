/**
 * The peacock-feather eye (mor pankh), one geometry shared by the coin face (textures.ts), the
 * logo badge (BadgeMark) and the Mor Pankh chapter (Mor.tsx), so they read as the same eye.
 * Rings from the outside in: half-width / half-height as fractions of the eye's, a downward
 * offset (the heart of a real eye sits low), and the pigment token. Drawn as flat fills, so
 * it stays crisp at any size — no blurred gradients.
 */
export const PEACOCK_EYE: readonly { rx: number; ry: number; dy: number; token: string }[] = [
  { rx: 1, ry: 1, dy: 0, token: '--pigment-peacock-bronze' },
  { rx: 0.84, ry: 0.86, dy: 0.05, token: '--pigment-peacock-leaf' },
  { rx: 0.7, ry: 0.72, dy: 0.09, token: '--gold-300' },
  { rx: 0.58, ry: 0.6, dy: 0.12, token: '--mor' },
  { rx: 0.42, ry: 0.45, dy: 0.15, token: '--pigment-peacock-blue' },
  { rx: 0.27, ry: 0.3, dy: 0.17, token: '--pigment-peacock-navy' },
];
