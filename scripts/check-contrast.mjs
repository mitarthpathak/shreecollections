// WCAG contrast check for the colour tokens in src/app/globals.css, in both themes.
// Text tokens need 4.5:1 on every background they can sit on (page, surfaces and every
// chapter tint); input borders, chips and focus rings need 3:1. Exits non-zero on a failure.
//
//   npm run check:contrast
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../src/app/globals.css', import.meta.url), 'utf8');

/** Declarations of the first rule whose selector matches `selector` (outside comments). */
function block(selector) {
  const clean = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const at = clean.indexOf(selector);
  if (at < 0) throw new Error(`No rule for ${selector}`);
  const open = clean.indexOf('{', at);
  let depth = 0;
  let end = open;
  for (let i = open; i < clean.length; i++) {
    if (clean[i] === '{') depth++;
    if (clean[i] === '}' && --depth === 0) {
      end = i;
      break;
    }
  }
  const out = {};
  for (const m of clean.slice(open + 1, end).matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) out[m[1]] = m[2].trim();
  return out;
}

const light = block(':root {');
const darkMedia = block(":root:not([data-theme='light'])");
const darkAttr = block(":root[data-theme='dark']");

let failures = 0;
const fail = (msg) => {
  failures++;
  console.log(`  FAIL  ${msg}`);
};

// The two dark blocks must not drift apart.
for (const k of new Set([...Object.keys(darkMedia), ...Object.keys(darkAttr)])) {
  if (darkMedia[k] !== darkAttr[k]) fail(`dark blocks differ on ${k}: "${darkMedia[k]}" vs "${darkAttr[k]}"`);
}

const theme = (overrides) => ({ ...light, ...overrides });
const themes = { light: theme({}), dark: theme(darkAttr) };

function resolve(vars, value, seen = new Set()) {
  const m = value.match(/^var\((--[\w-]+)\)$/);
  if (!m) return value;
  if (seen.has(m[1])) throw new Error(`Cycle at ${m[1]}`);
  seen.add(m[1]);
  if (!(m[1] in vars)) throw new Error(`Unknown token ${m[1]}`);
  return resolve(vars, vars[m[1]], seen);
}

function rgb(hex) {
  const h = hex.replace('#', '');
  const f = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  if (!/^[0-9a-f]{6}$/i.test(f)) return null;
  return [0, 2, 4].map((i) => parseInt(f.slice(i, i + 2), 16));
}
const lum = ([r, g, b]) => {
  const c = (v) => {
    v /= 255;
    return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * c(r) + 0.7152 * c(g) + 0.0722 * c(b);
};
const ratio = (a, b) => {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};

const BACKGROUNDS = ['--bg', '--surface', '--surface-2', '--tint-neel', '--tint-sindoor', '--tint-mor', '--tint-matki', '--tint-pitambar', '--tint-knot', '--tint-lookbook'];
const TEXT = ['--text', '--text-muted', '--gold-text', '--sale', '--link', '--tag', '--danger', '--ok', '--cta2-text'];
const UI = ['--field-line', '--focus', '--cta2-border'];
const PAIRS = [
  ['--cta-text', '--cta-bg', 4.5],
  ['--badge-text', '--badge-bg', 4.5],
];

for (const [name, vars] of Object.entries(themes)) {
  const color = (t) => {
    const v = resolve(vars, vars[t] ?? `var(${t})`);
    const c = rgb(v);
    if (!c) throw new Error(`${name}: ${t} is not a hex colour (${v})`);
    return c;
  };
  console.log(`\n${name === 'light' ? 'Light (Kagaz)' : 'Dark (Raat)'}`);
  const rows = [];
  const check = (fg, bg, min) => {
    const r = ratio(color(fg), color(bg));
    rows.push({ fg, bg, r, min });
    if (r < min) fail(`${name}: ${fg} on ${bg} = ${r.toFixed(2)} (needs ${min})`);
  };
  for (const fg of TEXT) for (const bg of BACKGROUNDS) check(fg, bg, 4.5);
  for (const fg of UI) for (const bg of BACKGROUNDS) check(fg, bg, 3);
  for (const [fg, bg, min] of PAIRS) check(fg, bg, min);
  // worst case per foreground token
  const worst = {};
  for (const row of rows) if (!worst[row.fg] || row.r < worst[row.fg].r) worst[row.fg] = row;
  for (const w of Object.values(worst)) {
    console.log(`  ${w.r >= w.min ? 'ok  ' : 'FAIL'}  ${w.fg.padEnd(14)} worst ${w.r.toFixed(2).padStart(5)} on ${w.bg} (min ${w.min})`);
  }
}

// layout.tsx's static theme-color pair has to match the tokens.
const layout = readFileSync(new URL('../src/app/layout.tsx', import.meta.url), 'utf8');
for (const [name, vars] of Object.entries(themes)) {
  const want = resolve(vars, vars['--theme-color']).toLowerCase();
  const scheme = name === 'light' ? 'light' : 'dark';
  const m = layout.match(new RegExp(`prefers-color-scheme: ${scheme}\\)', color: '(#[0-9a-fA-F]{6})'`));
  if (!m) fail(`layout.tsx: no themeColor for ${scheme}`);
  else if (m[1].toLowerCase() !== want) fail(`layout.tsx: themeColor ${scheme} ${m[1]} ≠ --theme-color ${want}`);
}

console.log(failures ? `\n${failures} contrast check(s) failed.` : '\nAll contrast checks passed.');
process.exit(failures ? 1 : 0);
