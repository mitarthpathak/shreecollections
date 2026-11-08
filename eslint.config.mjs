import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    // React Three Fiber's model: three.js objects (uniforms, meshes, vectors) are mutable and
    // are updated inside useFrame on purpose, outside React's render cycle.
    files: ['src/film/shots/**/*.tsx', 'src/film/Stage.tsx', 'src/components/product/FabricViewer.tsx'],
    rules: { 'react-hooks/immutability': 'off' },
  },
  globalIgnores(['.next/**', 'out/**', 'build/**', 'next-env.d.ts', 'public/**']),
]);

export default eslintConfig;
