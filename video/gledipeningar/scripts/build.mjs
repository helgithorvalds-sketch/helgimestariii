import { build } from 'esbuild';

await build({
  entryPoints: ['src/main.js'],
  bundle: true,
  format: 'iife',
  outfile: 'dist/app.js',
  target: 'chrome120',
  sourcemap: 'inline',
  logLevel: 'warning',
});
console.log('built dist/app.js');
