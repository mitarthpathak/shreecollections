# Redesign report

Branch **`redesign`**, created from the repository's default branch
`claude/confident-lovelace-kjl7jt` at `cc5e435` (which already contains the merged QA fixes from
PRs #3–#5; `main` is behind it). Package manager: npm. Every phase ended with lint, typecheck,
`check:contrast` and a production build passing, and was pushed. Nothing was merged and no pull
request was opened.

Vercel built each push (commit status "Vercel: success"); the branch preview is at
`https://shreecollections-git-redesign-mitarths-projects.vercel.app` (behind Vercel's deployment
protection, so it asks for a Vercel login).

## What changed, phase by phase

| Phase | Commit | Summary |
|---|---|---|
| 0 Audit | `ed346a2` | `docs/redesign-audit.md`: tokens, fonts, global styles, scroll engine, every 3D shot, every D3 use, how posters are made, and the full list of hardcoded colours (197 lines in 30 files + ~300 raw-colour Tailwind classes). |
| 1 Tokens | `c41143e` | Raw palette kept and extended (kagaz, kajal, gold-800, neel-gehra, mor-gehra/light, sindoor-light, field lines, chapter tints, art pigments). Semantic layer with light as `:root`, dark via `prefers-color-scheme` and `data-theme="dark"` (works without JS), `color-scheme` per theme. All hardcoded colours replaced; `getThemeColor()` for three.js / canvas / D3; `lib/palette.ts` removed. `npm run check:contrast` added. |
| 2 Theme toggle | `4e3a7e6` | `next-themes` (`data-theme`, system default, `sc-theme`), header sun/moon, footer System / Light / Dark radio group, live `theme-color`, three.js scene restyled in place over ~400 ms (Kagaz rules: sparse zari dust, no bloom, solid gold thread, deeper coin rim + warm shadow), D3 restyles through CSS variables, light-theme poster fallback (tint + line motif). |
| 3 Typography | `85c86f9` | Cinzel only for the logo wordmark and the hero (≥ 48 px), Cormorant Garamond 500 for headings and product names, Manrope 400/500 for UI; labels ≤ 0.08em tracking; nothing under 12 px; only Cormorant and Manrope preloaded. |
| 4 Commerce | `c7abb67` | 4:5 product card without the gold frame, one badge style, optional `photos[]` with `<ProductImage>` and a photo guide, primary/secondary buttons, WhatsApp as the PDP's primary action, field-line chips and ringed swatches, 60 % gallery + sticky info column + accordion. Placeholders redrawn on an ivory wall at 4:5. |
| 5 Home film | `57045f5` | Chapter colour journey (`--chapter-bg` + WebGL clear colour), smaller coin with a media slot for `hero-drape.mp4`, one crisp peacock-eye geometry (coin, logo, Mor Pankh), "New arrivals" rail filling the empty beat after the hero, flat headings with one italic gold accent word, fabric texture pipeline (`public/textures/<fabric>/`) and better procedural Bandhani / Leheriya. |
| 6 Performance | `c89d935` | Fixed the leak behind the frozen home tab, the thread rebuild on every Android URL-bar change (and its undisposed GPU buffers), synchronous shader checks; DPR caps (1.5 / 1.25), lighter 3D on phones, pause when hidden / covered, lazily imported chapter scenes, inlined critical CSS. |
| 7 Launch fixes | `19f7204` | Site URL from `NEXT_PUBLIC_SITE_URL` → Vercel production URL → `https://shreecollections.vercel.app`; one brand config, unknown values hidden (no placeholders anywhere); `whatsappLink()` with an Instagram DM fallback. |
| 8 QA + report | `3ee358e` | This report; full QA matrix (below). |
| Perf follow-up | see `git log` | Film chapters and GSAP plugins code-split, chapter chunks after first paint, lighter HTML (below). |

## Performance, before → after

Measured on the same machine against production builds of `57045f5` (before) and Phase 6.
The container has no GPU (Chromium renders WebGL in software), so frame rates here are not
real-device numbers.

| Measure | Before | After |
|---|---|---|
| Memory, home → shop → home × 5 (DOM nodes after GC) | 2,788 → 6,475 → … → **14,342** (grows every visit) | 2,795 → 5,107 → then **flat at 5,039** |
| Event listeners over the same round trips | 793 → **2,762** | 800 → **flat at 1,210** |
| Film scroll top to bottom, Pixel 7 profile, 4× CPU: long tasks | 28 | 21 |
| … longest task | **1,349 ms** | **241 ms** |
| … tasks over 200 ms | 5 | 2 |
| Lighthouse mobile (applied throttling): LCP | 2.8 s | **1.9 s** |
| … FCP | 2.5 s | 1.9 s |
| … CLS | 0.001 | 0.003 |
| … TBT | ~6.6 s | ~6.5 s |
| Lighthouse mobile (default simulated throttling): LCP | ~7–9 s | ~8–9 s |

### Follow-up: code-splitting the film for LCP

- Every chapter after the hero is its own lazily loaded chunk (`src/film/dom/lazyChapters.tsx`),
  requested **after the first frame is painted**. Chapters are still server-rendered in place (no
  Suspense boundaries, so React doesn't stream them out of order or hide them without
  JavaScript); the film's scroll triggers attach to stable `data-chapter-slot` wrappers.
- GSAP keeps only the core, ScrollTrigger and useGSAP in the shared module; Flip, DrawSVG,
  SplitText and the `silk` CustomEase load where they are used (shop / bag / Rang Chakra,
  intro / mandala / map / add-to-bag, hero intro, Weave / Rang Chakra). The add-to-bag thread
  (d3-shape + DrawSVG) loads on the first add.
- The New arrivals rail mounts its cards just before it rises in (or in idle time after load),
  so its images aren't requested with the first paint; the hidden light-theme hero poster and a
  below-the-fold `priority` image no longer compete with it either.
- Mukta loads at 400 only (−67 KB of font before first paint); image `srcset`s list 10 widths
  instead of 15 (smaller HTML).

| Measure (home page) | Before | After |
|---|---|---|
| First-load JS (uncompressed, `route-bundle-stats`) | 916,740 B | **733,734 B** (−20%) |
| Script tags in the HTML | 17 | 12 |
| D3, chapter code, Flip / DrawSVG / SplitText before first paint | yes | none |
| Real Chrome, Pixel 7 profile, 4x CPU: FCP / LCP | ~0.55 s | ~0.4–0.6 s, chapter chunks only after it |
| Lighthouse mobile, default simulated, behind Brotli (as on Vercel): LCP | ~7–9 s | **4.4–4.7 s** |
| … FCP / Speed Index / TBT | 2.7 s / 6.6–7.8 s / 2.3–3.7 s | 2.1 s / 3.8–3.9 s / 1.3–1.8 s |
| … performance score | ~35 | ~55 |
| Lighthouse mobile, applied throttling: LCP | 1.9 s | **1.7 s** (2.0 s behind the Brotli proxy) |
| Film scroll (Pixel 7, 4x CPU, software GL): long tasks / median frame | 21 / 67 ms | 9 / 50 ms |

Inlined CSS was kept: without it the simulated LCP is ~0.3 s lower but the applied-throttling LCP
rises to 2.5–2.6 s, because the stylesheet becomes a render-blocking request again.

Root causes fixed: the Visit chapter's ScrollTrigger lived outside any GSAP context (a full
detached copy of the film per visit, plus an infinite tween inside a scrubbed timeline); the
golden thread was rebuilt (1,200–1,800 tube segments, never disposed) whenever the viewport
height changed, which on Android happens every time the URL bar shows or hides while scrolling;
three.js forced synchronous shader compiles by reading every info log.

## Theme test matrix

| Test | Result |
|---|---|
| Every route (14, incl. 404) × stored light / dark × hard refresh, OS set to the opposite theme: first paint already in the stored theme | Pass |
| Hydration warnings on any of those loads | None |
| Toggle → `data-theme`, storage, `<meta name="theme-color">`, action label | Pass |
| Client navigation and reload keep the choice | Pass |
| Label follows हिं | Pass |
| System mode: OS switch while the site is open updates live (incl. meta) | Pass |
| Storage blocked (localStorage throws): falls back to System, toggle still works, no errors | Pass |
| JavaScript disabled, OS light / dark: page light / dark | Pass |
| Two tabs: a change in one updates the other | Pass |
| WebGL: 4 toggles keep the same canvas and context | Pass |

## Final QA (Phase 8)

Automated (Playwright, production build): 14 routes × both themes × 360, 390, 768, 1024 and
1440 px (140 page loads) with a bag and wishlist filled:

- no horizontal overflow;
- no visible text below 3:1 against its actual background (catches black-on-black and
  ivory-on-ivory; every text token also passes 4.5:1 on every surface and chapter tint in
  `check:contrast`);
- no console errors and no hydration warnings;
- keyboard: Tab moves through every page and every focused element shows the `--focus` ring
  (390 and 1440 px, both themes, home / shop / product / bag / visit / about).

`npm run check:contrast`, `npm run lint`, `npm run typecheck` and `npm run build` pass.

The home film was also checked chapter by chapter with WebGL in both themes (desktop and phone):
colour journey per the table, accent headings, the New arrivals rail, the coin, the Mor Pankh
eye, the knot.

## Known issues

- **Lighthouse's simulated LCP is 4.4–4.7 s here** (was ~8 s). With applied mobile throttling
  it is 1.7–2.0 s, and real Chrome paints the hero at ~0.5 s. The simulation works from
  Lighthouse's own unthrottled pass, which in this container first paints at ~1.1 s (vs ~0.2 s
  without Lighthouse attached) and counts everything requested before that — React/Next, GSAP,
  Lenis and the fonts. Re-check with PageSpeed Insights on the deployed URL (the preview is behind
  Vercel's login); what remains is mostly the framework itself.
- **TBT is high** (~6.5 s with applied throttling): hydration of the film plus the 3D stage
  booting in idle time after load (deliberately before the first scroll, so scrolling stays smooth).
- **Frame rate on a real mid-range Android is unmeasured**: this container renders WebGL in
  software. Needs one check on a real device (see the checklist).
- Two scroll tasks still exceed 200 ms in the software-GL run (241 ms and ~220 ms): driver shader
  links when a new chapter's scene first draws.
- **Light posters**: the poster frames are hand-captured dark renders; the light theme shows the
  chapter tint with a line motif instead.
- The 3D saree ribbon passes behind the "Six yards of poetry" heading; a page-colour halo keeps it
  readable in both themes.
- `claude/stage-4-film-chapters-leaks` (PR #9) was merged into `claude/confident-lovelace-kjl7jt`
  after this branch started; that branch (which also contains `main`) is merged into `redesign`.
  Its 8 conflicting files keep the redesign's code, with stage-4's fixes ported in theme tokens:
  Mor Pankh's eye timed to its own band and the label in the band; Rang Chakra's sideways-swipe
  wheel (vertical swipes scroll the page), cleanup on leaving, a page-colour scrim behind the copy
  and a deeper silk in the dark theme; the phone saree stack capped above the TabBar; muted-fill
  Suits words on phones; the phone map finishing before it reaches the header. `redesign` now
  merges into `main` without conflicts.
- Lookbook images are still the dark, framed editorial placeholders (only product placeholders
  were redrawn); the OG image is unchanged, as asked.

## Owner checklist

- [ ] **Product photos**: 1600 × 2000, daylight, same ivory wall (`docs/photo-guide.md`), listed
      as `photos` per product in `data/products.json`.
- [ ] **Hero drape video**: `public/media/hero-drape.mp4` + `hero-drape.webp` (spec in the photo guide).
- [ ] **Fabric textures**: `public/textures/<fabric>/albedo.webp` (+ `normal.webp`) for the six fabrics.
- [ ] **Light posters** (designer): light-theme captures of the 11 chapters, if wanted.
- [x] **Logo** → `public/brand/logo.webp` (`logo.hasArtwork: true`).
- [x] **Street address and PIN code**, **opening hours**, **phone**, Google Maps listing.
- [ ] **WhatsApp number** → `contact.whatsapp` (international, digits only, no `+`, e.g. `919876543210`).
      Until then, orders go to Instagram DMs.
- [ ] **Owner story** → `ownerStory`; **shipping, returns, privacy policies** → `policies.*`.
- [ ] **`NEXT_PUBLIC_SITE_URL`** in Vercel if the site moves to its own domain (otherwise the
      Vercel production URL is used).
- [ ] **Test the home page on a real mid-range Android** (scroll the whole film twice, go to the
      shop and back a few times).
