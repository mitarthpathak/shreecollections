'use client';
import * as THREE from 'three';
import { useEffect, useState } from 'react';

/**
 * A ShaderMaterial created once, so its `uniforms` object is the one we mutate in useFrame.
 * (R3F copies uniforms passed as JSX props into new objects, which breaks that link.)
 */
export function useShader(params: THREE.ShaderMaterialParameters) {
  const [mat] = useState(() => new THREE.ShaderMaterial(params));
  useEffect(() => () => mat.dispose(), [mat]);
  return mat;
}
