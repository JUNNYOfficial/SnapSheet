#!/usr/bin/env node
/**
 * 将 snaplang-v1.0.0/dist (CommonJS) 打包为 src/snaplang/vendor/snaplang.esm.js
 * 以便在 Vite / 浏览器环境中使用。
 */
import { build } from 'esbuild';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { existsSync, mkdirSync, writeFileSync, rmSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const root = resolve(__dirname, '..');
const outDir = resolve(root, 'src/snaplang/vendor');
const outFile = resolve(outDir, 'snaplang.esm.js');
const tmpEntry = resolve(outDir, '.snaplang-entry.cjs');

if (!existsSync(outDir)) {
  mkdirSync(outDir, { recursive: true });
}

// 临时入口：合并 index.js 和 environment.js 的导出
const entryCode = `
const snaplang = require(${JSON.stringify(resolve(root, 'snaplang-v1.0.0/dist/index.js'))});
const env = require(${JSON.stringify(resolve(root, 'snaplang-v1.0.0/dist/environment.js'))});
module.exports = { ...snaplang, ...env };
`;
writeFileSync(tmpEntry, entryCode);

await build({
  entryPoints: [tmpEntry],
  bundle: true,
  format: 'esm',
  platform: 'browser',
  outfile: outFile,
  external: [],
  alias: {
    fs: resolve(outDir, 'fs-stub.js'),
    path: resolve(outDir, 'path-stub.js'),
  },
  plugins: [
    {
      name: 'stdlib-alias',
      setup(build) {
        build.onResolve({ filter: /^\.\.?\/stdlib(\/.*)?$/ }, (args) => ({
          path: resolve(outDir, 'stdlib-stub.js'),
        }));
        build.onResolve({ filter: /^snaplang-v1\.0\.0\/dist\/stdlib(\/.*)?$/ }, (args) => ({
          path: resolve(outDir, 'stdlib-stub.js'),
        }));
      },
    },
  ],
  banner: {
    js: `var process = (typeof globalThis !== 'undefined' && globalThis.process) || { exit: function() {}, stdout: { write: function() {} } };`,
  },
  target: 'es2020',
  sourcemap: false,
  minify: false,
});

rmSync(tmpEntry);
console.log(`[build-snaplang] generated ${outFile}`);
