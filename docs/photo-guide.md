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
