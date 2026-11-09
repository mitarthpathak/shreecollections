/**
 * Prepares a picked photo for the catalogue in the browser: cropped to 4:5 from the centre and
 * scaled to at most 1600 × 2000 (docs/photo-guide.md), as WebP (JPEG where the browser can't
 * encode WebP), kept under ~1.2 MB.
 */
export type PreparedPhoto = { type: 'image/webp' | 'image/jpeg'; data: string; url: string; bytes: number };

/** 1600 × 2000 at most */
const W = 1600;

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

export async function preparePhoto(file: File): Promise<PreparedPhoto> {
  const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' });
  // centre crop to 4:5, then scale down (never up) to at most 1600 × 2000
  const ratio = 4 / 5;
  let sw = bmp.width, sh = bmp.height;
  if (sw / sh > ratio) sw = Math.round(sh * ratio);
  else sh = Math.round(sw / ratio);
  const sx = Math.round((bmp.width - sw) / 2), sy = Math.round((bmp.height - sh) / 2);
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
  return { type, data: await base64(out), url: URL.createObjectURL(out), bytes: out.size };
}
