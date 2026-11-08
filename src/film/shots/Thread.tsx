'use client';
import * as THREE from 'three';
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { film } from '../state';
import { useShader } from '../useShader';
import { buildThreadCurve } from '../rail';

/** Ek Dhaaga: one gold thread from the coin rim to the knot, revealed ahead of the camera. */
export function Thread({ segments = 1400, glowSprite }: { segments?: number; glowSprite?: THREE.Texture | null }) {
  const curve = useMemo(() => buildThreadCurve(film.mobile), []);
  const geo = useMemo(() => new THREE.TubeGeometry(curve, segments, 0.016, 6, false), [curve, segments]);
  const head = useRef<THREE.Sprite>(null);
  const uniforms = useMemo(
    () => ({
      uReveal: { value: 0 },
      uTime: { value: 0 },
      uGlow: { value: 0 },
      uLength: { value: curve.getLength() },
    }),
    [curve],
  );
  const material = useShader(
    {
    uniforms: uniforms,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */ `
            varying vec2 vUv; varying vec3 vN; varying vec3 vV; varying float vDepth;
            void main(){
              vUv = uv;
              vec4 mv = modelViewMatrix * vec4(position, 1.0);
              vDepth = -mv.z;
              vN = normalize(normalMatrix * normal);
              vV = normalize(-mv.xyz);
              gl_Position = projectionMatrix * mv;
            }`,
    fragmentShader: /* glsl */ `
            uniform float uReveal; uniform float uTime; uniform float uGlow; uniform float uLength;
            varying vec2 vUv; varying vec3 vN; varying vec3 vV; varying float vDepth;
            void main(){
              if (vUv.x > uReveal) discard;
              float near = smoothstep(0.6, 2.4, vDepth) * smoothstep(34.0, 12.0, vDepth); // never a streak across the lens
              float fres = pow(1.0 - abs(dot(vN, vV)), 1.5);
              float behind = (uReveal - vUv.x) * uLength;           // world units behind the head
              float headGlow = exp(-behind * 1.4);
              float after = 0.55 + 0.45 * exp(-behind * 0.05);       // faint afterglow trail
              float glint = pow(0.5 + 0.5 * sin(vUv.x * uLength * 2.2 - uTime * 3.0), 18.0);
              vec3 gold = mix(vec3(0.54, 0.39, 0.09), vec3(0.91, 0.77, 0.42), 0.5 + 0.5 * fres);
              vec3 col = gold * (0.8 + fres) * after + vec3(1.0, 0.95, 0.8) * (headGlow * 1.4 + glint * 0.4);
              gl_FragColor = vec4(col * uGlow * near, 1.0);
            }`,
    },
  );
  const reveal = useRef(0);
  const tmp = useMemo(() => new THREE.Vector3(), []);

  useFrame((s, dt) => {
    uniforms.uTime.value += dt;
    // Unspools from the rim as the coin turns edge-on, then leads the camera.
    const fromTurn = THREE.MathUtils.smoothstep(film.u.hero.turn, 0.45, 1) * 0.035;
    const camZ = s.camera.position.z;
    const fromCam = THREE.MathUtils.clamp((5.6 - (camZ - 10)) / 121, 0, 1) - 0.05;
    const target = Math.min(1, Math.max(fromTurn, film.chapter >= 1 ? fromCam : fromTurn, film.u.knot.tie));
    reveal.current = THREE.MathUtils.damp(reveal.current, target, 3, dt);
    uniforms.uReveal.value = reveal.current;
    uniforms.uGlow.value = 0.6 + film.u.thread.glow * 0.8 + Math.min(1, Math.abs(film.velocity) / 3000) * 0.6;
    if (head.current) {
      curve.getPointAt(Math.max(0.0005, reveal.current), tmp);
      head.current.position.copy(tmp);
      head.current.visible = reveal.current > 0.002 && reveal.current < 0.999;
    }
  });

  return (
    <group>
      <mesh geometry={geo} material={material} frustumCulled={false}>
      </mesh>
      {glowSprite && (
        <sprite ref={head} scale={[0.5, 0.5, 0.5]}>
          <spriteMaterial map={glowSprite} transparent depthWrite={false} blending={THREE.AdditiveBlending} />
        </sprite>
      )}
    </group>
  );
}
