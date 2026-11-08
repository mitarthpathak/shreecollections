'use client';
/**
 * Procedural textures: textile patterns drawn with D3 path generators onto canvas,
 * turned into CanvasTextures. Only the peacock feather is a painted image (also canvas).
 */
import * as THREE from 'three';
import { line, lineRadial, curveCardinalClosed, curveCatmullRomClosed, curveBasis } from 'd3-shape';
import { brand } from '@/brand.config';
import { palette } from '@/lib/palette';

const make = (w: number, h: number) => {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return [c, c.getContext('2d')!] as const;
};

const toTex = (c: HTMLCanvasElement, repeat = 1, srgb = true) => {
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat, repeat);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  t.needsUpdate = true;
  return t;
};

const goldFill = (ctx: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number) => {
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  g.addColorStop(0, palette.gold100);
  g.addColorStop(0.45, palette.gold300);
  g.addColorStop(1, palette.gold700);
  return g;
};

// A paisley (kairi) outline from a handful of points, closed with Catmull-Rom.
const paisleyPts: [number, number][] = [
  [0, -30], [14, -24], [22, -6], [18, 12], [4, 26], [-12, 26], [-20, 12], [-16, -2], [-6, -6], [-2, 2], [-6, 8], [-10, 4],
];
const paisley = line().curve(curveCatmullRomClosed.alpha(0.5));

function rosette(r: number, petals: number) {
  const pts: [number, number][] = [];
  for (let i = 0; i < petals * 2; i++) pts.push([(i / (petals * 2)) * Math.PI * 2, i % 2 ? r * 0.45 : r]);
  return lineRadial().curve(curveCardinalClosed.tension(0.2))(pts) ?? '';
}

export type FabricKind = 'Banarasi' | 'Chanderi' | 'Georgette' | 'Cotton' | 'Bandhani' | 'Leheriya';

export const WEAVE_FABRICS: { kind: FabricKind; base: string; hi: string; line: string }[] = [
  { kind: 'Banarasi', base: '#7A0F24', hi: 'बनारसी', line: 'Zari woven into silk on the ghats of Varanasi.' },
  { kind: 'Chanderi', base: '#E9DFC7', hi: 'चंदेरी', line: 'Light as moonlight, with gold coins scattered through.' },
  { kind: 'Georgette', base: '#B4536B', hi: 'जॉर्जेट', line: 'A fall that follows every step.' },
  { kind: 'Cotton', base: '#22305E', hi: 'कॉटन', line: 'Block-printed, sun-dried, softer every wash.' },
  { kind: 'Bandhani', base: '#A3112A', hi: 'बांधनी', line: 'Ten thousand knots, tied by hand.' },
  { kind: 'Leheriya', base: '#2F7D52', hi: 'लहरिया', line: 'The ripple of a monsoon river, dyed in.' },
];

export function fabricCanvas(kind: FabricKind, base: string, size = 512) {
  const [c, ctx] = make(size, size);
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, size, size);
  const s = size / 512;
  switch (kind) {
    case 'Banarasi': {
      const p = new Path2D(paisley(paisleyPts) ?? '');
      for (let row = 0; row < 5; row++)
        for (let col = 0; col < 5; col++) {
          ctx.save();
          ctx.translate((col + (row % 2) * 0.5) * 128 * s, row * 128 * s);
          ctx.scale(1.3 * s, 1.3 * s);
          ctx.fillStyle = goldFill(ctx, -20, -30, 20, 30);
          ctx.fill(p);
          ctx.strokeStyle = palette.gold700;
          ctx.lineWidth = 1.2;
          ctx.stroke(p);
          ctx.restore();
        }
      ctx.strokeStyle = 'rgba(233,196,106,.35)';
      ctx.lineWidth = 1.5 * s;
      for (let i = -size; i < size * 2; i += 64 * s) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i + size, size);
        ctx.moveTo(i + size, 0);
        ctx.lineTo(i, size);
        ctx.stroke();
      }
      break;
    }
    case 'Chanderi': {
      ctx.fillStyle = 'rgba(255,255,255,.05)';
      for (let x = 0; x < size; x += 4 * s) ctx.fillRect(x, 0, 1, size);
      const r = new Path2D(rosette(9 * s, 6));
      for (let y = 0; y < 8; y++)
        for (let x = 0; x < 8; x++) {
          ctx.save();
          ctx.translate((x + (y % 2) * 0.5) * 64 * s + 16 * s, y * 64 * s + 16 * s);
          ctx.fillStyle = goldFill(ctx, -9, -9, 9, 9);
          ctx.fill(r);
          ctx.restore();
        }
      break;
    }
    case 'Georgette': {
      const curve = line().curve(curveBasis);
      for (let i = 0; i < 26; i++) {
        const y = (i / 26) * size;
        const pts: [number, number][] = Array.from({ length: 8 }, (_, k) => [(k / 7) * size, y + Math.sin(k * 1.3 + i) * 22 * s]);
        ctx.strokeStyle = i % 2 ? 'rgba(255,255,255,.08)' : 'rgba(0,0,0,.12)';
        ctx.lineWidth = (8 + (i % 3) * 6) * s;
        ctx.stroke(new Path2D(curve(pts) ?? ''));
      }
      for (let i = 0; i < 220; i++) {
        ctx.fillStyle = i % 4 ? palette.gold300 : palette.gold100;
        ctx.beginPath();
        ctx.arc(((i * 97) % 512) * s, ((i * 211) % 512) * s, (1 + (i % 3)) * s, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
    case 'Cotton': {
      const r = new Path2D(rosette(14 * s, 6));
      for (let y = 0; y < 8; y++)
        for (let x = 0; x < 8; x++) {
          ctx.save();
          ctx.translate((x + (y % 2) * 0.5) * 64 * s + 20 * s, y * 64 * s + 20 * s);
          ctx.fillStyle = palette.ivory;
          ctx.globalAlpha = 0.85;
          ctx.fill(r);
          ctx.globalAlpha = 1;
          ctx.fillStyle = base;
          ctx.beginPath();
          ctx.arc(0, 0, 4 * s, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      break;
    }
    case 'Bandhani': {
      for (let y = 0; y < 16; y++)
        for (let x = 0; x < 16; x++) {
          const cx = (x + (y % 2) * 0.5) * 32 * s + 8 * s, cy = y * 32 * s + 8 * s;
          for (let k = 0; k < 8; k++) {
            const a = (k / 8) * Math.PI * 2;
            ctx.fillStyle = k % 2 ? '#FFF6D8' : palette.pitambar;
            ctx.beginPath();
            ctx.arc(cx + Math.cos(a) * 6 * s, cy + Math.sin(a) * 6 * s, 1.8 * s, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.fillStyle = '#FFF6D8';
          ctx.beginPath();
          ctx.arc(cx, cy, 2.2 * s, 0, Math.PI * 2);
          ctx.fill();
        }
      break;
    }
    case 'Leheriya': {
      const wave = line().curve(curveBasis);
      const cols = [palette.pitambar, '#E9F0D0', palette.gold300, '#174D33'];
      for (let i = -20; i < 40; i++) {
        const pts: [number, number][] = Array.from({ length: 10 }, (_, k) => {
          const t = k / 9;
          return [t * size + i * 22 * s - size * 0.5, t * size + Math.sin(t * Math.PI * 4) * 6 * s];
        });
        ctx.strokeStyle = cols[((i % 4) + 4) % 4];
        ctx.lineWidth = (i % 2 ? 5 : 9) * s;
        ctx.stroke(new Path2D(wave(pts) ?? ''));
      }
      break;
    }
  }
  return c;
}

export function fabricTexture(kind: FabricKind, base: string, size = 512, repeat = 2) {
  return toTex(fabricCanvas(kind, base, size), repeat);
}

/** Saree body for the six-yard ribbon: Banarasi field with a zari border along both edges. */
export function sareeTexture(size = 1024) {
  const [c, ctx] = make(size, size / 4);
  const f = fabricCanvas('Banarasi', '#5E0B1D', 256);
  ctx.fillStyle = ctx.createPattern(f, 'repeat')!;
  ctx.fillRect(0, 0, c.width, c.height);
  const band = (y: number, h: number) => {
    ctx.fillStyle = goldFill(ctx, 0, y, 0, y + h);
    ctx.fillRect(0, y, c.width, h);
    ctx.fillStyle = 'rgba(94,11,29,.9)';
    for (let x = 0; x < c.width; x += 18) ctx.fillRect(x, y + h * 0.35, 8, h * 0.3);
  };
  band(0, 22);
  band(c.height - 22, 22);
  const t = toTex(c, 1);
  t.repeat.set(6, 1);
  return t;
}

/** The badge face. Uses the owner's artwork when available; otherwise a typographic stand-in. */
export async function badgeTexture(size = 1024): Promise<THREE.Texture> {
  if (brand.logo.hasArtwork) {
    const t = await new THREE.TextureLoader().loadAsync(brand.logo.src);
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
  bg.addColorStop(0, '#1c140c');
  bg.addColorStop(1, '#07060A');
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
  const eye = ctx.createRadialGradient(m, size * 0.26, 2, m, size * 0.26, size * 0.11);
  eye.addColorStop(0, '#1B2C7A');
  eye.addColorStop(0.45, palette.mor);
  eye.addColorStop(0.75, palette.gold300);
  eye.addColorStop(1, 'rgba(14,124,123,0)');
  ctx.fillStyle = eye;
  ctx.beginPath();
  ctx.ellipse(m, size * 0.26, size * 0.07, size * 0.1, 0, 0, Math.PI * 2);
  ctx.fill();
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

/** Peacock feather (mor pankh): rachis, barbs and the eye, with alpha. */
export function featherTexture() {
  const [c, ctx] = make(512, 1024);
  const cx = 256;
  // barbs
  for (let i = 0; i < 260; i++) {
    const y = 1000 - i * 3.6;
    const len = 60 + Math.sin((i / 260) * Math.PI) * 170;
    const a = 0.55 + (i / 260) * 0.35;
    for (const dir of [-1, 1]) {
      const g = ctx.createLinearGradient(cx, y, cx + dir * len, y - len * a);
      g.addColorStop(0, 'rgba(176,140,60,.9)');
      g.addColorStop(0.5, 'rgba(20,120,90,.55)');
      g.addColorStop(1, 'rgba(14,124,123,0)');
      ctx.strokeStyle = g;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(cx, y);
      ctx.quadraticCurveTo(cx + dir * len * 0.5, y - len * a * 0.2, cx + dir * len, y - len * a);
      ctx.stroke();
    }
  }
  // rachis
  ctx.strokeStyle = goldFill(ctx, 0, 0, 0, 1024);
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(cx, 1024);
  ctx.lineTo(cx, 200);
  ctx.stroke();
  // the eye (ocellus)
  const rings: [number, number, string][] = [
    [150, 200, 'rgba(120,150,40,.85)'],
    [118, 160, 'rgba(201,150,46,.95)'],
    [96, 128, 'rgba(14,124,123,1)'],
    [70, 96, 'rgba(60,140,200,1)'],
    [44, 60, 'rgba(20,30,110,1)'],
  ];
  rings.forEach(([rx, ry, col]) => {
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.ellipse(cx, 220, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
  });
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Terracotta with painted gold bands for the matki. */
export function matkiTexture() {
  const [c, ctx] = make(512, 512);
  const g = ctx.createLinearGradient(0, 0, 0, 512);
  g.addColorStop(0, '#A2482F');
  g.addColorStop(1, '#6E2C1E');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 3000; i++) {
    ctx.fillStyle = `rgba(0,0,0,${Math.random() * 0.08})`;
    ctx.fillRect(Math.random() * 512, Math.random() * 512, 2, 2);
  }
  const band = (y: number, h: number) => {
    ctx.fillStyle = goldFill(ctx, 0, y, 512, y + h);
    ctx.fillRect(0, y, 512, h);
  };
  band(150, 10);
  band(176, 4);
  band(330, 4);
  band(342, 10);
  ctx.fillStyle = goldFill(ctx, 0, 200, 512, 320);
  for (let x = 16; x < 512; x += 64) {
    ctx.beginPath();
    ctx.ellipse(x, 256, 12, 40, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x + 32, 256, 6, 0, Math.PI * 2);
    ctx.fill();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = THREE.RepeatWrapping;
  return t;
}

/** Soft round sprite for fake glows (tier 2). */
export function glowTexture() {
  const [c, ctx] = make(128, 128);
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, 'rgba(255,241,193,1)');
  g.addColorStop(0.3, 'rgba(233,196,106,.45)');
  g.addColorStop(1, 'rgba(233,196,106,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
}
