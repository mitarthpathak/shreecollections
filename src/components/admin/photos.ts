/**
 * Prepares a picked photo for the catalogue in the browser: cropped to 4:5 and scaled to at
 * most 1600 × 2000 (docs/photo-guide.md), as WebP (JPEG where the browser can't encode WebP),
 * kept under ~1.2 MB.
 *
 * The crop is centred unless `focus` says otherwise: 0 keeps the left (or top) edge, 1 the
 * right (or bottom) edge — along whichever side is too long for 4:5.
 */
export type PreparedPhoto = {
  type: 'image/webp' | 'image/jpeg';
  data: string;
  url: string;
  bytes: number;
  /** the original's size, to know whether there is anything to re-crop */
  source: { width: number; height: number };
};

/** 1600 × 2000 at most */
const W = 1600;
export const RATIO = 4 / 5;

function blob(canvas: HTMLCanvasElement, type: string, q: number) {
  return new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, q));
}

function base64(b: Blob) {
  return new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(',')[1] ?? '');
    r.onerror = () => reject(r.error);
    r.readAsDataURL(b);
  });
}

/** Whether a width × height picture needs cropping to be 4:5 (a hair either way doesn't count). */
export const needsCrop = (width: number, height: number) => Math.abs(width / height - RATIO) > 0.01;

export async function preparePhoto(file: File, focus = 0.5): Promise<PreparedPhoto> {
  const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' });
  const source = { width: bmp.width, height: bmp.height };
  // crop to 4:5 at `focus`, then scale down (never up) to at most 1600 × 2000
  const f = Math.min(1, Math.max(0, focus));
  let sw = bmp.width, sh = bmp.height;
  if (sw / sh > RATIO) sw = Math.round(sh * RATIO);
  else sh = Math.round(sw / RATIO);
  const sx = Math.round((bmp.width - sw) * f), sy = Math.round((bmp.height - sh) * f);
  const scale = Math.min(1, W / sw);
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(sw * scale);
  canvas.height = Math.round(sh * scale);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('This browser cannot prepare photos.');
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(bmp, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
  bmp.close();

  let out: Blob | null = null;
  for (const q of [0.82, 0.72, 0.6]) {
    out = await blob(canvas, 'image/webp', q);
    // Safari can't encode WebP and hands back a PNG: use JPEG there
    if (out && out.type !== 'image/webp') out = await blob(canvas, 'image/jpeg', q + 0.05);
    if (out && out.size <= 1_200_000) break;
  }
  if (!out) throw new Error('Could not prepare this photo.');
  const type = out.type === 'image/webp' ? 'image/webp' : 'image/jpeg';
  return { type, data: await base64(out), url: URL.createObjectURL(out), bytes: out.size, source };
}
