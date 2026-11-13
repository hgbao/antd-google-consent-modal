import { readFileSync } from 'node:fs';

import commonjs from '@rollup/plugin-commonjs';
import resolve from '@rollup/plugin-node-resolve';
import replace from '@rollup/plugin-replace';
import terser from '@rollup/plugin-terser';
import typescript from '@rollup/plugin-typescript';
import dts from 'rollup-plugin-dts';
import livereload from 'rollup-plugin-livereload';
import serve from 'rollup-plugin-serve';

const { peerDependencies } = JSON.parse(readFileSync('./package.json', 'utf8'));
const peers = Object.keys(peerDependencies);
const external = (id) => peers.some((peer) => id === peer || id.startsWith(`${peer}/`));

const isWatch = !!process.env.ROLLUP_WATCH;
const ts = () => typescript({ noEmit: false, sourceMap: true, inlineSources: true });

const iife = {
  input: 'src/browser.tsx',
  output: {
    file: 'dist/index.min.js',
    format: 'iife',
    name: 'AntdGoogleConsentModal',
    sourcemap: true,
    plugins: isWatch ? [] : [terser()],
  },
  onwarn: (warning, warn) => {
    if (warning.code !== 'MODULE_LEVEL_DIRECTIVE') warn(warning); // antd's "use client" is harmless in a bundle.
  },
  plugins: [
    replace({ 'process.env.NODE_ENV': JSON.stringify('production'), preventAssignment: true }),
    resolve({ browser: true }),
    commonjs(),
    ts(),
    ...(isWatch
      ? [serve({ open: false, contentBase: ['.'], port: 3001 }), livereload('dist')]
      : []),
  ],
};

export default isWatch
  ? [iife]
  : [
      {
        input: 'src/index.ts',
        external,
        output: [
          {
            file: 'dist/index.cjs',
            format: 'cjs',
            sourcemap: true,
            exports: 'named',
            banner: "'use client';",
          },
          { file: 'dist/index.esm.js', format: 'esm', sourcemap: true, banner: "'use client';" }, // Next.js App Router.
        ],
        plugins: [resolve(), ts()],
      },
      iife,
      {
        input: 'src/index.ts',
        output: { file: 'dist/index.d.ts', format: 'es' },
        external,
        plugins: [dts()],
      },
    ];
