# Brand assets

`logo.webp`: the owner's badge (Bal Krishna with a matki, श्री COLLECTION, Ladies Garments ·
Suits · Sarees), 1254 × 1254 on a black disc with a gold ring. Used by the header and footer
badge (`BadgeMark`), the 3D coin face and the store's JSON-LD. To replace it, keep it square
with the ring centred, at least 1024 × 1024.

`logo-coin.webp`: the face of the hero's 3D coin, the gold version of the badge with only
श्री COLLECTION (the tagline lines are removed and the artwork re-centred in the ring).

With `logo.hasArtwork: false` in `src/brand.config.ts` the site falls back to a typographic
badge (gold ring + श्री COLLECTION) and never redraws the Krishna artwork.
