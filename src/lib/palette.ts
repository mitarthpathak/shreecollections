/** Vrindavan Noir — the one palette shared by CSS (globals.css mirrors it) and shaders. */
export const palette = {
  raat: '#07060A',
  lacquer: '#120E0A',
  gold100: '#FFF1C1',
  gold300: '#E9C46A',
  gold500: '#C9962E',
  gold700: '#8A6418',
  ivory: '#F3EAD8',
  neel: '#4C7BD9',
  mor: '#0E7C7B',
  pitambar: '#F2B705',
  sindoor: '#B3122B',
  matki: '#8C3B2A',
} as const;

export type PaletteKey = keyof typeof palette;

/** Hex → linear-ish [0..1] RGB triple for shader uniforms. */
export function hexToRgb01(hex: string): [number, number, number] {
  const n = parseInt(hex.replace('#', ''), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}
