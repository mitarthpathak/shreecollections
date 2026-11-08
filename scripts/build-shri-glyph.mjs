// Shapes "श्री" with HarfBuzz (correct Devanagari conjunct + matra) and writes one SVG path
// to src/film/shri-glyph.json for SVGLoader + ExtrudeGeometry. TextGeometry / typeface JSON
// cannot shape Devanagari, so the shaping happens here, once, at build time.
// Usage: node scripts/build-shri-glyph.mjs path/to/TiroDevanagariHindi-Regular.ttf
import { readFileSync, writeFileSync } from 'node:fs';
import * as hb from 'harfbuzzjs';

const fontPath = process.argv[2];
if (!fontPath) throw new Error('Pass the path to a Tiro Devanagari Hindi .ttf');
const data = readFileSync(fontPath);
const blob = new hb.Blob(data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength));
const face = new hb.Face(blob);
const font = new hb.Font(face);
const upem = face.upem ?? 1000;

const buffer = new hb.Buffer();
buffer.addText('श्री');
buffer.guessSegmentProperties();
hb.shape(font, buffer);
const infos = buffer.getGlyphInfos();
const pos = buffer.getGlyphPositions();

// Offset a glyph path by (dx, dy) and flip y (font units are y-up; SVG is y-down).
function transform(d, dx, dy) {
  return d.replace(/([MLQCZ])([^MLQCZ]*)/g, (_, cmd, args) => {
    const n = args.trim() ? args.trim().split(/[\s,]+/).map(Number) : [];
    const out = [];
    for (let i = 0; i < n.length; i += 2) out.push((n[i] + dx).toFixed(1), (-(n[i + 1] + dy)).toFixed(1));
    return cmd + out.join(' ');
  });
}

let pen = 0;
let d = '';
infos.forEach((g, i) => {
  const p = pos[i];
  d += transform(font.glyphToPath(g.codepoint), pen + p.xOffset, p.yOffset);
  pen += p.xAdvance;
});

const nums = [...d.matchAll(/-?\d+(\.\d+)?/g)].map((m) => Number(m[0]));
const xs = nums.filter((_, i) => i % 2 === 0), ys = nums.filter((_, i) => i % 2 === 1);
const box = { minX: Math.min(...xs), maxX: Math.max(...xs), minY: Math.min(...ys), maxY: Math.max(...ys) };
writeFileSync(
  new URL('../src/film/shri-glyph.json', import.meta.url),
  JSON.stringify({ text: 'श्री', glyphs: infos.length, upem, box, d }, null, 0) + '\n',
);
console.log(`श्री → ${infos.length} glyphs, box`, box);
