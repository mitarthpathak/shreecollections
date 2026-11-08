'use client';
import * as THREE from 'three';
import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { film } from '../state';
import { anchor } from '../rail';
import { matkiTexture } from '../textures';
import { rng } from '../rng';
import { getThemeColor } from '@/lib/theme';

/**
 * Makhan Chor Picks: a procedural matki (LatheGeometry) tilts; gold coins and drops pour out
 * and settle. Every particle is a pure function of `pour`, so scrolling back un-pours it.
 */
export function Matki({ coins = 48 }: { coins?: number }) {
  const base = useMemo(() => anchor(7, 6), []);
  const tex = useMemo(() => matkiTexture(), []);
  useEffect(() => () => tex.dispose(), [tex]);
  const geo = useMemo(() => {
    const prof: [number, number][] = [
      [0, -0.95], [0.35, -0.92], [0.7, -0.75], [0.92, -0.45], [0.98, -0.1], [0.9, 0.25], [0.68, 0.52], [0.42, 0.68], [0.36, 0.78], [0.42, 0.86], [0.48, 0.9], [0.44, 0.94], [0.34, 0.9],
    ];
    return new THREE.LatheGeometry(prof.map(([x, y]) => new THREE.Vector2(x, y)), 72);
  }, []);
  const pot = useRef<THREE.Group>(null);
  const coinMesh = useRef<THREE.InstancedMesh>(null);
  const dropMesh = useRef<THREE.InstancedMesh>(null);
  const drops = Math.round(coins * 0.6);
  const seeds = useMemo(() => {
    const random = rng(11);
    return Array.from({ length: coins + drops }, (_, i) => ({ d: (i / (coins + drops)) * 0.55 + random() * 0.05, vx: 1.2 + random() * 1.4, vz: (random() - 0.5) * 1.2, spin: random() * 10, floorX: 0 }));
  }, [coins, drops]);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const mouth = useMemo(() => new THREE.Vector3(), []);

  useFrame((s) => {
    const { pour, show } = film.u.picks;
    const g = pot.current;
    if (!g) return;
    g.visible = show > 0.01;
    const dir = film.mobile ? 1 : -1;
    const tilt = THREE.MathUtils.smoothstep(pour, 0, 0.35) * 1.15;
    g.rotation.z = dir * tilt;
    g.scale.setScalar((film.mobile ? 0.5 : 0.75) * (0.9 * show + 0.1));
    // mouth position in world space
    mouth.set(0, 0.92, 0).applyEuler(g.rotation).multiplyScalar(g.scale.x).add(g.position);
    const write = (mesh: THREE.InstancedMesh | null, from: number, n: number) => {
      if (!mesh) return;
      for (let i = 0; i < n; i++) {
        const sd = seeds[from + i];
        const tau = Math.max(0, (pour - 0.25 - sd.d) * 2.2);
        if (tau <= 0) {
          dummy.scale.setScalar(0.0001);
        } else {
          const x = mouth.x - dir * sd.vx * tau * (film.mobile ? 0.5 : 1);
          const yRaw = mouth.y + 0.6 * tau - 4.9 * tau * tau;
          const floor = (film.mobile ? -2.1 : -1.55) + (i % 5) * 0.02;
          const y = Math.max(floor, yRaw);
          dummy.position.set(x, y, mouth.z + sd.vz * tau);
          dummy.rotation.set(sd.spin * tau, sd.spin * tau * 0.7, yRaw > floor ? sd.spin * tau : 1.4);
          dummy.scale.setScalar(1);
        }
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
      }
      mesh.instanceMatrix.needsUpdate = true;
      mesh.visible = show > 0.01;
    };
    write(coinMesh.current, 0, coins);
    write(dropMesh.current, coins, drops);
    void s;
  });

  return (
    <group>
      <group ref={pot} position={film.mobile ? [base.x + 0.75, base.y + 1.75, base.z] : [base.x - 2.7, base.y + 0.55, base.z]}>
        <mesh geometry={geo}>
          <meshPhysicalMaterial map={tex} roughness={0.75} clearcoat={0.3} clearcoatRoughness={0.6} side={THREE.DoubleSide} />
        </mesh>
        <mesh position={[0, 0.9, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.36, 32]} />
          <meshStandardMaterial color={getThemeColor('--ivory')} roughness={0.9} emissive={getThemeColor('--pigment-clay-glow')} />
        </mesh>
      </group>
      <instancedMesh ref={coinMesh} args={[undefined, undefined, coins]} frustumCulled={false}>
        <cylinderGeometry args={[0.07, 0.07, 0.012, 20]} />
        <meshPhysicalMaterial color={getThemeColor('--gold-300')} metalness={1} roughness={0.22} clearcoat={1} />
      </instancedMesh>
      <instancedMesh ref={dropMesh} args={[undefined, undefined, drops]} frustumCulled={false}>
        <sphereGeometry args={[0.035, 12, 10]} />
        <meshPhysicalMaterial color={getThemeColor('--gold-100')} metalness={1} roughness={0.1} />
      </instancedMesh>
    </group>
  );
}
