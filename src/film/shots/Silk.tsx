'use client';
import * as THREE from 'three';
import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import CustomShaderMaterial from 'three-custom-shader-material';
import { film } from '../state';
import { anchor } from '../rail';
import { SNOISE } from '../glsl';
import { WEAVE_FABRICS, fabricTexture } from '../textures';
import { palette } from '@/lib/palette';

const W = 4.4;
const H = 2.9;

const vertex = /* glsl */ `
  uniform float uTime; uniform float uWind;
  varying vec2 vUv2;
  ${SNOISE}
  float disp(vec2 p){
    return snoise(vec3(p * 0.55, uTime * 0.22)) * 0.28 * uWind
         + sin(p.x * 1.3 + uTime * 0.9) * 0.07
         + (p.y + 1.45) * 0.02 * sin(uTime * 0.7 + p.x);
  }
  void main(){
    vUv2 = uv;
    vec2 p = position.xy;
    float e = 0.02;
    float h = disp(p);
    float hx = disp(p + vec2(e, 0.0));
    float hy = disp(p + vec2(0.0, e));
    csm_Position = position + vec3(0.0, 0.0, h);
    csm_Normal = normalize(cross(vec3(e, 0.0, hx - h), vec3(0.0, e, hy - h)));
  }
`;

const fragment = /* glsl */ `
  uniform sampler2D uTexA; uniform sampler2D uTexB;
  uniform float uMix; uniform float uAlpha; uniform float uTime;
  uniform vec3 uTint; uniform float uTintAmt;
  varying vec2 vUv2;
  ${SNOISE}
  void main(){
    vec2 uv = vUv2 * vec2(2.2, 1.45);
    vec3 a = texture2D(uTexA, uv).rgb;
    vec3 b = texture2D(uTexB, uv).rgb;
    float n = snoise(vec3(vUv2 * 3.2, 0.7)) * 0.5 + 0.5;
    float m = uMix * 1.12 - 0.06;
    float edge = 1.0 - smoothstep(0.0, 0.045, abs(n - m));
    vec3 col = n < m ? b : a;
    float l = dot(col, vec3(0.299, 0.587, 0.114));
    col = mix(col, uTint * (0.35 + l * 1.35), uTintAmt);
    csm_DiffuseColor = vec4(col, uAlpha);
    csm_Emissive = vec3(1.0, 0.78, 0.35) * edge * 2.4 * step(0.001, uMix) * step(uMix, 0.999);
  }
`;

/** Silk sheet with a zari-edged noise dissolve between fabrics, and an optional colour tint. */
export function Silk({ index, mode, segments }: { index: number; mode: 'weave' | 'tint'; segments: number }) {
  const pos = useMemo(() => anchor(index, 6.2), [index]);
  const textures = useMemo(
    () =>
      mode === 'weave'
        ? WEAVE_FABRICS.map((f) => fabricTexture(f.kind, f.base, 512, 1))
        : [fabricTexture('Chanderi', '#EDE6D6', 512, 1)],
    [mode],
  );
  useEffect(() => () => textures.forEach((t) => t.dispose()), [textures]);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uWind: { value: 1 },
      uTexA: { value: textures[0] },
      uTexB: { value: textures[Math.min(1, textures.length - 1)] },
      uMix: { value: 0 },
      uAlpha: { value: 0 },
      uTint: { value: new THREE.Color(palette.gold300) },
      uTintAmt: { value: 0 },
    }),
    [textures],
  );
  const mesh = useRef<THREE.Mesh>(null);
  const threads = useRef<THREE.InstancedMesh>(null);
  const N = Math.max(10, Math.round(segments / 5));
  const dummy = useMemo(() => new THREE.Object3D(), []);

  useFrame((s, dt) => {
    uniforms.uTime.value += dt;
    if (mode === 'weave') {
      const { fabric, sheet, assemble } = film.u.weave;
      const a = Math.min(textures.length - 1, Math.floor(fabric));
      uniforms.uTexA.value = textures[a];
      uniforms.uTexB.value = textures[Math.min(textures.length - 1, a + 1)];
      uniforms.uMix.value = fabric - a;
      uniforms.uAlpha.value = sheet;
      // warp and weft fly in from the thread and settle into a grid, then hand over to the sheet
      const im = threads.current;
      if (im) {
        im.visible = assemble > 0.001 && sheet < 0.999;
        for (let i = 0; i < N * 2; i++) {
          const warp = i < N;
          const j = warp ? i : i - N;
          const k = THREE.MathUtils.clamp(assemble * 1.7 - (j / N) * 0.7, 0, 1);
          const e = 1 - Math.pow(1 - k, 3);
          const tx = warp ? -W / 2 + (j + 0.5) * (W / N) : 0;
          const ty = warp ? 0 : -H / 2 + (j + 0.5) * (H / N);
          dummy.position.set(THREE.MathUtils.lerp(-3.5, tx, e), THREE.MathUtils.lerp(-1.6, ty, e), THREE.MathUtils.lerp(2, 0.02, e));
          dummy.rotation.set(0, 0, warp ? 0 : Math.PI / 2);
          dummy.scale.set(1, Math.max(0.001, e) * (warp ? H : W), 1);
          dummy.updateMatrix();
          im.setMatrixAt(i, dummy.matrix);
        }
        im.instanceMatrix.needsUpdate = true;
        (im.material as THREE.MeshBasicMaterial).opacity = 1 - sheet;
      }
    } else {
      const c = film.u.chakra;
      uniforms.uAlpha.value = c.show;
      (uniforms.uTint.value as THREE.Color).setRGB(...c.tint);
      uniforms.uTintAmt.value = c.tintAmt;
    }
    if (mesh.current) {
      mesh.current.visible = uniforms.uAlpha.value > 0.002;
      mesh.current.rotation.y = THREE.MathUtils.damp(mesh.current.rotation.y, film.pointer.x * 0.12, 2, dt);
    }
  });

  const seg = Math.max(24, segments);
  return (
    <group position={pos}>
      <mesh ref={mesh} rotation={[-0.08, 0, 0.04]}>
        <planeGeometry args={[W, H, seg, Math.round(seg * 0.66)]} />
        <CustomShaderMaterial
          baseMaterial={THREE.MeshPhysicalMaterial}
          vertexShader={vertex}
          fragmentShader={fragment}
          uniforms={uniforms}
          transparent
          side={THREE.DoubleSide}
          roughness={0.42}
          sheen={1}
          sheenRoughness={0.3}
          sheenColor={palette.gold100}
          anisotropy={0.6}
          emissive="#000000"
          depthWrite={false}
        />
      </mesh>
      {mode === 'weave' && (
        <instancedMesh ref={threads} args={[undefined, undefined, N * 2]} frustumCulled={false}>
          <boxGeometry args={[0.012, 1, 0.012]} />
          <meshBasicMaterial color={palette.gold300} transparent blending={THREE.AdditiveBlending} depthWrite={false} />
        </instancedMesh>
      )}
    </group>
  );
}
