'use client';
import * as THREE from 'three';
import { useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { film } from '../state';
import { rail } from '../rail';
import { rng } from '../rng';

/** A slow field of gold dust along the whole rail; streaks brighter with scroll velocity. */
export function Dust({ count }: { count: number }) {
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const p = new Float32Array(count * 3);
    const seed = new Float32Array(count);
    const v = new THREE.Vector3();
    const random = rng(7);
    for (let i = 0; i < count; i++) {
      rail.getPoint(random(), v);
      const r = 1.2 + Math.pow(random(), 0.6) * 7;
      const a = random() * Math.PI * 2;
      p[i * 3] = v.x + Math.cos(a) * r;
      p[i * 3 + 1] = v.y + Math.sin(a) * r * 0.7;
      p[i * 3 + 2] = v.z + (random() - 0.5) * 10;
      seed[i] = random();
    }
    g.setAttribute('position', new THREE.BufferAttribute(p, 3));
    g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
    return g;
  }, [count]);
  const uniforms = useMemo(() => ({ uTime: { value: 0 }, uVel: { value: 0 }, uPx: { value: 1 } }), []);

  useFrame((s, dt) => {
    uniforms.uTime.value += dt;
    uniforms.uVel.value = THREE.MathUtils.damp(uniforms.uVel.value, Math.min(1, Math.abs(film.velocity) / 2500), 6, dt);
    uniforms.uPx.value = s.gl.getPixelRatio();
  });

  if (!count) return null;
  return (
    <points geometry={geo} frustumCulled={false}>
      <shaderMaterial
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        vertexShader={/* glsl */ `
          uniform float uTime; uniform float uVel; uniform float uPx;
          attribute float aSeed; varying float vA;
          void main(){
            vec3 p = position;
            p.y += sin(uTime * 0.2 + aSeed * 40.0) * 0.25;
            p.x += cos(uTime * 0.15 + aSeed * 30.0) * 0.2;
            vec4 mv = modelViewMatrix * vec4(p, 1.0);
            float tw = 0.55 + 0.45 * sin(uTime * (1.0 + aSeed * 2.0) + aSeed * 60.0);
            vA = tw * (0.35 + uVel * 0.65) * smoothstep(40.0, 4.0, -mv.z);
            gl_PointSize = min(3.2, (1.0 + aSeed * 1.6) * (1.0 + uVel * 1.2) * (18.0 / -mv.z)) * uPx;
            gl_Position = projectionMatrix * mv;
          }`}
        fragmentShader={/* glsl */ `
          varying float vA;
          void main(){
            float d = length(gl_PointCoord - 0.5);
            if (d > 0.5) discard;
            float a = smoothstep(0.5, 0.0, d) * vA;
            gl_FragColor = vec4(vec3(1.0, 0.84, 0.5) * a, a);
          }`}
      />
    </points>
  );
}
