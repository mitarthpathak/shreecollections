'use client';
import * as THREE from 'three';
import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { film } from '../state';
import { featherTexture } from '../textures';

/** Mor pankh: a peacock feather with a thin-film iridescent eye sweeps across the lens. */
export function Feather() {
  const tex = useMemo(() => featherTexture(), []);
  useEffect(() => () => tex.dispose(), [tex]);
  const ref = useRef<THREE.Mesh>(null);
  const uniforms = useMemo(() => ({ uMap: { value: tex }, uTime: { value: 0 }, uFade: { value: 1 } }), [tex]);
  const v = useMemo(() => new THREE.Vector3(), []);
  const q = useMemo(() => new THREE.Quaternion(), []);

  useFrame((s, dt) => {
    const m = ref.current;
    if (!m) return;
    uniforms.uTime.value += dt;
    const k = film.u.mor.sweep; // 0..1
    m.visible = k > 0.001 && k < 0.999;
    if (!m.visible) return;
    // camera-space placement: in from the left, the eye swelling to fill the frame
    const e = THREE.MathUtils.smootherstep(k, 0, 1);
    const x = THREE.MathUtils.lerp(-2.6, 0.05, Math.min(1, e * 1.4));
    const y = THREE.MathUtils.lerp(-0.6, -1.7, e);
    const z = THREE.MathUtils.lerp(-3.2, -0.5, e);
    v.set(x, y, z).applyQuaternion(s.camera.quaternion).add(s.camera.position);
    m.position.copy(v);
    q.copy(s.camera.quaternion);
    m.quaternion.copy(q);
    m.rotateZ(THREE.MathUtils.lerp(-0.9, 0, e));
    uniforms.uFade.value = 1 - THREE.MathUtils.smoothstep(k, 0.85, 1);
  });

  return (
    <mesh ref={ref} frustumCulled={false} renderOrder={10}>
      <planeGeometry args={[1.4, 2.8, 1, 1]} />
      <shaderMaterial
        uniforms={uniforms}
        transparent
        depthTest={false}
        depthWrite={false}
        vertexShader={/* glsl */ `
          varying vec2 vUv; varying vec3 vN; varying vec3 vV;
          void main(){ vUv = uv; vec4 mv = modelViewMatrix * vec4(position,1.0); vN = normalize(normalMatrix*normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }`}
        fragmentShader={/* glsl */ `
          uniform sampler2D uMap; uniform float uTime; uniform float uFade;
          varying vec2 vUv; varying vec3 vN; varying vec3 vV;
          void main(){
            vec4 t = texture2D(uMap, vUv);
            // thin-film: hue drifts with view angle and position
            float th = dot(vN, vV) * 0.6 + vUv.y * 1.4 + sin(uTime * 0.6) * 0.15;
            vec3 film = 0.5 + 0.5 * cos(6.2831 * (vec3(0.0, 0.33, 0.67) + th));
            float teal = smoothstep(0.1, 0.6, t.b + t.g - t.r);
            vec3 c = mix(t.rgb, t.rgb * 0.6 + film * 0.55, teal * 0.8);
            gl_FragColor = vec4(c, t.a * uFade);
          }`}
      />
    </mesh>
  );
}
