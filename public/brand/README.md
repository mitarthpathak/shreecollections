# Brand assets

TODO(brand): drop the owner's corrected logo master here as `logo.png`
(transparent PNG, at least 1024 × 1024, badge only).

The raster we were given reads "LADIES GARAIENTS". That line must never be shown:
crop it off the badge, the site renders the tagline as live text
("LADIES GARMENTS · SUITS · SAREES"). Once `logo.png` is in place, set
`logo.hasArtwork` to `true` in `src/brand.config.ts`.

Until then the site uses a typographic badge (gold ring + श्री COLLECTION),
and never redraws the Krishna artwork.
