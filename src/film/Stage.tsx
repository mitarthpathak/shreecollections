'use client';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Environment, Lightformer, PerformanceMonitor } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import { easing } from 'maath';
import { useEffect, useMemo, useRef, useState } from 'react';
import { film } from './state';
import { rail, railT, cameraFov } from './rail';
import { TickerDriver } from './TickerDriver';
import { Shot } from './Shot';
import { HeroCoin } from './shots/HeroCoin';
import { Thread } from './shots/Thread';
import { Dust } from './shots/Dust';
import { Silk } from './shots/Silk';
import { Ribbon } from './shots/Ribbon';
import { Feather } from './shots/Feather';
import { Matki } from './shots/Matki';
import { LookbookWall } from './shots/LookbookWall';
import { Knot } from './shots/Knot';
import { glowTexture } from './textures';
import { TIER_SETTINGS } from '@/lib/tier';
import { useUI, type Tier } from '@/lib/store';
import { palette } from '@/lib/palette';

/** How far the knot sits in front of the camera at the end of the film (see shots/Knot). */
const KNOT_DEPTH = 6.5;

/**
 * Camera on the rail: position = rail(t), target = rail(t + lookAhead), both damped.
 * Once the footer scrolls in, the whole view rises with the page (no damping, so it stays
 * locked to the DOM) and the knot leaves with its chapter instead of sitting under the footer.
 */
function CameraRig() {
  const t = useRef(0);
  const pos = useMemo(() => new THREE.Vector3(), []);
  const look = useMemo(() => new THREE.Vector3(), []);
  const base = useMemo(() => new THREE.Vector3(0, 0, 5.6), []);
  const target = useMemo(() => new THREE.Vector3(0, 0, -10), []);
  const aim = useMemo(() => new THREE.Vector3(), []);
  useFrame((s, dt) => {
    const goal = railT(film.chapter, film.chapterProgress);
    t.current = THREE.MathUtils.damp(t.current, goal, 3.2, dt);
    rail.getPoint(t.current, pos);
    rail.getPoint(Math.min(1, t.current + 0.03), look);
    if (t.current > 0.97) look.copy(pos).add(new THREE.Vector3(0, 0, -6));
    const px = film.mobile ? 0 : film.pointer.x * 0.18;
    const py = film.mobile ? 0 : film.pointer.y * 0.12;
    easing.damp3(base, [pos.x + px, pos.y + py, pos.z], 0.12, dt);
    easing.damp3(target, look, 0.18, dt);
    const cam = s.camera as THREE.PerspectiveCamera;
    const rise = film.footerRise > 0 ? (film.footerRise / s.size.height) * 2 * Math.tan(THREE.MathUtils.degToRad(cam.fov / 2)) * KNOT_DEPTH : 0;
    cam.position.set(base.x, base.y - rise, base.z);
    cam.lookAt(aim.set(target.x, target.y - rise, target.z));
  });
  return null;
}

/**
 * The thread's first stitch sits on the coin's rim, and the coin follows the hero layout.
 * When that layout settles somewhere new (resize, fonts, language), rebuild the thread.
 */
function useCoinLayoutKey() {
  const sig = () => `${Math.round(film.coin.x)}|${Math.round(film.coin.y)}|${Math.round(film.coin.r)}|${window.innerWidth}|${window.innerHeight}`;
  const [key, setKey] = useState(sig);
  useEffect(() => {
    let last = key;
    const id = window.setInterval(() => {
      const next = sig();
      if (next !== last) {
        last = next;
        setKey(next);
      }
    }, 500);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return key;
}

function ExposeForDebug() {
  const state = useThree();
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production' || process.env.NEXT_PUBLIC_FILM_DEBUG === '1') (window as unknown as { __three: unknown }).__three = state;
  }, [state]);
  return null;
}

/**
 * ?capture (debug builds): window.__capture() renders one frame and returns it as WebP, for the
 * tier-0 posters. __capture('bg') leaves the hero coin out (the hero poster's background);
 * __capture('coin') draws only the coin (the poster coin, placed by the hero layout).
 */
function Capture() {
  const { gl, scene, advance } = useThree();
  useEffect(() => {
    const allowed = process.env.NODE_ENV !== 'production' || process.env.NEXT_PUBLIC_FILM_DEBUG === '1';
    if (!allowed || !new URLSearchParams(window.location.search).has('capture')) return;
    (window as unknown as { __capture: (mode?: 'bg' | 'coin') => string }).__capture = (mode) => {
      const coin = scene.getObjectByName('hero-coin');
      const hidden: THREE.Object3D[] = [];
      const hide = (o: THREE.Object3D) => {
        if (o.visible) {
          o.visible = false;
          hidden.push(o);
        }
      };
      if (mode === 'bg' && coin) hide(coin);
      if (mode === 'coin' && coin) {
        const keep = new Set<THREE.Object3D>();
        coin.traverse((o) => keep.add(o));
        scene.traverse((o) => {
          if (!keep.has(o) && ((o as THREE.Mesh).isMesh || (o as THREE.Points).isPoints || (o as THREE.Sprite).isSprite)) hide(o);
        });
      }
      advance(performance.now() / 1000);
      const url = gl.domElement.toDataURL('image/webp', 0.85);
      hidden.forEach((o) => (o.visible = true));
      return url;
    };
  }, [gl, scene, advance]);
  return null;
}

function Ready({ onReady }: { onReady: () => void }) {
  const { gl, scene, camera } = useThree();
  useEffect(() => {
    let done = false;
    const finish = () => {
      if (!done) {
        done = true;
        onReady();
      }
    };
    gl.compileAsync(scene, camera).then(finish, finish);
    const fallback = window.setTimeout(finish, 2500);
    return () => window.clearTimeout(fallback);
  }, [gl, scene, camera, onReady]);
  return null;
}

export default function Stage({ tier, onReady }: { tier: Tier; onReady: () => void }) {
  const s = TIER_SETTINGS[tier];
  const [dpr, setDpr] = useState(s.dpr[1]);
  const glow = useMemo(() => (tier === 2 ? glowTexture() : null), [tier]);
  // Film remounts the stage when film.mobile flips (rotation), so these are read once per mount.
  const lookbook3D = tier >= 2 && !film.mobile;
  const threadKey = useCoinLayoutKey();

  return (
    <Canvas
      frameloop="never"
      dpr={dpr}
      flat={false}
      gl={{ antialias: !film.mobile && tier >= 2, powerPreference: 'high-performance', stencil: false, alpha: false }}
      camera={{ fov: cameraFov(film.mobile), near: 0.1, far: 60, position: [0, 0, 5.6] }}
      onCreated={({ gl }) => {
        gl.setClearColor(palette.raat, 1);
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.05;
      }}
      aria-hidden
      style={{ pointerEvents: 'none' }}
    >
      <TickerDriver active={() => !film.covered} />
      <PerformanceMonitor
        flipflops={3}
        onDecline={() => setDpr((d) => Math.max(1, +(d - 0.25).toFixed(2)))}
        onFallback={() => {
          const cur = useUI.getState().tier;
          if (cur > 1) {
            const next = (cur - 1) as Tier;
            useUI.getState().setTier(next);
            // keep tier-keyed CSS (e.g. .glass backdrop blur) in step with the stage
            document.documentElement.dataset.tier = String(next);
          }
        }}
      />
      <fog attach="fog" args={[palette.raat, 9, 26]} />
      <ambientLight intensity={0.25} />
      <directionalLight position={[3, 4, 5]} intensity={2.2} color="#FFE2A8" />
      <directionalLight position={[-4, -1, -3]} intensity={1.4} color={palette.mor} />
      <Environment resolution={tier === 3 ? 256 : 64} frames={1}>
        <Lightformer form="rect" intensity={3} position={[0, 3, 4]} scale={[8, 1.5, 1]} color="#FFE7B0" />
        <Lightformer form="rect" intensity={1.2} position={[-5, 0, 0]} rotation-y={Math.PI / 2} scale={[6, 2, 1]} color={palette.gold500} />
        <Lightformer form="ring" intensity={1.5} position={[4, -1, 2]} scale={2} color={palette.mor} />
        <Lightformer form="rect" intensity={0.6} position={[0, -4, 0]} rotation-x={-Math.PI / 2} scale={[10, 10, 1]} color="#2a1d12" />
      </Environment>

      <CameraRig />
      <Dust count={s.dust} />
      <Thread key={threadKey} segments={tier === 3 ? 1800 : tier === 2 ? 1200 : 700} glowSprite={glow} />

      <Shot index={0} near={1}>
        <HeroCoin />
      </Shot>
      <Shot index={2}>
        <Silk index={2} mode="weave" segments={s.silk} />
      </Shot>
      <Shot index={3}>
        <Ribbon segments={tier === 3 ? 400 : 220} />
      </Shot>
      <Shot index={4}>
        <Feather />
      </Shot>
      <Shot index={6}>
        <Silk index={6} mode="tint" segments={Math.round(s.silk * 0.75)} />
      </Shot>
      <Shot index={7}>
        <Matki coins={tier === 3 ? 64 : tier === 2 ? 40 : 24} />
      </Shot>
      {lookbook3D && (
        <Shot index={8}>
          <LookbookWall />
        </Shot>
      )}
      <Shot index={10}>
        <Knot />
      </Shot>

      {s.post && (
        <EffectComposer multisampling={0}>
          <Bloom mipmapBlur luminanceThreshold={0.85} luminanceSmoothing={0.2} intensity={0.7} radius={0.7} />
        </EffectComposer>
      )}
      <Ready onReady={onReady} />
      <ExposeForDebug />
      <Capture />
    </Canvas>
  );
}
