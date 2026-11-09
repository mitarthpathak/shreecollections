'use client';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Environment, Lightformer, PerformanceMonitor } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import { easing } from 'maath';
import { lazy, useEffect, useMemo, useRef, useState } from 'react';
import { film } from './state';
import { rail, railT, cameraFov } from './rail';
import { TickerDriver } from './TickerDriver';
import { Shot } from './Shot';
import { HeroCoin } from './shots/HeroCoin';
import { Thread } from './shots/Thread';
import { Dust } from './shots/Dust';
import { glowTexture } from './textures';
import { TIER_SETTINGS, dprCap } from '@/lib/tier';
import { useUI, type Tier } from '@/lib/store';
import { getThemeColor } from '@/lib/theme';
import type { BloomEffect } from 'postprocessing';
import { onThemeChange, readSceneTheme, sceneTheme, setSceneBg, stepSceneTheme } from './sceneTheme';

// Each chapter's scene is its own chunk, loaded when its Shot mounts (two chapters ahead).
const Silk = lazy(() => import('./shots/Silk').then((m) => ({ default: m.Silk })));
const Ribbon = lazy(() => import('./shots/Ribbon').then((m) => ({ default: m.Ribbon })));
const Feather = lazy(() => import('./shots/Feather').then((m) => ({ default: m.Feather })));
const Matki = lazy(() => import('./shots/Matki').then((m) => ({ default: m.Matki })));
const LookbookWall = lazy(() => import('./shots/LookbookWall').then((m) => ({ default: m.LookbookWall })));
const Knot = lazy(() => import('./shots/Knot').then((m) => ({ default: m.Knot })));

/** The viewport height, cached: reading innerHeight every frame can force a layout. */
const viewport = { h: typeof window === 'undefined' ? 0 : window.innerHeight };
if (typeof window !== 'undefined') window.addEventListener('resize', () => (viewport.h = window.innerHeight), { passive: true });

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
    // a gentle parallax with the mouse (desktop); flat again when it leaves the page
    const follow = !film.mobile && film.pointer.inside;
    const px = follow ? film.pointer.x * 0.04 : 0;
    const py = follow ? film.pointer.y * 0.025 : 0;
    easing.damp3(base, [pos.x + px, pos.y + py, pos.z], 0.3, dt);
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
  // Coin slot only. Not the viewport height: a phone's URL bar showing / hiding changes it on
  // every scroll, and each change rebuilt the 1,200–1,800-segment thread.
  const sig = () => `${Math.round(film.coin.x)}|${Math.round(film.coin.y)}|${Math.round(film.coin.r)}`;
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

/**
 * Follows the theme: clear colour, fog and bloom ease to the active theme's values in place
 * (the renderer and scenes are never recreated). Mounted first, so shots read eased values.
 */
function ThemeDriver({ bloom }: { bloom: React.RefObject<BloomEffect | null> }) {
  const { gl, scene } = useThree();
  useEffect(() => {
    readSceneTheme();
    return onThemeChange(readSceneTheme);
  }, []);
  useFrame((_, dt) => {
    if (film.bgReady) setSceneBg(film.bg);
    stepSceneTheme(dt);
    gl.setClearColor(sceneTheme.bg, 1);
    if (scene.fog) (scene.fog as THREE.Fog).color.copy(sceneTheme.bg);
    if (bloom.current) bloom.current.intensity = BLOOM * sceneTheme.bloom;
  });
  return null;
}

const BLOOM = 0.7;

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
      // hide the coin's meshes, not its group: HeroCoin sets the group's visibility every frame
      if (mode === 'bg' && coin) coin.traverse((o) => o !== coin && hide(o));
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
  const [dpr, setDpr] = useState(() => Math.min(s.dpr[1], dprCap()));
  // phones: fewer particles, a lighter thread and fewer coins
  const m = film.mobile;
  const glow = useMemo(() => (tier === 2 ? glowTexture() : null), [tier]);
  // Film remounts the stage when film.mobile flips (rotation), so these are read once per mount.
  const lookbook3D = tier >= 2 && !film.mobile;
  const threadKey = useCoinLayoutKey();
  const bloom = useRef<BloomEffect | null>(null);

  return (
    <Canvas
      frameloop="never"
      dpr={dpr}
      flat={false}
      gl={{ antialias: !film.mobile && tier >= 2, powerPreference: 'high-performance', stencil: false, alpha: false }}
      camera={{ fov: cameraFov(film.mobile), near: 0.1, far: 60, position: [0, 0, 5.6] }}
      onCreated={({ gl }) => {
        gl.setClearColor(getThemeColor('--chapter-bg', { fresh: true }), 1);
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.05;
        // three.js reads every shader's info log right after compiling it, which forces the
        // compile to finish on the main thread (~1 s of stalls while scrolling into new
        // chapters). In production let the driver compile in parallel instead.
        gl.debug.checkShaderErrors = process.env.NODE_ENV !== 'production';
      }}
      aria-hidden
      style={{ pointerEvents: 'none' }}
    >
      <ThemeDriver bloom={bloom} />
      {/* nothing to draw while a drawer covers it, the tab is hidden, or the footer fills the screen */}
      <TickerDriver active={() => !film.covered && !document.hidden && film.footerRise < viewport.h - 2} />
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
      <fog attach="fog" args={[getThemeColor('--chapter-bg', { fresh: true }), 9, 26]} />
      <ambientLight intensity={0.25} />
      <directionalLight position={[3, 4, 5]} intensity={2.2} color={getThemeColor('--pigment-light-warm')} />
      <directionalLight position={[-4, -1, -3]} intensity={1.4} color={getThemeColor('--mor')} />
      <Environment resolution={tier === 3 ? 256 : 64} frames={1}>
        <Lightformer form="rect" intensity={3} position={[0, 3, 4]} scale={[8, 1.5, 1]} color={getThemeColor('--pigment-light-soft')} />
        <Lightformer form="rect" intensity={1.2} position={[-5, 0, 0]} rotation-y={Math.PI / 2} scale={[6, 2, 1]} color={getThemeColor('--gold-500')} />
        <Lightformer form="ring" intensity={1.5} position={[4, -1, 2]} scale={2} color={getThemeColor('--mor')} />
        <Lightformer form="rect" intensity={0.6} position={[0, -4, 0]} rotation-x={-Math.PI / 2} scale={[10, 10, 1]} color={getThemeColor('--pigment-light-ground')} />
      </Environment>

      <CameraRig />
      <Dust count={m ? Math.round(s.dust * 0.4) : s.dust} />
      <Thread key={threadKey} segments={tier === 3 ? 1800 : tier === 2 ? (m ? 800 : 1200) : 600} glowSprite={glow} />

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
        <Matki coins={tier === 3 ? 64 : tier === 2 ? (m ? 28 : 40) : 20} />
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
          <Bloom ref={bloom} mipmapBlur luminanceThreshold={0.85} luminanceSmoothing={0.2} intensity={BLOOM} radius={0.7} />
        </EffectComposer>
      )}
      <Ready onReady={onReady} />
      <ExposeForDebug />
      <Capture />
    </Canvas>
  );
}
