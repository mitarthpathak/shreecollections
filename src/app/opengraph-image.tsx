import { ImageResponse } from 'next/og';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

export const alt = 'Shree Collection — the gold badge on black';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function OG() {
  const font = await readFile(join(process.cwd(), 'node_modules/@fontsource/cinzel/files/cinzel-latin-600-normal.woff'));
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'radial-gradient(circle at 50% 40%, #2a1d12 0%, #120E0A 45%, #07060A 80%)',
          color: '#E9C46A',
          fontFamily: 'Cinzel',
        }}
      >
        <div
          style={{
            width: 260,
            height: 260,
            borderRadius: 999,
            border: '6px solid #E9C46A',
            boxShadow: '0 0 0 14px #07060A, 0 0 0 16px #8A6418, 0 0 80px rgba(233,196,106,0.35)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#07060A',
          }}
        >
          <div style={{ width: 90, height: 130, borderRadius: 999, background: 'radial-gradient(circle, #1B2C7A 0%, #0E7C7B 45%, #E9C46A 75%, rgba(14,124,123,0) 100%)' }} />
        </div>
        <div style={{ marginTop: 56, fontSize: 76, letterSpacing: 14, color: '#F3D98A' }}>SHREE COLLECTION</div>
        <div style={{ marginTop: 14, fontSize: 26, letterSpacing: 10, color: '#C9962E' }}>LADIES GARMENTS · SUITS · SAREES</div>
        <div style={{ marginTop: 10, fontSize: 22, letterSpacing: 8, color: '#8A6418' }}>BANSWARA · RAJASTHAN</div>
      </div>
    ),
    { ...size, fonts: [{ name: 'Cinzel', data: font, weight: 600, style: 'normal' }] },
  );
}
