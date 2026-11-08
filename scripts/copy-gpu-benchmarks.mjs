// detect-gpu fetches its benchmark tables at runtime. We self-host them (no CDN at runtime).
import { cpSync, existsSync } from 'node:fs';
const from = new URL('../node_modules/detect-gpu/dist/benchmarks', import.meta.url);
const to = new URL('../public/detect-gpu', import.meta.url);
if (existsSync(from)) cpSync(from, to, { recursive: true });
