'use client';
/**
 * Procedural textile art drawn with D3 path generators onto 2D canvases — no three.js here,
 * so it can be generated in idle slices before the 3D chunk arrives. Every canvas is cached:
 * drawing happens once, never mid-scroll.
 */
import { line, lineRadial, curveCardinalClosed, curveCatmullRomClosed, curveBasis } from 'd3-shape';
import { getThemeColor, themeColor } from '@/lib/theme';
import { WEAVE_FABRICS, type FabricKind } from './fabrics';

export const make = (w: number, h: number) => {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return [c, c.getContext('2d')!] as const;
};

export const goldFill = (ctx: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number) => {
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  g.addColorStop(0, getThemeColor('--gold-100'));
  g.addColorStop(0.45, getThemeColor('--gold-300'));
  g.addColorStop(1, getThemeColor('--gold-700'));
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

function drawFabric(kind: FabricKind, base: string, size: number) {
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
          ctx.strokeStyle = getThemeColor('--gold-700');
          ctx.lineWidth = 1.2;
          ctx.stroke(p);
          ctx.restore();
        }
      ctx.strokeStyle = themeColor('--gold-300', 0.35);
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
      ctx.fillStyle = themeColor('--pigment-zari-pale', 0.05);
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
        ctx.strokeStyle = i % 2 ? themeColor('--pigment-zari-pale', 0.08) : themeColor('--raat', 0.12);
        ctx.lineWidth = (8 + (i % 3) * 6) * s;
        ctx.stroke(new Path2D(curve(pts) ?? ''));
      }
      for (let i = 0; i < 220; i++) {
        ctx.fillStyle = i % 4 ? getThemeColor('--gold-300') : getThemeColor('--gold-100');
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
          ctx.fillStyle = getThemeColor('--ivory');
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
      // Bandhani: tiny undyed dots, each with the darker pinch of its knot, set in rings
      // (flowers of a 4-dot centre, an inner and an outer ring) with 3-dot clusters between.
      const zari = getThemeColor('--pigment-zari-pale');
      const yellow = getThemeColor('--pitambar');
      const knot = themeColor('--raat', 0.35);
      const dot = (x: number, y: number, r: number, col: string) => {
        ctx.fillStyle = col;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = knot;
        ctx.beginPath();
        ctx.arc(x, y, r * 0.38, 0, Math.PI * 2);
        ctx.fill();
      };
      const ring = (cx: number, cy: number, rad: number, n: number, r: number, col: string, phase = 0) => {
        for (let k = 0; k < n; k++) {
          const a = phase + (k / n) * Math.PI * 2;
          dot(cx + Math.cos(a) * rad, cy + Math.sin(a) * rad, r, col);
        }
      };
      const step = 64 * s;
      for (let row = -1; row <= 8; row++)
        for (let col = -1; col <= 8; col++) {
          const cx = (col + (row % 2 ? 0.5 : 0)) * step + step / 2;
          const cy = row * step + step / 2;
          ring(cx, cy, 3.4 * s, 4, 1.9 * s, zari, Math.PI / 4);
          ring(cx, cy, 10 * s, 10, 1.6 * s, yellow);
          ring(cx, cy, 19 * s, 16, 1.5 * s, zari, Math.PI / 16);
          // a 3-dot cluster in the gap to the next flower
          const gx = cx + step / 2, gy = cy + step / 2;
          ring(gx, gy, 3 * s, 3, 1.4 * s, zari, -Math.PI / 2);
        }
      break;
    }
    case 'Leheriya': {
      // Leheriya: diagonal stripes of resist-dyed colour with a small ripple (lehar) along
      // each edge, separated by thin lines of the ground colour.
      const cols = ['--pitambar', '--pigment-leheriya-mint', '--gold-300', '--pigment-leheriya-green'].map((t) => getThemeColor(t));
      const band = 16 * s;
      ctx.save();
      ctx.translate(size / 2, size / 2);
      ctx.rotate(-Math.PI / 4);
      ctx.translate(-size, -size);
      const edge = (y0: number, x: number) => y0 + Math.sin(x / (9 * s)) * 1.8 * s;
      for (let i = 0; i * band < size * 2; i++) {
        const y0 = i * band;
        ctx.fillStyle = cols[i % cols.length];
        ctx.beginPath();
        ctx.moveTo(0, edge(y0, 0));
        for (let x = 0; x <= size * 2; x += 3 * s) ctx.lineTo(x, edge(y0, x));
        for (let x = size * 2; x >= 0; x -= 3 * s) ctx.lineTo(x, edge(y0 + band - 2.2 * s, x));
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
      break;
    }
  }
  return c;
}

const cache = new Map<string, HTMLCanvasElement>();
const memo = (key: string, draw: () => HTMLCanvasElement) => {
  let c = cache.get(key);
  if (!c) {
    c = draw();
    cache.set(key, c);
  }
  return c;
};

export const fabricCanvas = (kind: FabricKind, base: string, size = 512) => memo(`fabric|${kind}|${base}|${size}`, () => drawFabric(kind, base, size));

/** Saree body for the six-yard ribbon: Banarasi field with a zari border along both edges. */
export const sareeCanvas = (size = 1024) =>
  memo(`saree|${size}`, () => {
  const [c, ctx] = make(size, size / 4);
  const f = fabricCanvas('Banarasi', getThemeColor('--pigment-banarasi'), 256);
  ctx.fillStyle = ctx.createPattern(f, 'repeat')!;
  ctx.fillRect(0, 0, c.width, c.height);
  const band = (y: number, h: number) => {
    ctx.fillStyle = goldFill(ctx, 0, y, 0, y + h);
    ctx.fillRect(0, y, c.width, h);
    ctx.fillStyle = themeColor('--pigment-banarasi', 0.9);
    for (let x = 0; x < c.width; x += 18) ctx.fillRect(x, y + h * 0.35, 8, h * 0.3);
  };
  band(0, 22);
  band(c.height - 22, 22);
    return c;
  });

/** Peacock feather (mor pankh): rachis, barbs and the eye, with alpha. */
export const featherCanvas = () =>
  memo('feather', () => {
  const [c, ctx] = make(512, 1024);
  const cx = 256;
  // barbs
  for (let i = 0; i < 260; i++) {
    const y = 1000 - i * 3.6;
    const len = 60 + Math.sin((i / 260) * Math.PI) * 170;
    const a = 0.55 + (i / 260) * 0.35;
    for (const dir of [-1, 1]) {
      const g = ctx.createLinearGradient(cx, y, cx + dir * len, y - len * a);
      g.addColorStop(0, themeColor('--pigment-peacock-bronze', 0.9));
      g.addColorStop(0.5, themeColor('--pigment-peacock-teal', 0.55));
      g.addColorStop(1, themeColor('--mor', 0));
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
    [150, 200, themeColor('--pigment-peacock-leaf', 0.85)],
    [118, 160, themeColor('--gold-500', 0.95)],
    [96, 128, themeColor('--mor', 1)],
    [70, 96, themeColor('--pigment-peacock-sky', 1)],
    [44, 60, themeColor('--pigment-peacock-deep', 1)],
  ];
  rings.forEach(([rx, ry, col]) => {
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.ellipse(cx, 220, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
  });
    return c;
  });

/** Terracotta with painted gold bands for the matki. */
export const matkiCanvas = () =>
  memo('matki', () => {
  const [c, ctx] = make(512, 512);
  const g = ctx.createLinearGradient(0, 0, 0, 512);
  g.addColorStop(0, getThemeColor('--pigment-clay'));
  g.addColorStop(1, getThemeColor('--pigment-clay-deep'));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 3000; i++) {
    ctx.fillStyle = themeColor('--raat', Math.random() * 0.08);
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
    return c;
  });

/** Soft round sprite for fake glows (tier 2). */
export const glowCanvas = () =>
  memo('glow', () => {
  const [c, ctx] = make(128, 128);
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, themeColor('--gold-100', 1));
  g.addColorStop(0.3, themeColor('--gold-300', 0.45));
  g.addColorStop(1, themeColor('--gold-300', 0));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
    return c;
  });

/** Draw every canvas the film needs, one per idle slice, in the order the shots appear. */
export function prewarmCanvases() {
  const jobs: (() => unknown)[] = [
    ...WEAVE_FABRICS.map((f) => () => fabricCanvas(f.kind, f.base, 512)),
    () => fabricCanvas('Banarasi', getThemeColor('--pigment-banarasi'), 256),
    () => sareeCanvas(1024),
    () => featherCanvas(),
    () => fabricCanvas('Chanderi', getThemeColor('--pigment-chanderi'), 512),
    () => matkiCanvas(),
    () => glowCanvas(),
  ];
  const ric = (window.requestIdleCallback ?? ((cb: IdleRequestCallback) => window.setTimeout(() => cb({ didTimeout: true, timeRemaining: () => 0 } as IdleDeadline), 60))) as typeof window.requestIdleCallback;
  const next = () => {
    const job = jobs.shift();
    if (!job) return;
    ric(() => {
      job();
      next();
    }, { timeout: 2000 });
  };
  next();
}
