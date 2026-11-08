'use client';
import * as THREE from 'three';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { film } from '../state';
import { rail, stationT } from '../rail';

const N = 8;
const R = 4.2;

/** A curved, cylindrical wall of lookbook photos. Scroll velocity bends the planes and adds a whisper of RGB shift. */
export function LookbookWall() {
  const [maps, setMaps] = useState<THREE.Texture[]>([]);
  useEffect(() => {
    const loader = new THREE.TextureLoader();
    let alive = true;
    Promise.all(Array.from({ length: N }, (_, i) => loader.loadAsync(`/lookbook/look-${i + 1}.webp`))).then((ts) => {
      ts.forEach((t) => (t.colorSpace = THREE.SRGBColorSpace));
      if (alive) setMaps(ts);
      else ts.forEach((t) => t.dispose());
    });
    return () => {
      alive = false;
    };
  }, []);
  useEffect(() => () => maps.forEach((t) => t.dispose()), [maps]);

  const center = useMemo(() => rail.getPoint(stationT(8)).add(new THREE.Vector3(0, 0, -1.6)), []);
  const group = useRef<THREE.Group>(null);
  const shared = useMemo(() => ({ uVel: { value: 0 }, uShow: { value: 0 } }), []);

  useFrame((_, dt) => {
    const g = group.current;
    if (!g) return;
    const { spin, show } = film.u.lookbook;
    g.rotation.y = THREE.MathUtils.damp(g.rotation.y, -spin * 1.6 + 0.8, 4, dt);
    shared.uVel.value = THREE.MathUtils.damp(shared.uVel.value, THREE.MathUtils.clamp(film.velocity / 3000, -1, 1), 6, dt);
    shared.uShow.value = show;
    g.visible = show > 0.01;
  });

  return (
    <group ref={group} position={center}>
      {maps.map((map, i) => {
        const a = (i - (N - 1) / 2) * 0.42;
        return (
          <mesh key={i} position={[Math.sin(a) * R, 0, -Math.cos(a) * R]} rotation={[0, -a, 0]}>
            <planeGeometry args={[1.5, 2, 24, 1]} />
            <shaderMaterial
              transparent
              uniforms={{ ...shared, uMap: { value: map } }}
              vertexShader={/* glsl */ `
                uniform float uVel; varying vec2 vUv;
                void main(){
                  vUv = uv;
                  vec3 p = position;
                  p.z += sin(uv.x * 3.14159) * uVel * 0.35;
                  p.y += sin(uv.x * 3.14159) * uVel * 0.08;
                  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
                }`}
              fragmentShader={/* glsl */ `
                uniform sampler2D uMap; uniform float uVel; uniform float uShow; varying vec2 vUv;
                void main(){
                  float sh = uVel * 0.006;
                  vec3 c = vec3(texture2D(uMap, vUv + vec2(sh, 0.0)).r, texture2D(uMap, vUv).g, texture2D(uMap, vUv - vec2(sh, 0.0)).b);
                  gl_FragColor = vec4(c, uShow);
                }`}
            />
          </mesh>
        );
      })}
    </group>
  );
}
