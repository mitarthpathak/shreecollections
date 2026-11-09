'use client';
import { Suspense, useEffect, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import type * as THREE from 'three';
import { film } from './state';

/**
 * Mount window for one shot: mounts two chapters early (hidden, then pre-compiled during
 * idle), draws only while within one chapter of the camera, unmounts (and so disposes)
 * once it is more than three chapters away in either direction.
 */
export function Shot({ index, children, near = 1 }: { index: number; children: React.ReactNode; near?: number }) {
  const [mounted, setMounted] = useState(() => Math.abs(film.chapter - index) <= 2);
  const group = useRef<THREE.Group>(null);
  const { gl, scene, camera } = useThree();

  // Checked on a slow timer, not on scroll — chapter changes are rare events.
  useEffect(() => {
    const id = window.setInterval(() => {
      const d = film.chapter - index;
      setMounted((m) => (m ? d <= 3 && d >= -3 : d <= 2 && d >= -2));
    }, 300);
    return () => window.clearInterval(id);
  }, [index]);

  useEffect(() => {
    if (!mounted) return;
    const ric = (window.requestIdleCallback ?? ((cb: () => void) => window.setTimeout(cb, 120))) as (cb: () => void) => number;
    ric(() => {
      // compileAsync compiles programs for everything in the scene, hidden objects included.
      const g = group.current;
      if (!g) return;
      const was = g.visible;
      g.visible = true;
      gl.compileAsync(scene, camera).catch(() => {}).finally(() => {
        if (group.current) group.current.visible = was && Math.abs(film.chapter - index) <= near;
      });
    });
  }, [mounted, gl, scene, camera, index, near]);

  useFrame(() => {
    if (group.current) group.current.visible = Math.abs(film.chapter - index) <= near;
  });

  if (!mounted) return null;
  return (
    <group ref={group}>
      <Suspense fallback={null}>{children}</Suspense>
    </group>
  );
}
