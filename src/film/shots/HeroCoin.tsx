'use client';
import * as THREE from 'three';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import CustomShaderMaterial from 'three-custom-shader-material';
import { easing } from 'maath';
import { film } from '../state';
import { heroCoinPlacement, type CoinPlacement } from '../rail';
import { badgeTexture } from '../textures';
import { palette } from '@/lib/palette';

/**
 * The badge as a gold coin. The logo artwork itself only floats, tilts and glows —
 * it is never distorted or run through velocity shaders. The travelling glint lives
 * on the metal rim only.
 *
 * Its size and place come from the hero layout (film.coin): the slot above the copy on
 * portrait screens, right of it on landscape ones — recomputed when either changes.
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
  const rimUniforms = useMemo(() => ({ uTime: { value: 0 }, uGlint: { value: 1 } }), []);

  useFrame((s, dt) => {
    const g = group.current, sp = spin.current;
    if (!g || !sp) return;
    rimUniforms.uTime.value += dt;
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
    // idle float + pointer tilt (desktop) / idle sway (mobile)
    const px = film.mobile ? Math.sin(t * 0.6) * 0.25 : film.pointer.x;
    const py = film.mobile ? Math.cos(t * 0.5) * 0.15 : film.pointer.y;
    easing.damp(sp.rotation, 'y', turn * (Math.PI / 2) + px * 0.35 * (1 - turn), 0.25, dt);
    easing.damp(sp.rotation, 'x', -py * 0.25 * (1 - turn), 0.3, dt);
    g.position.set(pos.x, pos.y + (Math.sin(t * 0.8) * 0.06 + lift * 0.2) * k, pos.z);
  });

  return (
    <group ref={group} name="hero-coin">
      <group ref={spin}>
        {/* rim: bevelled metal with a glint that travels around it */}
        <mesh geometry={rimGeo} rotation={[Math.PI / 2, 0, 0]}>
          <CustomShaderMaterial
            baseMaterial={THREE.MeshPhysicalMaterial}
            uniforms={rimUniforms}
            vertexShader={/* glsl */ `varying vec3 vPos; void main(){ vPos = position; }`}
            fragmentShader={/* glsl */ `
              uniform float uTime; uniform float uGlint; varying vec3 vPos;
              void main(){
                float a = atan(vPos.z, vPos.x);
                float g = pow(max(0.0, cos(a - uTime * 0.9)), 60.0) * uGlint;
                csm_Emissive = vec3(1.0, 0.86, 0.55) * g * 1.6;
              }`}
            color={palette.gold300}
            emissive="#000000"
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
              <meshStandardMaterial map={face} emissiveMap={face} emissive="#ffffff" emissiveIntensity={0.42} roughness={0.55} metalness={0.25} />
            </mesh>
            <mesh position={[0, 0, -0.07]} rotation={[0, Math.PI, 0]}>
              <circleGeometry args={[1.07, 96]} />
              <meshStandardMaterial map={face} emissiveMap={face} emissive="#ffffff" emissiveIntensity={0.3} roughness={0.55} metalness={0.25} />
            </mesh>
          </>
        )}
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[1.07, 1.07, 0.14, 96, 1, true]} />
          <meshPhysicalMaterial color={palette.gold500} metalness={1} roughness={0.35} side={THREE.DoubleSide} />
        </mesh>
      </group>
    </group>
  );
}
