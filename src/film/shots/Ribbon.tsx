'use client';
import * as THREE from 'three';
import { useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { film } from '../state';
import { useShader } from '../useShader';
import { anchor } from '../rail';
import { sareeTexture } from '../textures';

/** Six yards: the silk stretched into one long flowing ribbon, synced to the gallery. */
export function Ribbon({ segments = 300 }: { segments?: number }) {
  const pos = useMemo(() => anchor(3, 6.5), []);
  const tex = useMemo(() => sareeTexture(1024), []);
  useEffect(() => () => tex.dispose(), [tex]);
  const uniforms = useMemo(() => ({ uTime: { value: 0 }, uFlow: { value: 0 }, uShow: { value: 0 }, uMap: { value: tex } }), [tex]);
  const material = useShader(
    {
    uniforms: uniforms,
    transparent: true,
    side: THREE.DoubleSide,
    depthWrite: false,
    vertexShader: /* glsl */ `
          uniform float uTime; uniform float uFlow;
          varying vec2 vUv; varying float vShade;
          void main(){
            vUv = uv;
            vec3 p = position;
            float ph = p.x * 0.42 - uFlow * 9.0 + uTime * 0.35;
            p.z += sin(ph) * 0.55;
            p.y += sin(ph * 0.7 + 1.3) * 0.25 + (uv.y - 0.5) * sin(ph) * 0.35; // a gentle twist
            vShade = 0.65 + 0.35 * cos(ph);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
          }`,
    fragmentShader: /* glsl */ `
          uniform sampler2D uMap; uniform float uShow; uniform float uFlow;
          varying vec2 vUv; varying float vShade;
          void main(){
            vec3 c = texture2D(uMap, vec2(vUv.x * 6.0 - uFlow * 2.0, vUv.y)).rgb * vShade;
            float edge = smoothstep(0.0, 0.08, vUv.x) * smoothstep(1.0, 0.92, vUv.x);
            gl_FragColor = vec4(c, uShow * edge);
          }`,
    },
  );

  useFrame((_, dt) => {
    uniforms.uTime.value += dt;
    uniforms.uFlow.value = THREE.MathUtils.damp(uniforms.uFlow.value, film.u.ribbon.flow, 5, dt);
    uniforms.uShow.value = film.u.ribbon.show;
  });

  return (
    <mesh material={material} position={[pos.x, pos.y + (film.mobile ? 0.2 : 1.35), pos.z]} rotation={[0.1, 0, -0.06]} frustumCulled={false}>
      <planeGeometry args={[26, 1.1, segments, 8]} />
    </mesh>
  );
}
