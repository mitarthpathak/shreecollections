'use client';
import * as THREE from 'three';
import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import CustomShaderMaterial from 'three-custom-shader-material';
import { film } from '../state';
import { anchor } from '../rail';
import { SNOISE } from '../glsl';
import { fabricTexture } from '../textures';
import { WEAVE_FABRICS } from '../fabrics';
import { getThemeColor } from '@/lib/theme';
import { sceneTheme } from '../sceneTheme';
import { flatNormal, loadFabricPhoto } from '../fabricPhotos';

const W = 5.6;
const H = 3.6;

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
  uniform vec3 uTint; uniform float uTintAmt; uniform vec3 uEdge;
  varying vec2 vUv2;
  ${SNOISE}
  void main(){
    vec2 uv = vUv2 * vec2(2.2, 1.45);
    vec3 a = texture2D(uTexA, uv).rgb;
    vec3 b = texture2D(uTexB, uv).rgb;
    float n = snoise(vec3(vUv2 * 7.0, 0.7)) * 0.35 + snoise(vec3(vUv2 * 2.2, 1.9)) * 0.15 + 0.5;
    float m = uMix * 1.12 - 0.06;
    float edge = 1.0 - smoothstep(0.0, 0.025, abs(n - m));
    vec3 col = n < m ? b : a;
    float l = dot(col, vec3(0.299, 0.587, 0.114));
    col = mix(col, uTint * (0.18 + l * 0.85), uTintAmt);
    csm_DiffuseColor = vec4(col, uAlpha);
    csm_Emissive = uEdge * edge * 2.4 * step(0.001, uMix) * step(uMix, 0.999);
  }
`;

/** Silk sheet with a zari-edged noise dissolve between fabrics, and an optional colour tint. */
export function Silk({ index, mode, segments }: { index: number; mode: 'weave' | 'tint'; segments: number }) {
  const pos = useMemo(() => anchor(index, 6.2), [index]);
  const textures = useMemo(
    () =>
      mode === 'weave'
        ? WEAVE_FABRICS.map((f) => fabricTexture(f.kind, f.base, 512, 1))
        : [fabricTexture('Chanderi', getThemeColor('--pigment-chanderi'), 512, 1)],
    [mode],
  );
  useEffect(() => () => textures.forEach((t) => t.dispose()), [textures]);

  // Real fabric photos replace the procedural textures where the owner has added them.
  const live = useRef<THREE.Texture[] | null>(null);
  const normals = useRef<(THREE.Texture | null)[]>([]);
  const flat = useMemo(() => flatNormal(), []);
  const mat = useRef<THREE.MeshPhysicalMaterial | null>(null);
  useEffect(() => {
    if (mode !== 'weave') return;
    let alive = true;
    const loaded: THREE.Texture[] = [];
    Promise.all(WEAVE_FABRICS.map((f) => loadFabricPhoto(f.kind).catch(() => null))).then((photos) => {
      photos.forEach((ph) => ph && loaded.push(ph.albedo, ...(ph.normal ? [ph.normal] : [])));
      if (!alive) return loaded.forEach((t) => t.dispose());
      if (!photos.some(Boolean)) return;
      live.current = textures.map((t, i) => photos[i]?.albedo ?? t);
      normals.current = photos.map((ph) => ph?.normal ?? null);
    });
    return () => {
      alive = false;
      loaded.forEach((t) => t.dispose());
    };
  }, [mode, textures]);
  useEffect(() => () => flat.dispose(), [flat]);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uWind: { value: 1 },
      uTexA: { value: textures[0] as THREE.Texture },
      uTexB: { value: textures[Math.min(1, textures.length - 1)] as THREE.Texture },
      uMix: { value: 0 },
      uAlpha: { value: 0 },
      uTint: { value: new THREE.Color(getThemeColor('--gold-300')) },
      uTintAmt: { value: 0 },
      uEdge: { value: new THREE.Color() },
    }),
    [textures],
  );
  const mesh = useRef<THREE.Mesh>(null);
  const threads = useRef<THREE.InstancedMesh>(null);
  const N = Math.max(10, Math.round(segments / 5));
  const dummy = useMemo(() => new THREE.Object3D(), []);

  useFrame((s, dt) => {
    uniforms.uTime.value += dt;
    (uniforms.uEdge.value as THREE.Color).copy(sceneTheme.glint);
    const tm = threads.current?.material as THREE.MeshBasicMaterial | undefined;
    if (tm) {
      // gold light on Raat; a printed gold line on Kagaz (additive gold vanishes on ivory)
      tm.blending = sceneTheme.light > 0.5 ? THREE.NormalBlending : THREE.AdditiveBlending;
      tm.color.copy(sceneTheme.coinRim);
    }
    if (mode === 'weave') {
      const { fabric, sheet, assemble } = film.u.weave;
      const tx = live.current ?? textures;
      const a = Math.min(tx.length - 1, Math.floor(fabric));
      uniforms.uTexA.value = tx[a];
      uniforms.uTexB.value = tx[Math.min(tx.length - 1, a + 1)];
      const nm = normals.current[Math.round(fabric)] ?? flat;
      if (mat.current && mat.current.normalMap !== nm) mat.current.normalMap = nm;
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
        (im.material as THREE.MeshBasicMaterial).opacity = (1 - sheet) * 0.75;
      }
    } else {
      const c = film.u.chakra;
      uniforms.uAlpha.value = c.show * 0.9;
      (uniforms.uTint.value as THREE.Color).setRGB(...c.tint);
      uniforms.uTintAmt.value = 0.55 + c.tintAmt * 0.4;
    }
    if (mesh.current) {
      mesh.current.visible = uniforms.uAlpha.value > 0.002;
      mesh.current.rotation.y = THREE.MathUtils.damp(mesh.current.rotation.y, film.pointer.x * 0.12, 2, dt);
    }
  });

  const seg = Math.max(24, segments);
  return (
    <group position={[pos.x + (film.mobile ? 0 : 0.9), pos.y + (film.mobile ? 0.9 : 0.35), pos.z]} scale={film.mobile ? 0.5 : 1}>
      <mesh ref={mesh} rotation={[-0.08, 0, 0.04]}>
        <planeGeometry args={[W, H, seg, Math.round(seg * 0.66)]} />
        <CustomShaderMaterial
          ref={(m) => void (mat.current = m as unknown as THREE.MeshPhysicalMaterial | null)}
          baseMaterial={THREE.MeshPhysicalMaterial}
          normalMap={flat}
          vertexShader={vertex}
          fragmentShader={fragment}
          uniforms={uniforms}
          transparent
          side={THREE.DoubleSide}
          roughness={0.42}
          sheen={1}
          sheenRoughness={0.3}
          sheenColor={getThemeColor('--gold-100')}
          anisotropy={0.6}
          depthWrite={false}
        />
      </mesh>
      {mode === 'weave' && (
        <instancedMesh ref={threads} args={[undefined, undefined, N * 2]} frustumCulled={false}>
          <boxGeometry args={[0.006, 1, 0.006]} />
          <meshBasicMaterial color={getThemeColor('--gold-500')} transparent blending={THREE.AdditiveBlending} depthWrite={false} />
        </instancedMesh>
      )}
    </group>
  );
}
