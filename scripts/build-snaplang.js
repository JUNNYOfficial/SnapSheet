#!/usr/bin/env node
/**
 * 将 snaplang-v1.0.0/dist (CommonJS) 打包为 src/snaplang/vendor/snaplang.esm.js
 * 以便在 Vite / 浏览器环境中使用。
 */
import { build } from 'esbuild';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { existsSync, mkdirSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const root = resolve(__dirname, '..');
const outDir = resolve(root, 'src/snaplang/vendor');
const outFile = resolve(outDir, 'snaplang.esm.js');

if (!existsSync(outDir)) {
  mkdirSync(outDir, { recursive: true });
}

await build({
  entryPoints: [resolve(root, 'snaplang-v1.0.0/dist/index.js')],
  bundle: true,
  format: 'esm',
  platform: 'browser',
  outfile: outFile,
  external: ['./stdlib/*', 'fs', 'path'],
  target: 'es2020',
  sourcemap: false,
  minify: false,
});

console.log(`[build-snaplang] generated ${outFile}`);
