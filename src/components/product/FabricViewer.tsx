'use client';
import { Canvas, useFrame, type ThreeEvent } from '@react-three/fiber';
import { Environment, Lightformer, useTexture } from '@react-three/drei';
import CustomShaderMaterial from 'three-custom-shader-material';
import * as THREE from 'three';
import { useEffect, useMemo, useRef, useCallback } from 'react';
import { TickerDriver } from '@/film/TickerDriver';
import { getThemeColor } from '@/lib/theme';
import { dprCap } from '@/lib/tier';

const MAX = 6;

const vertex = /* glsl */ `
  uniform float uTime;
  uniform vec4 uRipples[${MAX}]; // xy = uv, z = start time, w = strength
  float disp(vec2 uv) {
    float d = sin(uv.x * 5.0 + uTime * 0.9) * 0.012 + sin(uv.y * 7.0 + uTime * 0.6) * 0.01;
    d += (1.0 - uv.y) * (1.0 - uv.y) * sin(uv.x * 9.0 + uTime * 1.4) * 0.018; // hem sways more
    for (int i = 0; i < ${MAX}; i++) {
      vec4 r = uRipples[i];
      float age = uTime - r.z;
      if (r.w <= 0.0 || age < 0.0 || age > 3.0) continue;
      float dist = distance(uv * vec2(0.75, 1.0), r.xy * vec2(0.75, 1.0));
      d += sin(dist * 38.0 - age * 9.0) * exp(-dist * 4.0) * exp(-age * 1.6) * 0.07 * r.w * smoothstep(0.0, 0.08, age * 2.0 - dist);
    }
    return d;
  }
  void main() {
    float e = 0.004;
    float h = disp(uv);
    float hx = disp(uv + vec2(e, 0.0));
    float hy = disp(uv + vec2(0.0, e));
    vec3 p = position + normal * h;
    vec3 tx = normalize(vec3(1.5 * e, 0.0, hx - h));
    vec3 ty = normalize(vec3(0.0, 2.0 * e, hy - h));
    csm_Position = p;
    csm_Normal = normalize(cross(tx, ty));
  }
`;

function Cloth({ src }: { src: string }) {
  const tex = useTexture(src);
  useMemo(() => {
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(2, 2.6);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 8;
  }, [tex]);
  const uniforms = useMemo(
    () => ({ uTime: { value: 0 }, uRipples: { value: Array.from({ length: MAX }, () => new THREE.Vector4(0, 0, -10, 0)) } }),
    [],
  );
  const next = useRef(0);
  const last = useRef(0);
  const mesh = useRef<THREE.Mesh>(null);

  useFrame((s, dt) => {
    uniforms.uTime.value += Math.min(dt, 1 / 20);
    if (mesh.current) {
      mesh.current.rotation.y = THREE.MathUtils.damp(mesh.current.rotation.y, s.pointer.x * 0.25, 3, dt);
      mesh.current.rotation.x = THREE.MathUtils.damp(mesh.current.rotation.x, -s.pointer.y * 0.12, 3, dt);
    }
  });

  const ripple = useCallback(
    (e: ThreeEvent<PointerEvent>, strength: number) => {
      if (!e.uv) return;
      const now = uniforms.uTime.value;
      if (now - last.current < 0.09) return;
      last.current = now;
      uniforms.uRipples.value[next.current].set(e.uv.x, e.uv.y, now, strength);
      next.current = (next.current + 1) % MAX;
    },
    [uniforms],
  );

  return (
    <mesh
      ref={mesh}
      onPointerDown={(e) => ripple(e, 1)}
      onPointerMove={(e) => e.buttons > 0 || e.pointerType === 'touch' ? ripple(e, 0.6) : ripple(e, 0.25)}
    >
      <planeGeometry args={[1.5, 2, 96, 128]} />
      <CustomShaderMaterial
        baseMaterial={THREE.MeshPhysicalMaterial}
        vertexShader={vertex}
        uniforms={uniforms}
        map={tex}
        roughness={0.55}
        sheen={1}
        sheenRoughness={0.35}
        sheenColor={getThemeColor('--gold-300')}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

export default function FabricViewer({ src, label }: { src: string; label: string }) {
  const wrap = useRef<HTMLDivElement>(null);
  const onScreen = useRef(true);

  // Only render while the cloth is on screen (and the tab is visible).
  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => void (onScreen.current = e.isIntersecting), { rootMargin: '80px 0px' });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  const active = useCallback(() => onScreen.current && !document.hidden, []);

  return (
    <div ref={wrap} className="relative aspect-square w-full overflow-hidden rounded-[18px] bg-[radial-gradient(circle_at_50%_40%,var(--surface-2),var(--bg)_70%)]" data-cursor="Drag">
      <Canvas
        frameloop="never"
        dpr={[1, dprCap()]}
        camera={{ position: [0, 0, 2.6], fov: 40 }}
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
        onCreated={({ gl }) => void (gl.debug.checkShaderErrors = process.env.NODE_ENV !== 'production')}
        aria-hidden
        // Vertical swipes scroll the page; taps and sideways drags ripple the cloth.
        style={{ touchAction: 'pan-y pinch-zoom' }}
      >
        <TickerDriver active={active} />
        <ambientLight intensity={0.35} />
        <directionalLight position={[2, 3, 4]} intensity={2.2} color={getThemeColor('--pigment-light-soft')} />
        <pointLight position={[-2.5, -1, 2]} color={getThemeColor('--mor')} intensity={6} />
        <Environment resolution={128} frames={1}>
          <Lightformer form="rect" intensity={2} position={[0, 2, 3]} scale={[4, 1, 1]} color={getThemeColor('--pigment-light-soft')} />
          <Lightformer form="ring" intensity={1.5} position={[-3, 0, 1]} scale={2} color={getThemeColor('--gold-300')} />
        </Environment>
        <Cloth src={src} />
      </Canvas>
      <p className="pointer-events-none absolute inset-x-0 bottom-3 text-center text-xs text-fg-muted">{label}</p>
    </div>
  );
}
