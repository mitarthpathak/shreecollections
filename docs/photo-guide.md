# Photo guide (for the owner)

The site shows drawn placeholder art until real photos exist. Real photos replace the art
product by product: no code changes, only files and one line of data per product.

## Product photos

**Shape and size.** 4:5 portrait, **1600 × 2000 px**, JPEG or WebP, under 1 MB each.
`next/image` makes the smaller sizes for phones automatically.

**Light and setting (the same for every product, so the shop looks like one collection).**

- Daylight from a window, no flash, no coloured bulbs. Overcast days are best.
- The same plain **ivory wall** behind every piece, the same distance from the camera, the camera
  at chest height and level (not tilted).
- No props, no other clothes in frame, nothing on the wall.
- Colours true to the cloth: check the photo next to the real piece before uploading.

**Shots per product, in this order:**

1. **Full drape**: the whole saree hung or draped (or the full suit on a hanger / form), centred,
   with a little wall around it.
2. **Zari / border close-up**: fill the frame with the weave, the zari and the border.
3. **Pallu** (sarees) or **dupatta / neckline detail** (suits).
4. **On-model** (if possible): one person, the same ivory wall, full length.

The first photo is the one on the product card; the second shows on hover (desktop) or on a
sideways swipe (phones).

**Where they go.** `public/products/<slug>/photo-1.webp`, `photo-2.webp`, … and list them in
`data/products.json` on that product:

```json
"photos": ["/products/gulabi-banarasi-katan-silk-saree/photo-1.webp", "/products/gulabi-banarasi-katan-silk-saree/photo-2.webp"]
```

Products without `photos` keep their drawn placeholders. `npm run assets` redraws only the
placeholder files (`1.webp`, `2.webp`, `3.webp`, `fabric.webp`), never `photo-*.webp`; keep a
copy of your photos anyway.

## Hero drape video (optional)

A short, quiet loop for the home page's first screen: a saree's pallu or a dupatta moving in a
breeze, or being draped. It plays muted, looped and inline, starts only after the page has
loaded, and is replaced by its poster for visitors who prefer reduced motion.

- `public/media/hero-drape.mp4`: **4:5 portrait**, 1080 × 1350 px, 6–10 s seamless loop, H.264,
  no audio track, ≤ 3 MB (CRF ~26). Slow movement, no cuts, no text.
- `public/media/hero-drape.webp`: its first frame, 1080 × 1350, ≤ 150 KB (shown until the video
  starts, and as the still for reduced motion).
- Light it like the product photos: daylight, the same ivory wall.

When `hero-drape.mp4` exists the video takes the coin's place next to the headline; without it
the 3D coin stays. Nothing else to configure (it is checked at build time, so redeploy after
adding it).

## Fabric textures for the Weave chapter (optional)

The Weave chapter shows six fabrics on a moving silk sheet. Until real macro photos exist they
are drawn in code. To use photos, add per fabric (Banarasi, Chanderi, Georgette, Cotton,
Bandhani, Leheriya):

- `public/textures/<fabric>/albedo.webp`: a flat, evenly lit macro of the cloth, **2048 × 2048**,
  shot straight on (camera parallel to the cloth, no folds, no shadows, no visible edge),
  daylight or two soft lights at 45°, white-balanced on a grey card. It should tile: crop a
  square from the middle of the shot and check the repeat in an image editor (offset by 50%).
- `public/textures/<fabric>/normal.webp` (optional): a normal map made from the same crop
  (e.g. in Materialize or Photoshop's 3D filter), same size.
- Folder names are lowercase: `banarasi`, `chanderi`, `georgette`, `cotton`, `bandhani`,
  `leheriya`. WebP, quality ~85, ≤ 1.5 MB each.

Missing files simply keep the drawn version; nothing else to change.
