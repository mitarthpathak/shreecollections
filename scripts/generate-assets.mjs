// Procedural placeholder art for Shree Collection.
// Generates, for every product in data/products.json:
//   public/products/<slug>/1.webp  hanging drape (saree) or garment flat (suit)
//   public/products/<slug>/2.webp  fabric close-up with zari border
//   public/products/<slug>/3.webp  folded stack
//   public/products/<slug>/fabric.webp  512px seamless tile for the 3D cloth viewer
// plus public/lookbook/look-<n>.webp.
// Replace any file with a real photograph of the same name and nothing else changes.
// Run: node scripts/generate-assets.mjs
import { mkdirSync, readFileSync } from 'node:fs';
import sharp from 'sharp';

const root = new URL('../', import.meta.url);
const products = JSON.parse(readFileSync(new URL('data/products.json', root), 'utf8'));

// 4:5, the shape of the product photos (docs/photo-guide.md).
const W = 960;
const H = 1200;
/** Product placeholders sit on an ivory wall: lighter floor shadows and arch (see wrap). */
let PAPER = false;
const shadowA = (a) => (PAPER ? +(a * 0.4).toFixed(2) : a);

const GOLD = { g100: '#FFF1C1', g300: '#E9C46A', g500: '#C9962E', g700: '#8A6418' };

// ---------- tiny utils ----------
function rng(seed) {
  let a = 0;
  for (const c of seed) a = (Math.imul(a ^ c.charCodeAt(0), 2654435761) + 1) >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const hex2rgb = (h) => {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const rgb2hex = (r, g, b) => '#' + [r, g, b].map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('');
const mix = (a, b, t) => {
  const A = hex2rgb(a), B = hex2rgb(b);
  return rgb2hex(A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t);
};
const lum = (h) => {
  const [r, g, b] = hex2rgb(h);
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
};
const shade = (h, t) => (t < 0 ? mix(h, '#000000', -t) : mix(h, '#ffffff', t));

// Accent ink per fabric: what the motifs are drawn in.
function inkFor(p) {
  if (p.fabric === 'Bandhani') return lum(p.colorHex) > 0.6 ? '#8C1A2B' : '#F7E7B4';
  if (p.fabric === 'Leheriya') return lum(p.colorHex) > 0.55 ? '#B3122B' : '#F2B705';
  if (p.fabric === 'Cotton') return lum(p.colorHex) > 0.6 ? '#2E3A6B' : '#F3EAD8';
  return GOLD.g300;
}

// ---------- shared defs ----------
const goldDefs = `
  <linearGradient id="gold" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="${GOLD.g100}"/>
    <stop offset="0.35" stop-color="${GOLD.g300}"/>
    <stop offset="0.7" stop-color="${GOLD.g500}"/>
    <stop offset="1" stop-color="${GOLD.g700}"/>
  </linearGradient>
  <linearGradient id="goldH" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0" stop-color="${GOLD.g700}"/>
    <stop offset="0.25" stop-color="${GOLD.g300}"/>
    <stop offset="0.5" stop-color="${GOLD.g100}"/>
    <stop offset="0.75" stop-color="${GOLD.g300}"/>
    <stop offset="1" stop-color="${GOLD.g700}"/>
  </linearGradient>
  <radialGradient id="bg" cx="0.5" cy="0.38" r="0.75">
    <stop offset="0" stop-color="#2a1d12"/>
    <stop offset="0.55" stop-color="#120E0A"/>
    <stop offset="1" stop-color="#07060A"/>
  </radialGradient>
  <radialGradient id="paper" cx="0.5" cy="0.36" r="0.8">
    <stop offset="0" stop-color="#F7F0E2"/>
    <stop offset="0.6" stop-color="#EFE4CF"/>
    <stop offset="1" stop-color="#E2D3B6"/>
  </radialGradient>
  <radialGradient id="spot" cx="0.5" cy="0.3" r="0.6">
    <stop offset="0" stop-color="#FFE7B0" stop-opacity="0.22"/>
    <stop offset="1" stop-color="#FFE7B0" stop-opacity="0"/>
  </radialGradient>
  <linearGradient id="floorShadow" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#000" stop-opacity="0"/>
    <stop offset="1" stop-color="#000" stop-opacity="0.65"/>
  </linearGradient>
  <filter id="soft" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="14"/></filter>
  <filter id="grain" x="0" y="0" width="100%" height="100%">
    <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="7" result="n"/>
    <feColorMatrix type="saturate" values="0"/>
    <feComponentTransfer><feFuncA type="table" tableValues="0 0.07"/></feComponentTransfer>
  </filter>`;

// A kairi (paisley) path centred near the origin, ~56px tall.
const PAISLEY = 'M2,-28 C20,-26 26,-4 16,12 C8,25 -12,28 -18,14 C-23,3 -15,-8 -5,-6 C3,-4 4,5 -2,8 C-7,10 -10,4 -7,1 M2,-28 C-6,-26 -9,-34 -4,-38';

// ---------- fabric patterns (tile sizes divide 512 so fabric.webp is seamless) ----------
function patternDef(p, id = 'fab') {
  const base = p.colorHex;
  const ink = inkFor(p);
  const r = rng(p.slug);
  const dark = shade(base, -0.25);
  switch (p.fabric) {
    case 'Banarasi': {
      const t = 128;
      const butta = (x, y, s) => `<g transform="translate(${x},${y}) scale(${s})"><path d="${PAISLEY}" fill="url(#gold)" stroke="${GOLD.g700}" stroke-width="1.4"/><circle cx="1" cy="-4" r="3.2" fill="${shade(base, -0.1)}"/></g>`;
      return `<pattern id="${id}" width="${t}" height="${t}" patternUnits="userSpaceOnUse">
        <rect width="${t}" height="${t}" fill="${base}"/>
        <path d="M0,${t / 2} L${t / 2},0 L${t},${t / 2} L${t / 2},${t} Z" fill="none" stroke="${dark}" stroke-width="2" opacity="0.6"/>
        ${butta(t / 2, t / 2 + 6, 0.95)}
        ${butta(0, 6, 0.6)}${butta(t, 6, 0.6)}${butta(0, t + 6, 0.6)}${butta(t, t + 6, 0.6)}
        <circle cx="${t / 4}" cy="${t / 4}" r="2.2" fill="${GOLD.g300}"/><circle cx="${(3 * t) / 4}" cy="${(3 * t) / 4}" r="2.2" fill="${GOLD.g300}"/>
        <circle cx="${(3 * t) / 4}" cy="${t / 4}" r="2.2" fill="${GOLD.g300}"/><circle cx="${t / 4}" cy="${(3 * t) / 4}" r="2.2" fill="${GOLD.g300}"/>
      </pattern>`;
    }
    case 'Chanderi': {
      const t = 64;
      const coin = (x, y) => `<circle cx="${x}" cy="${y}" r="4.2" fill="url(#gold)"/><circle cx="${x}" cy="${y}" r="7" fill="none" stroke="${GOLD.g500}" stroke-width="0.8" opacity="0.7"/>`;
      let lines = '';
      for (let i = 0; i < t; i += 4) lines += `<line x1="${i}" y1="0" x2="${i}" y2="${t}" stroke="#fff" stroke-opacity="0.05"/>`;
      return `<pattern id="${id}" width="${t}" height="${t}" patternUnits="userSpaceOnUse">
        <rect width="${t}" height="${t}" fill="${base}"/>${lines}
        ${coin(t / 4, t / 4)}${coin((3 * t) / 4, (3 * t) / 4)}
      </pattern>`;
    }
    case 'Bandhani': {
      const t = 64;
      const cluster = (cx, cy, s) => {
        let o = '';
        for (let k = 0; k < 8; k++) {
          const a = (k / 8) * Math.PI * 2;
          o += `<circle cx="${(cx + Math.cos(a) * 7 * s).toFixed(1)}" cy="${(cy + Math.sin(a) * 7 * s).toFixed(1)}" r="${2.1 * s}" fill="${ink}"/>`;
        }
        return o + `<circle cx="${cx}" cy="${cy}" r="${2.6 * s}" fill="${ink}"/><circle cx="${cx}" cy="${cy}" r="${1.1 * s}" fill="${dark}"/>`;
      };
      let dots = '';
      for (let i = 0; i < 6; i++) dots += `<circle cx="${(r() * t).toFixed(1)}" cy="${(r() * t).toFixed(1)}" r="1.3" fill="${ink}" opacity="0.8"/>`;
      return `<pattern id="${id}" width="${t}" height="${t}" patternUnits="userSpaceOnUse">
        <rect width="${t}" height="${t}" fill="${base}"/>
        ${cluster(t / 4, t / 4, 1)}${cluster((3 * t) / 4, (3 * t) / 4, 1)}${dots}
      </pattern>`;
    }
    case 'Leheriya': {
      const t = 64;
      const c2 = ink;
      const c3 = shade(base, 0.25);
      // Diagonal wavy bands, drawn with offset copies so the tile is seamless.
      const band = (off, w, col) => {
        let d = '';
        for (const k of [-t, 0, t]) {
          const o = off + k;
          d += `<path d="M${o - 8},-8 Q${o + 8},${t / 4} ${o + t / 2},${t / 2} T${o + t + 8},${t + 8} L${o + t + 8 + w},${t + 8} Q${o + t / 2 + w + 8},${(3 * t) / 4} ${o + t / 2 + w},${t / 2} T${o - 8 + w},-8 Z" fill="${col}"/>`;
        }
        return d;
      };
      return `<pattern id="${id}" width="${t}" height="${t}" patternUnits="userSpaceOnUse">
        <rect width="${t}" height="${t}" fill="${base}"/>
        ${band(0, 12, c2)}${band(22, 6, c3)}${band(36, 3, GOLD.g300)}
      </pattern>`;
    }
    case 'Cotton': {
      const t = 64;
      if (p.slug.includes('kota')) {
        return `<pattern id="${id}" width="${t}" height="${t}" patternUnits="userSpaceOnUse">
          <rect width="${t}" height="${t}" fill="${base}"/>
          <rect x="0" y="0" width="${t}" height="5" fill="${shade(base, 0.35)}"/><rect x="0" y="0" width="5" height="${t}" fill="${shade(base, 0.35)}"/>
          <rect x="${t / 2}" y="0" width="1.5" height="${t}" fill="${GOLD.g300}" opacity="0.7"/><rect x="0" y="${t / 2}" width="${t}" height="1.5" fill="${GOLD.g300}" opacity="0.7"/>
        </pattern>`;
      }
      const flower = (x, y, s) => {
        let o = '';
        for (let k = 0; k < 6; k++) o += `<ellipse cx="${x}" cy="${y - 6 * s}" rx="${2.6 * s}" ry="${5.5 * s}" transform="rotate(${k * 60} ${x} ${y})" fill="${ink}"/>`;
        return o + `<circle cx="${x}" cy="${y}" r="${2.2 * s}" fill="${base}"/>`;
      };
      return `<pattern id="${id}" width="${t}" height="${t}" patternUnits="userSpaceOnUse">
        <rect width="${t}" height="${t}" fill="${base}"/>
        ${flower(t / 4, t / 4, 1.1)}${flower((3 * t) / 4, (3 * t) / 4, 1.1)}
        <circle cx="${(3 * t) / 4}" cy="${t / 4}" r="1.8" fill="${ink}" opacity="0.7"/><circle cx="${t / 4}" cy="${(3 * t) / 4}" r="1.8" fill="${ink}" opacity="0.7"/>
      </pattern>`;
    }
    case 'Georgette': {
      const t = 128;
      let seq = '';
      const n = p.occasion.includes('party') ? 26 : 10;
      for (let i = 0; i < n; i++) {
        const x = r() * t, y = r() * t, s = 1.5 + r() * 2.2;
        for (const [dx, dy] of [[0, 0], [t, 0], [-t, 0], [0, t], [0, -t]]) {
          seq += `<circle cx="${(x + dx).toFixed(1)}" cy="${(y + dy).toFixed(1)}" r="${s.toFixed(1)}" fill="url(#gold)"/>`;
        }
      }
      return `<pattern id="${id}" width="${t}" height="${t}" patternUnits="userSpaceOnUse">
        <rect width="${t}" height="${t}" fill="${base}"/>
        <path d="M0,${t * 0.3} C${t * 0.3},${t * 0.2} ${t * 0.6},${t * 0.45} ${t},${t * 0.3}" stroke="#fff" stroke-opacity="0.05" stroke-width="10" fill="none"/>
        <path d="M0,${t * 0.8} C${t * 0.3},${t * 0.7} ${t * 0.6},${t * 0.95} ${t},${t * 0.8}" stroke="#000" stroke-opacity="0.08" stroke-width="12" fill="none"/>
        ${seq}
      </pattern>`;
    }
    default: {
      // Silk, velvet, linen and other weaves: tone-on-tone lozenges with a gold seed.
      const t = 64;
      return `<pattern id="${id}" width="${t}" height="${t}" patternUnits="userSpaceOnUse">
        <rect width="${t}" height="${t}" fill="${base}"/>
        <path d="M${t / 2},6 L${t - 6},${t / 2} L${t / 2},${t - 6} L6,${t / 2} Z" fill="none" stroke="${shade(base, 0.12)}" stroke-width="2"/>
        <path d="M${t / 2},18 L${t - 18},${t / 2} L${t / 2},${t - 18} L18,${t / 2} Z" fill="${shade(base, -0.12)}"/>
        <circle cx="${t / 2}" cy="${t / 2}" r="3" fill="${GOLD.g300}"/>
        <circle cx="0" cy="0" r="2" fill="${GOLD.g500}"/><circle cx="${t}" cy="0" r="2" fill="${GOLD.g500}"/><circle cx="0" cy="${t}" r="2" fill="${GOLD.g500}"/><circle cx="${t}" cy="${t}" r="2" fill="${GOLD.g500}"/>
      </pattern>`;
    }
  }
}

// A woven zari border band: horizontal, height h, across width w at (x,y).
function zariBand(x, y, w, h, p, id = 'band') {
  const base = shade(p.colorHex, -0.35);
  const motifs = [];
  const step = h * 0.9;
  for (let mx = x + step / 2; mx < x + w; mx += step) {
    motifs.push(`<path d="M${mx},${y + h * 0.3} L${mx + h * 0.18},${y + h * 0.5} L${mx},${y + h * 0.7} L${mx - h * 0.18},${y + h * 0.5} Z" fill="url(#gold)"/>`);
  }
  return `<g id="${id}">
    <rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${base}"/>
    <rect x="${x}" y="${y + h * 0.06}" width="${w}" height="${h * 0.12}" fill="url(#goldH)"/>
    <rect x="${x}" y="${y + h * 0.82}" width="${w}" height="${h * 0.12}" fill="url(#goldH)"/>
    <rect x="${x}" y="${y + h * 0.22}" width="${w}" height="${h * 0.56}" fill="${GOLD.g700}" opacity="0.35"/>
    ${motifs.join('')}
  </g>`;
}

// Vertical drape folds as a translucent overlay.
function foldsGradient(id, seed, n = 9, strength = 0.42) {
  const r = rng(seed);
  let stops = '';
  for (let i = 0; i <= n; i++) {
    const o = i / n;
    const dark = i % 2 === 0;
    const a = dark ? strength * (0.6 + r() * 0.4) : 0.05 + r() * 0.05;
    stops += `<stop offset="${o.toFixed(3)}" stop-color="${dark ? '#000' : '#fff'}" stop-opacity="${a.toFixed(3)}"/>`;
  }
  return `<linearGradient id="${id}" x1="0" y1="0" x2="1" y2="0">${stops}</linearGradient>`;
}

function frame() {
  const i = 26;
  const corner = (x, y, rot) => `<g transform="translate(${x},${y}) rotate(${rot})"><path d="M0,0 L22,0 M0,0 L0,22" stroke="url(#gold)" stroke-width="3"/><path d="M8,8 L14,2 L20,8 L14,14 Z" fill="url(#gold)"/></g>`;
  return `<rect x="${i}" y="${i}" width="${W - 2 * i}" height="${H - 2 * i}" fill="none" stroke="url(#gold)" stroke-width="2"/>
    <rect x="${i + 10}" y="${i + 10}" width="${W - 2 * i - 20}" height="${H - 2 * i - 20}" fill="none" stroke="${GOLD.g500}" stroke-width="0.8" opacity="0.6"/>
    ${corner(i + 6, i + 6, 0)}${corner(W - i - 6, i + 6, 90)}${corner(W - i - 6, H - i - 6, 180)}${corner(i + 6, H - i - 6, 270)}`;
}

// A jharokha arch outline behind the garment.
function arch() {
  const x0 = 140, x1 = W - 140, top = 150, bottom = H - 120, mid = W / 2;
  const d = `M${x0},${bottom} L${x0},${top + 260} C${x0},${top + 120} ${mid - 140},${top + 60} ${mid},${top} C${mid + 140},${top + 60} ${x1},${top + 120} ${x1},${top + 260} L${x1},${bottom}`;
  return `<path d="${d}" fill="#000" fill-opacity="${PAPER ? 0.04 : 0.25}" stroke="${GOLD.g500}" stroke-opacity="0.45" stroke-width="2"/>
    <path d="${d}" transform="translate(${W / 2},${H / 2}) scale(0.96) translate(${-W / 2},${-H / 2})" fill="none" stroke="${GOLD.g700}" stroke-opacity="0.5" stroke-width="1"/>`;
}

/**
 * Lookbook art: the dark studio with a gold frame. Product placeholders (`paper: true`): the
 * piece on an ivory wall in daylight, no frame — the way the real product photos are shot
 * (docs/photo-guide.md), so placeholders and photos sit together in both themes.
 */
function wrap(inner, defs = '', { paper = false } = {}) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>${goldDefs}${defs}</defs>
  <rect width="${W}" height="${H}" fill="url(#${paper ? 'paper' : 'bg'})"/>
  ${paper ? '' : `<rect width="${W}" height="${H}" fill="url(#spot)"/>`}
  ${inner}
  <rect width="${W}" height="${H}" filter="url(#grain)"/>
  ${paper ? '' : frame()}
</svg>`;
}

// ---------- compositions ----------
function hangingSaree(p, ox = 0, scale = 1, idp = '') {
  // Fabric hung from a gold rod, falling in folds, with a wavy hem and a zari pallu band.
  const cx = (W - 900) / 2; // drawn on a 900px-wide grid; centre it on the canvas
  const L = 210 * scale + ox + cx, R = 690 * scale + ox + cx;
  const top = 230 * scale + (1 - scale) * 200, hem = top + 760 * scale;
  const r = rng(p.slug + 'hem' + idp);
  let hemPath = `L${R},${hem}`;
  const n = 7;
  for (let i = n; i > 0; i--) {
    const x = L + ((R - L) * (i - 0.5)) / n;
    const y = hem + (i % 2 ? 26 : -6) * scale + r() * 10;
    hemPath += ` Q${x},${y} ${L + ((R - L) * (i - 1)) / n},${hem}`;
  }
  const body = `M${L},${top} L${R},${top} ${hemPath} Z`;
  const bandY = hem - 150 * scale;
  return `
    <defs>${patternDef(p, 'fab' + idp)}${foldsGradient('folds' + idp, p.slug, 11)}
      <linearGradient id="rodShade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#000" stop-opacity="0.45"/><stop offset="1" stop-color="#000" stop-opacity="0"/></linearGradient>
      <clipPath id="clip${idp}"><path d="${body}"/></clipPath></defs>
    <ellipse cx="${(L + R) / 2}" cy="${hem + 40 * scale}" rx="${(R - L) * 0.55}" ry="${26 * scale}" fill="#000" opacity="${shadowA(0.6)}" filter="url(#soft)"/>
    <g clip-path="url(#clip${idp})">
      <rect x="${L - 20}" y="${top}" width="${R - L + 40}" height="${hem - top + 60}" fill="url(#fab${idp})"/>
      ${zariBand(L - 20, bandY, R - L + 40, 120 * scale, p, 'band' + idp)}
      <rect x="${R - 46 * scale}" y="${top}" width="${46 * scale}" height="${hem - top + 60}" fill="${shade(p.colorHex, -0.35)}"/>
      <rect x="${R - 40 * scale}" y="${top}" width="${8 * scale}" height="${hem - top + 60}" fill="url(#gold)"/>
      <rect x="${L - 20}" y="${top}" width="${R - L + 40}" height="${hem - top + 60}" fill="url(#folds${idp})"/>
      <rect x="${L - 20}" y="${top}" width="${R - L + 40}" height="${120 * scale}" fill="url(#rodShade)"/>
    </g>
    <rect x="${L - 40 * scale}" y="${top - 14 * scale}" width="${R - L + 80 * scale}" height="${16 * scale}" rx="${8 * scale}" fill="url(#goldH)"/>
    <circle cx="${L - 40 * scale}" cy="${top - 6 * scale}" r="${13 * scale}" fill="url(#gold)"/><circle cx="${R + 40 * scale}" cy="${top - 6 * scale}" r="${13 * scale}" fill="url(#gold)"/>`;
}

function garmentPaths(p) {
  const sub = p.subcategory;
  if (sub === 'Anarkali') {
    return {
      body: 'M405,240 Q450,288 495,240 L548,252 L615,470 L568,484 L516,332 L506,420 C566,600 646,850 664,1000 Q450,1046 236,1000 C254,850 334,600 394,420 L384,332 L332,484 L285,470 L352,252 Z',
      waist: 420, hem: 1000, legs: 'M418,1010 L482,1010 L474,1140 L428,1140 Z', kalis: true,
    };
  }
  if (sub === 'Sharara') {
    return {
      body: 'M405,240 Q450,288 495,240 L548,252 L612,470 L566,484 L516,332 L512,440 L548,640 Q450,662 352,640 L388,440 L384,332 L334,484 L288,470 L352,252 Z',
      waist: 440, hem: 650,
      legs: 'M392,640 L508,640 C540,760 600,960 660,1130 L470,1130 L450,800 L430,1130 L240,1130 C300,960 360,760 392,640 Z',
    };
  }
  if (sub === 'Co-ord') {
    return {
      body: 'M408,236 L450,290 L492,236 L552,250 L624,520 L574,532 L522,350 L534,740 Q450,756 366,740 L378,350 L326,532 L276,520 L348,250 Z',
      waist: 0, hem: 740, collar: true,
      legs: 'M374,736 L526,736 L540,1136 L466,1136 L450,820 L434,1136 L360,1136 Z',
    };
  }
  return {
    body: 'M405,240 Q450,288 495,240 L548,252 L612,470 L566,484 L516,332 L524,560 L572,900 Q450,916 328,900 L376,560 L384,332 L334,484 L288,470 L352,252 Z',
    waist: 0, hem: 900,
    legs: 'M386,896 L514,896 C530,980 524,1060 506,1136 L460,1136 L450,970 L440,1136 L394,1136 C376,1060 370,980 386,896 Z',
  };
}

function garmentFlat(p) {
  if (!p.stitched) return foldedStack([p, p, p], true);
  const g = garmentPaths(p);
  const legFill = shade(p.colorHex, p.subcategory === 'Sharara' || p.subcategory === 'Co-ord' ? 0 : -0.3);
  let kalis = '';
  if (g.kalis) {
    for (let i = -6; i <= 6; i++) kalis += `<line x1="${450 + i * 8}" y1="${g.waist}" x2="${450 + i * 36}" y2="${g.hem + 30}" stroke="#000" stroke-opacity="${i % 2 ? 0.22 : 0.08}" stroke-width="${i % 2 ? 10 : 4}"/>`;
  }
  return `
    <defs>${patternDef(p)}${foldsGradient('folds', p.slug, 9, 0.3)}
      <clipPath id="g"><path d="${g.body}"/></clipPath>
      <clipPath id="legs"><path d="${g.legs}"/></clipPath>
      <linearGradient id="sheen" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity="0.16"/><stop offset="0.5" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.3"/></linearGradient>
    </defs>
    ${arch()}
    <ellipse cx="${W / 2}" cy="1150" rx="250" ry="22" fill="#000" opacity="${shadowA(0.7)}" filter="url(#soft)"/>
    <g transform="translate(${(W - 900) / 2} 0)">
    <g clip-path="url(#legs)"><rect x="200" y="600" width="500" height="560" fill="${p.subcategory === 'Sharara' || p.subcategory === 'Co-ord' ? 'url(#fab)' : legFill}"/><rect x="200" y="600" width="500" height="560" fill="url(#folds)"/></g>
    <g clip-path="url(#g)">
      <rect x="200" y="200" width="500" height="900" fill="url(#fab)"/>
      ${kalis}
      ${g.waist ? `<rect x="200" y="${g.waist - 8}" width="500" height="16" fill="url(#goldH)"/>` : ''}
      ${zariBand(200, g.hem - 54, 500, 60, p)}
      <rect x="200" y="200" width="500" height="900" fill="url(#sheen)"/>
    </g>
    <path d="${g.collar ? 'M408,236 L450,290 L492,236' : 'M405,240 Q450,288 495,240'}" fill="none" stroke="url(#gold)" stroke-width="7" stroke-linecap="round"/>
    <path d="${g.body}" fill="none" stroke="${GOLD.g700}" stroke-opacity="0.6" stroke-width="1.5"/>
    <path d="M352,252 C300,420 282,700 316,1010 L384,1020 C350,720 364,440 404,262 Z" fill="${mix(p.colorHex, GOLD.g300, 0.25)}" fill-opacity="0.5"/>
    <path d="M352,252 C300,420 282,700 316,1010" fill="none" stroke="url(#gold)" stroke-width="3"/>
    <path d="M404,262 C364,440 350,720 384,1020" fill="none" stroke="url(#gold)" stroke-width="2" stroke-dasharray="3 7"/>
    <path d="M316,1010 L384,1020" stroke="url(#gold)" stroke-width="6"/>
    </g>
  `;
}

function fabricDetail(p) {
  return `
    <defs>${patternDef(p)}${foldsGradient('folds', p.slug + 'd', 7, 0.5)}
      <linearGradient id="diag" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity="0.18"/><stop offset="0.45" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.55"/></linearGradient>
    </defs>
    <g transform="rotate(-8 450 600)">
      <rect x="-200" y="-200" width="1300" height="1600" fill="url(#fab)" transform="scale(1.6) translate(-120 -120)"/>
      ${zariBand(-200, 780, 1300, 190, p)}
      <rect x="-200" y="-200" width="1300" height="1600" fill="url(#folds)"/>
    </g>
    <rect width="${W}" height="${H}" fill="url(#diag)"/>`;
}

function foldedStack(list, unstitched = false) {
  const n = list.length;
  let out = `<defs>`;
  list.forEach((p, i) => (out += patternDef(p, 'fab' + i)));
  out += `</defs>${arch()}`;
  const w = 640, h = 150;
  list.forEach((p, i) => {
    const x = (W - w) / 2 + (i % 2 ? 16 : -12);
    const y = 900 - (i + 1) * (h + 12) + (n < 4 ? -40 : 150);
    out += `
      <ellipse cx="${x + w / 2}" cy="${y + h + 8}" rx="${w * 0.52}" ry="14" fill="#000" opacity="${shadowA(0.55)}" filter="url(#soft)"/>
      <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="10" fill="url(#fab${i})"/>
      ${zariBand(x, y + h - 34, w, 34, p, 'b' + i)}
      <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="10" fill="url(#bg)" opacity="0.18"/>
      <rect x="${x}" y="${y}" width="${w}" height="${h * 0.3}" rx="10" fill="#fff" opacity="0.08"/>
      <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="10" fill="none" stroke="#000" stroke-opacity="0.4"/>`;
  });
  if (unstitched) {
    out += `<path d="M330,330 L570,330 L570,1000" fill="none" stroke="url(#gold)" stroke-width="5" opacity="0.0"/>`;
  }
  return out;
}

function lookbook(i, all) {
  const pick = (k) => all[(i * 5 + k * 7) % all.length];
  const kind = i % 4;
  if (kind === 0) {
    // Three sarees hanging side by side.
    const a = pick(0), b = pick(1), c = pick(2);
    return wrap(`${hangingSaree(a, -250, 0.62, 'a')}${hangingSaree(b, 90, 0.62, 'b')}${hangingSaree(c, 430, 0.62, 'c')}`);
  }
  if (kind === 1) return wrap(foldedStack([pick(0), pick(1), pick(2), pick(3), pick(4)]));
  if (kind === 2) {
    const p = pick(0);
    let bokeh = '';
    const r = rng('bokeh' + i);
    for (let k = 0; k < 16; k++) bokeh += `<circle cx="${(r() * W).toFixed(0)}" cy="${(r() * 500).toFixed(0)}" r="${(10 + r() * 34).toFixed(0)}" fill="${GOLD.g300}" opacity="${(0.08 + r() * 0.2).toFixed(2)}" filter="url(#soft)"/>`;
    return wrap(`${fabricDetail(p)}${bokeh}`);
  }
  const s = all.filter((p) => p.category === 'suit' && p.stitched)[i % 8];
  return wrap(garmentFlat(s));
}

async function write(svg, path, w = W, h = H) {
  await sharp(Buffer.from(svg), { density: 96 }).resize(w, h).webp({ quality: 80, effort: 5 }).toFile(path);
}

async function main() {
  PAPER = true;
  for (const p of products) {
    const dir = new URL(`public/products/${p.slug}/`, root);
    mkdirSync(dir, { recursive: true });
    const first = p.category === 'saree' ? hangingSaree(p) : garmentFlat(p);
    const paper = { paper: true };
    await write(wrap(first, '', paper), new URL('1.webp', dir).pathname);
    await write(wrap(fabricDetail(p), '', paper), new URL('2.webp', dir).pathname);
    await write(wrap(foldedStack([p, { ...p, colorHex: shade(p.colorHex, -0.15), slug: p.slug + 'x' }, p]), '', paper), new URL('3.webp', dir).pathname);
    const tile = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512"><defs>${goldDefs}${patternDef(p)}</defs><rect width="512" height="512" fill="url(#fab)"/></svg>`;
    await write(tile, new URL('fabric.webp', dir).pathname, 512, 512);
    process.stdout.write('.');
  }
  // `npm run assets -- --products-only` leaves the lookbook images as they are.
  PAPER = false;
  if (process.argv.includes('--products-only')) return console.log('\nDone (products only)');
  const lb = new URL('public/lookbook/', root);
  mkdirSync(lb, { recursive: true });
  for (let i = 0; i < 8; i++) await write(lookbook(i, products), new URL(`look-${i + 1}.webp`, lb).pathname);
  console.log('\nDone');
}

main();
