'use client';
import * as THREE from 'three';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import CustomShaderMaterial from 'three-custom-shader-material';
import type CustomShaderMaterialImpl from 'three-custom-shader-material/vanilla';
import { easing } from 'maath';
import { film } from '../state';
import { heroCoinPlacement, type CoinPlacement } from '../rail';
import { badgeTexture, glowTexture } from '../textures';
import { getThemeColor } from '@/lib/theme';
import { sceneTheme } from '../sceneTheme';

/** Identity colour: the emissive map shows as painted (not a design colour). */
const AS_PAINTED = new THREE.Color(1, 1, 1);

/**
 * The badge as a gold coin. The logo artwork itself only floats, tilts and glows —
 * it is never distorted or run through velocity shaders. The travelling glint lives
 * on the metal rim only.
 *
 * Its size and place come from the hero layout (film.coin): the slot above the copy on
 * portrait screens, right of it on landscape ones — recomputed when either changes.
 *
 * On Kagaz (light) the rim is a deeper gold and a soft warm shadow sits behind the coin, so it
 * doesn't wash out on ivory; both follow the theme in place (sceneTheme).
 */
export function HeroCoin({ onReady }: { onReady?: () => void }) {
  const group = useRef<THREE.Group>(null);
  const spin = useRef<THREE.Group>(null);
  const [face, setFace] = useState<THREE.Texture | null>(null);
  const placed = useMemo<CoinPlacement & { key: string }>(() => ({ pos: new THREE.Vector3(), scale: 1, key: '' }), []);

  useEffect(() => {
    let t: THREE.Texture | null = null;
    badgeTexture().then((tex) => {
      t = tex;
      setFace(tex);
      onReady?.();
    });
    return () => t?.dispose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const rimGeo = useMemo(() => {
    const prof = [
      [1.06, -0.085], [1.15, -0.09], [1.21, -0.07], [1.245, -0.03], [1.25, 0], [1.245, 0.03], [1.21, 0.07], [1.15, 0.09], [1.06, 0.085],
    ].map(([x, y]) => new THREE.Vector2(x, y));
    return new THREE.LatheGeometry(prof, 128);
  }, []);
  const rimUniforms = useMemo(() => ({ uTime: { value: 0 }, uGlint: { value: 1 }, uGlintColor: { value: new THREE.Color() }, uLight: { value: 0 } }), []);
  const rimMat = useRef<CustomShaderMaterialImpl<typeof THREE.MeshPhysicalMaterial>>(null);
  const shadowMat = useRef<THREE.MeshBasicMaterial>(null);
  const shadowTex = useMemo(() => glowTexture(), []);
  useEffect(() => () => shadowTex.dispose(), [shadowTex]);

  useFrame((s, dt) => {
    const g = group.current, sp = spin.current;
    if (!g || !sp) return;
    g.visible = !film.heroVideo; // a hero drape video takes the coin's place
    rimUniforms.uTime.value += dt;
    rimUniforms.uGlintColor.value.copy(sceneTheme.glint);
    rimUniforms.uLight.value = sceneTheme.light;
    (rimMat.current as unknown as THREE.MeshPhysicalMaterial | null)?.color.copy(sceneTheme.coinRim);
    if (shadowMat.current) {
      shadowMat.current.color.copy(sceneTheme.shadow);
      shadowMat.current.opacity = 0.32 * sceneTheme.light;
    }
    const { width, height } = s.size;
    const key = `${film.coin.x}|${film.coin.y}|${film.coin.r}|${width}|${height}|${film.mobile}`;
    if (key !== placed.key) {
      heroCoinPlacement(width, height, film.mobile, placed);
      placed.key = key;
      g.scale.setScalar(placed.scale);
    }
    // float and lift keep their old proportions to the coin's size
    const k = placed.scale / (film.mobile ? 0.6 : 0.88);
    const { pos } = placed;
    const { turn, lift } = film.u.hero;
    const t = s.clock.elapsedTime;
    // Desktop: the coin's face turns toward the mouse, measured from the coin itself (not the
    // middle of the screen), full tilt about three radii away, and settles flat when the mouse
    // leaves the page. Phones: a slow idle sway.
    let tx = 0, ty = 0;
    if (film.mobile) {
      tx = Math.sin(t * 0.6) * 0.5;
      ty = Math.cos(t * 0.5) * 0.4;
    } else if (film.pointer.inside && film.coin.r > 0) {
      const reach = film.coin.r * 3;
      tx = THREE.MathUtils.clamp((film.pointer.cx - film.coin.x) / reach, -1, 1);
      ty = THREE.MathUtils.clamp((film.pointer.cy - film.coin.y) / reach, -1, 1);
    }
    easing.damp(sp.rotation, 'y', turn * (Math.PI / 2) + tx * 0.3 * (1 - turn), 0.35, dt);
    easing.damp(sp.rotation, 'x', ty * 0.22 * (1 - turn), 0.35, dt);
    g.position.set(pos.x, pos.y + (Math.sin(t * 0.8) * 0.06 + lift * 0.2) * k, pos.z);
  });

  return (
    <group ref={group} name="hero-coin">
      {/* soft warm shadow behind the coin (Kagaz only; opacity 0 in Raat) */}
      <mesh position={[0.08, -0.16, -0.4]} renderOrder={-1}>
        <planeGeometry args={[3.6, 3.6]} />
        <meshBasicMaterial ref={shadowMat} map={shadowTex} transparent opacity={0} depthWrite={false} toneMapped={false} />
      </mesh>
      <group ref={spin}>
        {/* rim: bevelled metal with a glint that travels around it */}
        <mesh geometry={rimGeo} rotation={[Math.PI / 2, 0, 0]}>
          <CustomShaderMaterial
            ref={rimMat}
            baseMaterial={THREE.MeshPhysicalMaterial}
            uniforms={rimUniforms}
            vertexShader={/* glsl */ `varying vec3 vPos; void main(){ vPos = position; }`}
            fragmentShader={/* glsl */ `
              uniform float uTime; uniform float uGlint; uniform vec3 uGlintColor; uniform float uLight; varying vec3 vPos;
              void main(){
                float a = atan(vPos.z, vPos.x);
                float g = pow(max(0.0, cos(a - uTime * 0.9)), 60.0) * uGlint;
                csm_Emissive = uGlintColor * g * mix(1.6, 0.9, uLight);
              }`}
            color={getThemeColor('--gold-300')}
            metalness={1}
            roughness={0.2}
            clearcoat={1}
            clearcoatRoughness={0.1}
            envMapIntensity={1.6}
          />
        </mesh>
        {/* faces */}
        {face && (
          <>
            <mesh position={[0, 0, 0.07]}>
              <circleGeometry args={[1.07, 96]} />
              <meshStandardMaterial map={face} emissiveMap={face} emissive={AS_PAINTED} emissiveIntensity={0.42} roughness={0.55} metalness={0.25} />
            </mesh>
            <mesh position={[0, 0, -0.07]} rotation={[0, Math.PI, 0]}>
              <circleGeometry args={[1.07, 96]} />
              <meshStandardMaterial map={face} emissiveMap={face} emissive={AS_PAINTED} emissiveIntensity={0.3} roughness={0.55} metalness={0.25} />
            </mesh>
          </>
        )}
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[1.07, 1.07, 0.14, 96, 1, true]} />
          <meshPhysicalMaterial color={getThemeColor('--gold-500')} metalness={1} roughness={0.35} side={THREE.DoubleSide} />
        </mesh>
      </group>
    </group>
  );
}
