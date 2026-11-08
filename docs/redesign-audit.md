# Redesign audit (Phase 0)

Baseline: branch `redesign`, created from the repository's default branch
`claude/confident-lovelace-kjl7jt` at `cc5e435` (it already contains the merged mobile/QA fixes from
PRs #3, #4 and #5; `main` is behind it). Package manager: **npm** (`package-lock.json`).
Baseline `npm run lint`, `npm run typecheck` and `npm run build` all pass.

Stack: Next.js 16.4 (App Router, Turbopack), React 19.3, Tailwind CSS v4 (CSS-first config),
three.js 0.187 via @react-three/fiber 9 + drei 10 + postprocessing, GSAP 3.15 (ScrollTrigger,
SplitText, Flip, DrawSVG) with Lenis smooth scroll, D3 v3/v4 modules, zustand 5 for state.

## 1. Where tokens, fonts and global styles live

| What | Where | Notes |
|---|---|---|
| Raw colour tokens | `src/app/globals.css` `:root` (L4–33) | `--raat`, `--lacquer`, `--lacquer-2`, `--gold-100/300/500/700`, `--ivory`, `--ivory-dim`, `--neel`, `--neel-text`, `--mor`, `--pitambar`, `--sindoor`, `--matki`, plus `--accent` (set at runtime by Rang Chakra). `color-scheme: dark` is hard-set. |
| Tailwind bridge | `globals.css` `@theme inline` (L35–61) | Every raw token is exposed as a Tailwind colour (`bg-raat`, `text-ivory`, `text-gold-300` …). There is **no semantic layer**: components name raw colours directly (≈300 class uses, see appendix). |
| Font families | `globals.css` `@theme inline` (L53–58) | `--font-display` (Cinzel), `--font-editorial` (Cormorant Garamond), `--font-sans` (Manrope), `--font-hindi-display` (Tiro Devanagari Hindi), `--font-hindi` (Mukta). |
| Font loading | `src/lib/fonts.ts` | `next/font/google`, self-hosted at build. 5 families: Cinzel variable (preloaded), Cormorant 400/500 + italic, Manrope variable, Tiro 400 (preloaded), Mukta 400/600. |
| Shared component styles | `globals.css` `@layer components` | `.text-gold` / `.text-gold-glint` (metallic gradient text, used on most headings), `.label` (Cinzel, 0.75rem, 0.28em tracking, uppercase), `.chapter-title`, `.btn` / `.btn-gold` / `.btn-ghost` (Cinzel 0.78rem, 0.22em tracking, uppercase), `.chip`, `.panel`, `.glass`, `.todo`, `.hairline`. |
| Film-wide overlays | `globals.css` | `.grain` (animated SVG noise, z-60), `.vignette`, view-transition thread curtain, poster cross-fade rules keyed on `html[data-chapter-active]`. |
| JS palette mirror | `src/lib/palette.ts` | Hex copy of the raw tokens for three.js/canvas (`palette.raat`, `palette.gold300` …) plus `hexToRgb01`. Duplicates CSS values; nothing keeps the two in sync. |
| Theme meta | `src/app/layout.tsx` | `viewport.themeColor: '#07060A'`, `colorScheme: 'dark'`; `<html data-tier="2" suppressHydrationWarning>`. No theme switching exists. |

Typography problems confirmed: Cinzel is used for `.label` (12px, 0.28em tracking), `.btn`
(12.5px, 0.22em), product/section headings and the chapter-tick labels; 23 `font-display` uses in
TSX. Several labels are below 12px (`text-[0.6rem]`, `text-[10px]`, `text-[5px]` in the cursor).

## 2. Scroll engine and the three.js film

- **Clock** (`src/lib/clock.ts`): one GSAP ticker drives Lenis (`lenis.raf`), ScrollTrigger
  (`lenis.on('scroll', ScrollTrigger.update)`) and every WebGL canvas (`onFrame`). Canvases use
  `frameloop="never"` and are advanced by `src/film/TickerDriver.tsx`.
- **Chapters** (`src/film/chapters.ts`): 11 entries with scroll length in svh (desktop / mobile)
  and a camera `hold`. `src/film/dom/Section.tsx` renders each chapter's `<section>` with that
  length and exports shared ScrollTrigger ranges (`pin`, `enter`, `pass`, `exit`).
- **State** (`src/film/state.ts`): a plain mutable `film` object (chapter, chapterProgress,
  progress, pointer, covered, mobile, coin slot, footerRise, and per-chapter tween targets
  `film.u.*`). `src/film/Film.tsx` creates one ScrollTrigger per section that writes
  `film.chapters[i]`, a frame callback that derives `film.chapter` and sets
  `html[data-chapter-active]`, and the resize/rotation hold-and-restore logic. No React state
  changes on scroll.
- **Stage** (`src/film/Stage.tsx`, dynamic import, loaded on first intent or after 4 s): one
  `<Canvas>` (`alpha: false`, clear colour `palette.raat`, ACES tone mapping), fog
  `palette.raat 9–26`, an ambient + two directional lights, a drei `Environment` built from four
  `Lightformer`s, `CameraRig` flying a CatmullRom rail (`src/film/rail.ts`), `PerformanceMonitor`
  (drops DPR, then tier), and Bloom only at tier 3.
- **Shots** (`src/film/Shot.tsx` mounts a shot two chapters early, draws within ±`near`
  chapters, unmounts beyond ±3):

| # | Chapter | DOM (`src/film/dom/`) | 3D shot (`src/film/shots/`) |
|---|---|---|---|
| 01 | Draped in Devotion | `Hero.tsx` | `HeroCoin.tsx` (badge texture, metal rim shader) |
| 02 | Ek Dhaaga | `Dhaaga.tsx` (D3 mandala SVG) | `Thread.tsx` (always on, from coin rim to knot) + `Dust.tsx` (always on) |
| 03 | The Weave | `Weave.tsx` | `Silk.tsx` mode `weave` (procedural fabric textures) |
| 04 | Six Yards | `Sarees.tsx` | `Ribbon.tsx` (saree texture) |
| 05 | Mor Pankh | `Mor.tsx` (CSS radial "eye") | `Feather.tsx` (feather texture) |
| 06 | Suits | `Suits.tsx` | none |
| 07 | Rang Chakra | `Chakra.tsx` (D3 pie, SVG) | `Silk.tsx` mode `tint` |
| 08 | Makhan Chor Picks | `Picks.tsx` | `Matki.tsx` (instanced coins) |
| 09 | Lookbook | `Lookbook.tsx` (flat reel) | `LookbookWall.tsx` (desktop, tier ≥ 2) |
| 10 | Visit Banswara | `Visit.tsx` (D3 map) | none |
| 11 | The Knot | `Knot.tsx` + footer | `Knot.tsx` |

- **Textures**: `src/film/canvases.ts` draws every texture on 2D canvases with D3 path
  generators (fabrics, saree, feather, matki, glow), memoised and pre-warmed in idle time;
  `src/film/textures.ts` wraps them as `THREE.CanvasTexture` (and builds the coin face from the
  badge SVG). Colours come from `palette.*` and literal hex.
- **Quality tiers** (`src/lib/tier.ts`): 0 = posters only (no WebGL, reduced motion, Save-Data),
  1–3 scale DPR (`[1,1]`, `[1,1.5]`, `[1,2]`), dust count (1.5k / 6k / 20k), silk segments and
  post-processing.

## 3. Where D3 is used

| File | What |
|---|---|
| `src/film/dom/Chakra.tsx` | Rang Chakra: `d3-shape` pie/arc for two rings (category, colour family), `d3-selection` + `d3-transition` for hover/selection, drag-to-rotate. Fills from `COLOR_FAMILIES` (product colours) and literal gold/ivory hex for strokes and labels. |
| `src/components/visit/RajasthanMap.tsx` | District map: `d3-geo` Mercator + `topojson-client` from `/public/geo`; outline, districts, Banswara highlight and pin; literal hex strokes/fills. Animated by `mapTimeline` in `src/components/visit/VisitView.tsx` (also used by the film's `Visit.tsx`). |
| `src/components/shop/PriceHistogram.tsx` | Price filter: `d3-scale` (log), `d3-array` bins, `d3-brush`; gold gradient fills. |
| `src/components/shop/MiniChakra.tsx` | Small colour wheel in the shop filters (`d3-shape`). |
| `src/film/dom/Dhaaga.tsx` | Mandala line art (`d3-shape`). |
| `src/film/canvases.ts` | Texture art (paisley, rosettes, waves) drawn with `d3-shape` onto canvases. |
| `src/lib/fx.ts` | "Thread to bag" and gold-burst effects (SVG paths). |

## 4. Posters (`/public/posters/{d,m}-<chapter>.webp`)

- 22 files: `d-*` (desktop) and `m-*` (mobile) for each of the 11 chapters, all **dark renders**.
- Produced **by hand, not by a script**: `Stage.tsx` → `Capture` registers `window.__capture()`
  in debug builds (`NODE_ENV !== 'production'` or `NEXT_PUBLIC_FILM_DEBUG=1`) when the URL has
  `?capture`; it renders one frame and returns WebP. Added in commit `52bed93`; no script in
  `scripts/` regenerates them.
- Used by `src/film/dom/Posters.tsx`: a fixed layer of `<picture>` elements, one per chapter,
  cross-faded with CSS on `html[data-chapter-active]`. Shown for tier 0 (no WebGL, reduced motion,
  Save-Data) and until the 3D stage is ready; reduced motion also dims them (`brightness(.5)`).
- Consequence for Phase 2: light variants cannot be generated from a script, so the light theme
  gets a token-coloured fallback (chapter tint + motif) and "light posters" goes on the owner /
  designer list.

## 5. Other findings relevant to later phases

- `src/brand.config.ts` holds address/phone/hours as `null` + visible `TODO(brand)` badges
  (`src/components/Todo.tsx`); `brand.siteUrl` defaults to `https://shreecollection.example`
  (used by `metadataBase`, sitemap, robots, JSON-LD) → Phase 7.
- `src/lib/whatsapp.ts` builds `https://wa.me/?text=` (no number → WhatsApp contact picker) → Phase 7.
- Product cards use a gold frame; badges have three different colour treatments; the PDP puts
  "Add to bag" first and WhatsApp second → Phase 4.
- `.text-gold` gradient text is used on most section headings, not just the logo coin → Phases 3/5.
- Home performance: the open branch `claude/stage-4-film-chapters-leaks` (not merged into the
  default branch) contains the fix for a confirmed leak where `src/film/dom/Visit.tsx` creates a
  ScrollTrigger outside any GSAP context, so every home visit keeps a detached copy of the film
  (+~1,700 DOM nodes per visit), and the map's `repeat: -1` pulse makes the scrubbed timeline
  infinite. Phase 6 re-applies that fix here.

## Appendix: hardcoded colours

Generated by scanning `src/` for hex literals, `rgb()`/`rgba()` and `palette.*` lookups
(the token definitions in `globals.css` L4–33 and `src/lib/palette.ts` are the sources, so they
are not listed). Product and fabric colours in the catalog and the Weave data are the colours of
the goods themselves; they stay as data and are exempt from theming.

Lines with a literal colour (hex, rgb()/rgba(), or a `palette.*` lookup): **197** across **30** files.

### Global CSS (outside the token block)

- `src/app/globals.css`
  - L154: `rgb(255 248 220 / 0.95)`
  - L225: `rgb(255 246 214 / 0.55)`
  - L237: `rgb(233 196 106 / 0.6)`, `rgb(255 255 255 / 0.4)`
  - L241: `rgb(18 14 10 / 0.55)`
  - L245: `rgb(26 20 14 / 0.8)`
  - L262: `rgb(255 241 193 / 0.04)`
  - L263: `rgb(201 150 46 / 0.35)`
  - L280: `rgb(0 0 0 / 0.8)`, `rgb(201 150 46 / 0.22)`
  - L283: `rgb(18 14 10 / 0.86)`
  - L287: `rgb(18 14 10 / 0.55)`
  - L318: `rgb(0 0 0 / 0.55)`
  - L333: `rgb(242 183 5 / 0.08)`
  - L334: `rgb(242 183 5 / 0.55)`
  - L349: `rgb(233 196 106 / 0.65)`
  - L457: `rgb(0 0 0 / 0.5)`, `rgb(7 6 10 / 0.8)`

### Components (TSX inline styles, SVG attributes)

- `src/app/not-found.tsx`
  - L18: `#B4553E`
  - L19: `#5E2519`
  - L22: `#8A6418`
  - L23: `#FFF1C1`
  - L24: `#C9962E`
  - L27: `#000`
  - L29: `#F3EAD8`
  - L30: `#FFF8E6`
  - L31: `#FFF8E6`
  - L35: `#7A3324`
  - L36: `#3a160f`
- `src/components/BadgeMark.tsx`
  - L40: `#FFF1C1`
  - L41: `#E9C46A`
  - L42: `#C9962E`
  - L43: `#8A6418`
  - L46: `#1B2C7A`
  - L47: `#0E7C7B`
  - L48: `#E9C46A`
  - L49: `#0E7C7B`
  - L52: `#07060A`
  - L54: `#8A6418`
- `src/components/BagDrawer.tsx`
  - L71: `#8A6418`
  - L72: `#E9C46A`
  - L73: `#FFF1C1`
  - L265: `rgba(0,0,0,.8)`
- `src/components/Header.tsx`
  - L293: `rgba(0,0,0,.8)`
- `src/components/RouteCurtain.tsx`
  - L33: `rgba(233,196,106,.65)`
- `src/film/dom/FilmNav.tsx`
  - L41: `rgba(233,196,106,.7)`
  - L61: `rgb(201_150_46/0.35)`
  - L78: `rgba(233,196,106,.7)`
- `src/film/dom/Mor.tsx`
  - L36: `#07060A`, `rgba(14,124,123,.75)`, `rgba(16,24,74,.95)`, `rgba(201,150,46,.35)`, `rgba(22,58,120,.9)`, `rgba(7,6,10,0)`, `rgba(70,110,40,.45)`
  - L37: `#000`
- `src/film/dom/Preloader.tsx`
  - L63: `rgba(7,6,10,0)`
  - L92: `#FFF1C1`
  - L93: `#E9C46A`
  - L94: `#8A6418`
  - L102: `#8A6418`
  - L103: `#8A6418`
- `src/film/dom/Suits.tsx`
  - L51: `#FFF1C1`
  - L52: `#8A6418`
- `src/lib/palette.ts`
  - L3: `#07060A`
  - L4: `#120E0A`
  - L5: `#FFF1C1`
  - L6: `#E9C46A`
  - L7: `#C9962E`
  - L8: `#8A6418`
  - L9: `#F3EAD8`
  - L10: `#4C7BD9`
  - L11: `#0E7C7B`
  - L12: `#F2B705`
  - L13: `#B3122B`
  - L14: `#8C3B2A`

### D3 / SVG drawing

- `src/components/shop/MiniChakra.tsx`
  - L34: `#888`
  - L35: `#07060A`, `#FFF1C1`
  - L43: `#120E0A`, `#8A6418`
  - L44: `#E9C46A`
- `src/components/shop/PriceHistogram.tsx`
  - L71: `#E9C46A`, `rgba(233,196,106,0.12)`
  - L72: `#E9C46A`
  - L135: `rgba(201,150,46,0.18)`
  - L141: `#FFF1C1`
  - L142: `#8A6418`
  - L145: `#8A6418`
  - L147: `#C9BFAB`
- `src/components/visit/RajasthanMap.tsx`
  - L68: `#FFF1C1`
  - L69: `#E9C46A`
  - L70: `#8A6418`
  - L73: `#E9C46A`
  - L74: `#E9C46A`
  - L81: `rgba(201,150,46,0.45)`, `rgba(233,196,106,0.035)`
  - L86: `rgba(233,196,106,0.22)`
  - L89: `#E9C46A`
  - L92: `#8A6418`
  - L93: `#07060A`
- `src/film/dom/Chakra.tsx`
  - L40: `#E9C46A`
  - L41: `#C9BFAB`
  - L63: `#14505A`, `#8A1F2E`
  - L82: `#07060A`, `#FFF1C1`
  - L95: `#F3EAD8`
  - L112: `#07060A`, `#FFF1C1`
  - L208: `#E9C46A`
- `src/film/dom/Dhaaga.tsx`
  - L48: `#FFF1C1`
  - L49: `#E9C46A`
  - L50: `#8A6418`
- `src/lib/fx.ts`
  - L49: `#8A6418`, `#E9C46A`, `#FFF1C1`
  - L53: `rgba(233,196,106,.35)`
  - L84: `#E9C46A`, `#FFF1C1`

### three.js materials, shaders and canvas textures

- `src/components/product/FabricViewer.tsx`
  - L91: `palette.gold300`
  - L113: `#2a1d12`
  - L125: `#FFE7B0`
  - L126: `palette.mor`
  - L128: `#FFE7B0`
  - L129: `palette.gold300`
- `src/film/Stage.tsx`
  - L158: `palette.raat`
  - L179: `palette.raat`
  - L181: `#FFE2A8`
  - L182: `palette.mor`
  - L184: `#FFE7B0`
  - L185: `palette.gold500`
  - L186: `palette.mor`
  - L187: `#2a1d12`
- `src/film/canvases.ts`
  - L20: `palette.gold100`
  - L21: `palette.gold300`
  - L22: `palette.gold700`
  - L53: `palette.gold700`
  - L58: `rgba(233,196,106,.35)`
  - L71: `rgba(255,255,255,.05)`
  - L89: `rgba(0,0,0,.12)`, `rgba(255,255,255,.08)`
  - L94: `palette.gold100`, `palette.gold300`
  - L107: `palette.ivory`
  - L125: `#FFF6D8`, `palette.pitambar`
  - L130: `#FFF6D8`
  - L139: `#174D33`, `#E9F0D0`, `palette.gold300`, `palette.pitambar`
  - L171: `#5E0B1D`
  - L177: `rgba(94,11,29,.9)`
  - L197: `rgba(176,140,60,.9)`
  - L198: `rgba(20,120,90,.55)`
  - L199: `rgba(14,124,123,0)`
  - L217: `rgba(120,150,40,.85)`
  - L218: `rgba(201,150,46,.95)`
  - L219: `rgba(14,124,123,1)`
  - L220: `rgba(60,140,200,1)`
  - L221: `rgba(20,30,110,1)`
  - L237: `#A2482F`
  - L238: `#6E2C1E`
  - L242: `rgba(0,0,0,${Math.random()`
  - L270: `rgba(255,241,193,1)`
  - L271: `rgba(233,196,106,.45)`
  - L272: `rgba(233,196,106,0)`
  - L282: `#5E0B1D`
  - L285: `#EDE6D6`
- `src/film/shots/HeroCoin.tsx`
  - L85: `palette.gold300`
  - L86: `#000000`
  - L99: `#ffffff`
  - L103: `#ffffff`
  - L109: `palette.gold500`
- `src/film/shots/Knot.tsx`
  - L56: `#FFE7B0`
  - L59: `palette.gold300`, `palette.gold700`
  - L62: `palette.gold300`
- `src/film/shots/Matki.tsx`
  - L78: `#ffffff`
  - L82: `#3a2a10`, `#F3EAD8`
  - L87: `palette.gold300`
  - L91: `palette.gold100`
- `src/film/shots/Silk.tsx`
  - L65: `#EDE6D6`
  - L78: `palette.gold300`
  - L144: `palette.gold100`
  - L146: `#000000`
  - L153: `palette.gold500`
- `src/film/textures.ts`
  - L44: `#1c140c`
  - L45: `#07060A`
  - L59: `#1B2C7A`
  - L60: `palette.mor`
  - L61: `palette.gold300`
  - L62: `rgba(14,124,123,0)`

### Metadata / OG image

- `src/app/layout.tsx`
  - L39: `#07060A`
- `src/app/manifest.ts`
  - L11: `#07060A`
  - L12: `#07060A`
- `src/app/opengraph-image.tsx`
  - L21: `#07060A`, `#120E0A`, `#2a1d12`
  - L22: `#E9C46A`
  - L31: `#E9C46A`
  - L32: `#07060A`, `#8A6418`, `rgba(233,196,106,0.35)`
  - L36: `#07060A`
  - L39: `#0E7C7B`, `#1B2C7A`, `#E9C46A`, `rgba(14,124,123,0)`
  - L41: `#F3D98A`
  - L42: `#C9962E`
  - L43: `#8A6418`

### Content data (product / fabric colours, exempt: these are the goods themselves)

- `src/film/fabrics.ts`
  - L5: `#7A0F24`
  - L6: `#E9DFC7`
  - L7: `#B4536B`
  - L8: `#22305E`
  - L9: `#A3112A`
  - L10: `#2F7D52`
- `src/lib/catalog.ts`
  - L27: `#B3122B`
  - L28: `#D63A7A`
  - L29: `#7B1E3A`
  - L30: `#E07B1A`
  - L31: `#E0A800`
  - L32: `#4F8A3C`
  - L33: `#0E7C7B`
  - L34: `#3A5BC7`
  - L35: `#F2A07B`
  - L36: `#EFE6D2`
  - L37: `#1B1720`

### Tailwind classes that name a raw palette colour

301 uses in 39 files. These are tokens, not literals, but they name a raw colour, so they cannot follow a theme. Phase 1 maps every one to a semantic class.

| Class | Uses |
|---|---|
| `text-ivory-dim` | 50 |
| `text-gold-100` | 36 |
| `text-gold-500` | 28 |
| `text-ivory` | 27 |
| `text-gold-300` | 18 |
| `bg-gold-300` | 15 |
| `bg-lacquer` | 11 |
| `text-raat` | 10 |
| `border-gold-700/40` | 9 |
| `text-ivory/90` | 7 |
| `ring-gold-300` | 7 |
| `text-ivory/80` | 6 |
| `ring-gold-500/40` | 6 |
| `bg-raat` | 5 |
| `ring-gold-500/30` | 5 |
| `text-ivory-dim/50` | 5 |
| `text-sindoor` | 4 |
| `ring-gold-500/50` | 3 |
| `bg-raat/70` | 3 |
| `bg-gold-100` | 2 |
| `decoration-gold-700` | 2 |
| `border-gold-700/30` | 2 |
| `bg-raat/80` | 2 |
| `ring-gold-700/50` | 2 |
| `from-raat` | 2 |
| `via-raat/70` | 2 |
| `text-pitambar` | 2 |
| `bg-ivory/40` | 2 |
| `text-ivory/85` | 1 |
| `bg-gold-700/20` | 1 |
| `from-gold-700` | 1 |
| `via-gold-300` | 1 |
| `to-gold-100` | 1 |
| `bg-gold-500` | 1 |
| `bg-raat/90` | 1 |
| `bg-ivory/25` | 1 |
| `from-gold-300` | 1 |
| `from-raat/80` | 1 |
| `bg-raat/60` | 1 |
| `via-raat/90` | 1 |
| `border-gold-300/70` | 1 |
| `bg-lacquer/40` | 1 |
| `border-gold-700/20` | 1 |
| `bg-gold-500/50` | 1 |
| `bg-sindoor` | 1 |
| `ring-gold-500` | 1 |
| `bg-gold-300/80` | 1 |
| `to-raat` | 1 |
| `bg-raat/95` | 1 |
| `border-gold-500/40` | 1 |
| `text-ivory-dim/40` | 1 |
| `bg-raat/55` | 1 |
| `ring-ivory/30` | 1 |
| `ring-gold-700` | 1 |
| `bg-mor/20` | 1 |
| `ring-mor/60` | 1 |

| File | Uses |
|---|---|
| `src/components/BagDrawer.tsx` | 43 |
| `src/components/product/ProductView.tsx` | 36 |
| `src/components/Header.tsx` | 30 |
| `src/components/ProductCard.tsx` | 24 |
| `src/components/Footer.tsx` | 17 |
| `src/components/shop/ShopView.tsx` | 17 |
| `src/film/dom/Sarees.tsx` | 15 |
| `src/components/SearchOverlay.tsx` | 12 |
| `src/film/dom/FilmNav.tsx` | 11 |
| `src/components/product/ZoomGallery.tsx` | 11 |
| `src/film/dom/Suits.tsx` | 9 |
| `src/film/dom/Hero.tsx` | 7 |
| `src/components/visit/StoreCard.tsx` | 7 |
| `src/film/dom/Chakra.tsx` | 5 |
| `src/film/dom/Weave.tsx` | 5 |
| `src/components/WishlistButton.tsx` | 4 |
| `src/app/layout.tsx` | 4 |
| `src/app/about/page.tsx` | 4 |
| `src/film/dom/Knot.tsx` | 3 |
| `src/film/dom/Preloader.tsx` | 3 |
| `src/components/Cursor.tsx` | 3 |
| `src/components/Price.tsx` | 3 |
| `src/components/RouteCurtain.tsx` | 3 |
| `src/components/TabBar.tsx` | 3 |
| `src/app/not-found.tsx` | 3 |
| `src/film/dom/Lookbook.tsx` | 2 |
| `src/film/dom/Picks.tsx` | 2 |
| `src/film/dom/Visit.tsx` | 2 |
| `src/components/Page.tsx` | 2 |
| `src/components/shop/PriceHistogram.tsx` | 2 |
| `src/film/dom/Dhaaga.tsx` | 1 |
| `src/film/dom/Mor.tsx` | 1 |
| `src/components/visit/VisitView.tsx` | 1 |
| `src/components/shop/MiniChakra.tsx` | 1 |
| `src/components/product/FabricViewer.tsx` | 1 |
| `src/app/policies/[slug]/page.tsx` | 1 |
| `src/app/visit/page.tsx` | 1 |
| `src/app/shop/page.tsx` | 1 |
| `src/app/shop/[category]/page.tsx` | 1 |
