import * as THREE from 'three';
import { CHAPTERS } from './chapters';

/** One station per chapter; the camera rail passes through each. */
const STATIONS: [number, number, number][] = [
  [0, 0, 5.6], // hero
  [0.8, 0.3, -6], // thread
  [-0.6, -0.2, -18], // weave
  [0.4, 0.1, -30], // sarees
  [0, 0.2, -40], // mor pankh
  [-0.4, 0, -50], // suits
  [0.3, -0.2, -62], // chakra
  [0, 0, -74], // picks
  [0, 0.2, -86], // lookbook
  [-0.3, 0, -98], // visit
  [0, 0, -110], // knot
];

export const rail = new THREE.CatmullRomCurve3(STATIONS.map((p) => new THREE.Vector3(...p)), false, 'centripetal');
export const stationT = (i: number) => i / (STATIONS.length - 1);

/** The hero coin sits right of the headline on desktop, above it on phones. */
export const heroOffset = (mobile: boolean) => (mobile ? new THREE.Vector3(0, 0.62, 0) : new THREE.Vector3(1.55, 0.08, 0));

/** Where each chapter's subject sits: a little ahead of its station. */
export function anchor(i: number, ahead = 5.6) {
  const p = rail.getPoint(stationT(i));
  const t = rail.getTangent(stationT(i));
  return p.add(t.multiplyScalar(ahead));
}

/** Camera rail parameter for chapter i at chapter progress cp: hold near the station, then travel on. */
export function railT(i: number, cp: number) {
  const hold = CHAPTERS[i]?.hold ?? 1;
  const a = stationT(i);
  const b = stationT(Math.min(i + 1, STATIONS.length - 1));
  const drift = 0.12 * (b - a); // a slow push-in while holding
  if (cp <= hold || i === STATIONS.length - 1) return a + drift * (cp / Math.max(hold, 1e-3));
  const k = (cp - hold) / (1 - hold);
  const e = k * k * (3 - 2 * k); // smoothstep — power3.inOut feel
  return a + drift + (b - a - drift) * e;
}

/** The golden thread: a sibling curve that loops around the rail, from the coin rim to the knot. */
export function buildThreadCurve(mobile = false) {
  const o = heroOffset(mobile);
  const pts: THREE.Vector3[] = [new THREE.Vector3(o.x, o.y - 1.22, 0.02), new THREE.Vector3(o.x * 0.7 + 0.15, o.y - 1.6, -0.8)];
  for (let z = -2; z >= -112; z -= 1.6) {
    const t = Math.min(1, Math.max(0, (5.6 - z) / 115.6));
    const r = rail.getPoint(t);
    const loopy = z > -16 ? 1.5 : 1; // big loops through Ek Dhaaga
    pts.push(
      new THREE.Vector3(
        r.x + Math.sin(z * 0.42) * 1.25 * loopy,
        r.y + Math.cos(z * 0.33) * 0.85 * loopy - 0.25,
        z,
      ),
    );
  }
  // the knot: a small trefoil at the end, then back into the badge ring
  const end = new THREE.Vector3(0, 0, -115.5);
  for (let i = 0; i <= 40; i++) {
    const a = (i / 40) * Math.PI * 2;
    pts.push(
      new THREE.Vector3(
        end.x + (Math.sin(a) + 2 * Math.sin(2 * a)) * 0.22,
        end.y + (Math.cos(a) - 2 * Math.cos(2 * a)) * 0.22 + 0.2,
        end.z - Math.sin(3 * a) * 0.25,
      ),
    );
  }
  return new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.5);
}
