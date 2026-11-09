'use client';
import * as THREE from 'three';
import { useMemo, useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { SVGLoader } from 'three/examples/jsm/loaders/SVGLoader.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { film } from '../state';
import { anchor } from '../rail';
import glyph from '../shri-glyph.json';
import { getThemeColor } from '@/lib/theme';

/**
 * The knot: the thread coils back into the badge ring, and a giant श्री in gold foil —
 * extruded from a pre-shaped SVG path (HarfBuzz, at build time) — catches light from the pointer.
 */
export function Knot() {
  const pos = useMemo(() => anchor(10, 6.5), []);
  const geo = useMemo(() => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg"><path d="${glyph.d}"/></svg>`;
    const data = new SVGLoader().parse(svg);
    const shapes = data.paths.flatMap((p) => p.toShapes());
    const g = new THREE.ExtrudeGeometry(shapes, { depth: 70, bevelEnabled: true, bevelThickness: 14, bevelSize: 8, bevelSegments: 3, curveSegments: 10 });
    const merged = mergeGeometries([g]) ?? g;
    merged.center();
    const s = 2.3 / (glyph.box.maxX - glyph.box.minX);
    merged.scale(s, -s, s); // SVG y-down → three y-up
    merged.computeVertexNormals();
    if (merged !== g) g.dispose();
    return merged;
  }, []);
  useEffect(() => () => geo.dispose(), [geo]);
  const shri = useRef<THREE.Mesh>(null);
  const ring = useRef<THREE.Mesh>(null);
  const light = useRef<THREE.PointLight>(null);

  useFrame((s, dt) => {
    const { tie, shri: k } = film.u.knot;
    if (ring.current) {
      ring.current.scale.setScalar(THREE.MathUtils.lerp(0.2, 1, THREE.MathUtils.smoothstep(tie, 0.2, 0.8)));
      ring.current.rotation.z += dt * 0.2;
      ring.current.visible = tie > 0.05;
    }
    if (shri.current) {
      const e = THREE.MathUtils.smootherstep(k, 0, 1);
      shri.current.scale.setScalar(Math.max(0.001, e));
      shri.current.rotation.y = THREE.MathUtils.damp(shri.current.rotation.y, (1 - e) * 1.2 + film.pointer.x * 0.25, 3, dt);
      shri.current.rotation.x = THREE.MathUtils.damp(shri.current.rotation.x, -film.pointer.y * 0.15, 3, dt);
      shri.current.visible = k > 0.01;
    }
    if (light.current) {
      light.current.position.set(pos.x + film.pointer.x * 2.5, pos.y + film.pointer.y * 1.8, pos.z + 2.2);
    }
    void s;
  });

  return (
    <group>
      <pointLight ref={light} intensity={18} distance={8} color={getThemeColor('--pigment-light-soft')} />
      <mesh ref={ring} position={pos}>
        <torusGeometry args={[1.75, 0.035, 16, 160]} />
        <meshPhysicalMaterial color={getThemeColor('--gold-300')} metalness={1} roughness={0.18} clearcoat={1} emissive={getThemeColor('--gold-700')} emissiveIntensity={0.4} />
      </mesh>
      <mesh ref={shri} geometry={geo} position={[pos.x, pos.y + 0.05, pos.z]}>
        <meshPhysicalMaterial color={getThemeColor('--gold-300')} metalness={1} roughness={0.16} clearcoat={1} clearcoatRoughness={0.08} envMapIntensity={1.8} />
      </mesh>
    </group>
  );
}
