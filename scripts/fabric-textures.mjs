// Lists the real fabric macro photos in public/textures/<fabric>/{albedo,normal}.webp (see
// docs/photo-guide.md) in public/textures/index.json, which the Weave chapter reads to use them
// instead of its procedural textures. Runs before dev and build; the JSON is generated (gitignored).
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';

const FABRICS = ['Banarasi', 'Chanderi', 'Georgette', 'Cotton', 'Bandhani', 'Leheriya'];
const dir = new URL('../public/textures/', import.meta.url);
mkdirSync(dir, { recursive: true });
const out = {};
for (const f of FABRICS) {
  const slug = f.toLowerCase();
  const has = (n) => existsSync(new URL(`${slug}/${n}.webp`, dir));
  if (has('albedo')) out[f] = { albedo: `/textures/${slug}/albedo.webp`, normal: has('normal') ? `/textures/${slug}/normal.webp` : null };
}
writeFileSync(new URL('index.json', dir), JSON.stringify(out, null, 2) + '\n');
console.log(`fabric textures: ${Object.keys(out).length ? Object.keys(out).join(', ') : 'none (procedural)'}`);
