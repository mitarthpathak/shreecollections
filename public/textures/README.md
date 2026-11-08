# Fabric textures (optional)

Real macro photos for the Weave chapter, one folder per fabric:

```
public/textures/banarasi/albedo.webp   (required to use the photo)
public/textures/banarasi/normal.webp   (optional)
public/textures/chanderi/…  georgette/…  cotton/…  bandhani/…  leheriya/…
```

Until a fabric has an `albedo.webp`, the film draws it procedurally. `index.json` is generated
before every dev/build run (`scripts/fabric-textures.mjs`); don't edit it. Shooting spec:
`docs/photo-guide.md` → Fabric textures.
