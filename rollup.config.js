import alias from '@rollup/plugin-alias';
import babel from '@rollup/plugin-babel';
import commonjs from '@rollup/plugin-commonjs';
import resolve from '@rollup/plugin-node-resolve';
import replace from '@rollup/plugin-replace';
import terser from '@rollup/plugin-terser';
import typescript from '@rollup/plugin-typescript';
import autoprefixer from 'autoprefixer';
import path from 'path';
import dts from 'rollup-plugin-dts';
import livereload from 'rollup-plugin-livereload';
import peerDepsExternal from 'rollup-plugin-peer-deps-external';
import postcss from 'rollup-plugin-postcss';
import serve from 'rollup-plugin-serve';

require('sass');

const isProduction = process.env.NODE_ENV === 'production';

const settings = [
  {
    input: 'src/index.tsx',
    output: [
      {
        file: 'dist/index.js',
        format: 'cjs',
        sourcemap: true,
      },
      {
        file: 'dist/index.esm.js',
        format: 'esm',
        sourcemap: true,
      },
      {
        file: 'dist/index.min.js',
        format: 'iife', // Immediately Invoked Function Expression format for the browser
        name: 'AntdGoogleConsentModal', // Global variable name in the browser
        sourcemap: true,
        plugins: [terser()], // Minifies the code
      },
    ],
    plugins: [
      alias({
        entries: [{ find: '@', replacement: path.resolve(__dirname, 'src') }],
      }),
      peerDepsExternal(), // Automatically externalizes peerDependencies in package.json
      resolve(), // Resolves node_modules dependencies
      commonjs(), // Converts CommonJS modules to ES6
      typescript({ tsconfig: './tsconfig.json' }), // Integrates TypeScript
      postcss({
        modules: true, // Enable CSS modules
        use: ['sass'],
        inject: true, // Inject CSS into the JS file
        minimize: true, // Minify the CSS
        sourcemap: true,
        plugins: [autoprefixer()],
      }),
      babel({
        exclude: 'node_modules/**',
        babelHelpers: 'bundled',
        presets: [
          [
            '@babel/preset-react',
            {
              runtime: 'automatic', // This enables the new JSX transform
            },
          ],
        ],
        extensions: ['.js', '.jsx', '.ts', '.tsx'],
      }),
      replace({
        'process.env.NODE_ENV': JSON.stringify('production'),
        preventAssignment: true, // Required option to avoid assignment of values during replacement
      }),
      !isProduction &&
        serve({
          open: true, // Opens the browser
          contentBase: ['.'], // Serves files from the current directory
          port: 3001, // Specifies the port
        }),
      !isProduction && livereload('dist'), // Watches the 'dist' directory for changes
    ].filter(Boolean),
  },
  {
    input: 'src/index.tsx',
    output: [{ file: 'dist/types.d.ts', format: 'es' }],
    plugins: [dts.default()],
  },
];

export default settings;
